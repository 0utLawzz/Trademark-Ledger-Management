import { Router, type IRouter } from "express";
import { eq, ilike, or, sql } from "drizzle-orm";
import { db, clientsTable, ledgerEntriesTable, trademarkCasesTable } from "@workspace/db";
import {
  ListClientsQueryParams,
  GetClientParams,
  CreateClientBody,
  UpdateClientParams,
  UpdateClientBody,
  DeleteClientParams,
  GetClientCasesParams,
  GetClientLedgerParams,
} from "@workspace/api-zod";
import { auditLog } from "../lib/audit";

const router: IRouter = Router();

router.get("/clients", async (req, res): Promise<void> => {
  const query = ListClientsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { q, page = 1, limit = 20 } = query.data;
  const offset = (page - 1) * limit;

  const where = q
    ? or(
        ilike(clientsTable.name, `%${q}%`),
        ilike(clientsTable.clientNumber, `%${q}%`),
        ilike(clientsTable.email ?? sql`''`, `%${q}%`),
      )
    : undefined;

  const [data, countResult] = await Promise.all([
    db.select().from(clientsTable).where(where).limit(limit).offset(offset).orderBy(clientsTable.name),
    db.select({ count: sql<number>`count(*)::int` }).from(clientsTable).where(where),
  ]);

  res.json({ data, total: countResult[0]?.count ?? 0 });
});

router.post("/clients", async (req, res): Promise<void> => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [client] = await db.insert(clientsTable).values(parsed.data).returning();
  await auditLog("clients", "CREATE", String(client!.id), { clientNumber: client!.clientNumber, name: client!.name });
  res.status(201).json(client);
});

router.get("/clients/:id", async (req, res): Promise<void> => {
  const params = GetClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, params.data.id));
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json(client);
});

router.patch("/clients/:id", async (req, res): Promise<void> => {
  const params = UpdateClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [client] = await db.update(clientsTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(clientsTable.id, params.data.id)).returning();
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  await auditLog("clients", "UPDATE", String(client.id), parsed.data);
  res.json(client);
});

router.delete("/clients/:id", async (req, res): Promise<void> => {
  const params = DeleteClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [client] = await db.delete(clientsTable).where(eq(clientsTable.id, params.data.id)).returning();
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  await auditLog("clients", "DELETE", String(client.id), { clientNumber: client.clientNumber });
  res.json({ success: true });
});

router.get("/clients/:id/cases", async (req, res): Promise<void> => {
  const params = GetClientCasesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const cases = await db
    .select({
      id: trademarkCasesTable.id,
      folderNumber: trademarkCasesTable.folderNumber,
      clientId: trademarkCasesTable.clientId,
      clientNumber: clientsTable.clientNumber,
      clientName: clientsTable.name,
      tmNumber: trademarkCasesTable.tmNumber,
      applicantName: trademarkCasesTable.applicantName,
      class: trademarkCasesTable.class,
      filingDate: trademarkCasesTable.filingDate,
      stage: trademarkCasesTable.stage,
      subStage: trademarkCasesTable.subStage,
      notes: trademarkCasesTable.notes,
      createdAt: trademarkCasesTable.createdAt,
      updatedAt: trademarkCasesTable.updatedAt,
    })
    .from(trademarkCasesTable)
    .leftJoin(clientsTable, eq(trademarkCasesTable.clientId, clientsTable.id))
    .where(eq(trademarkCasesTable.clientId, params.data.id))
    .orderBy(trademarkCasesTable.folderNumber);
  res.json(cases);
});

router.get("/clients/:id/ledger", async (req, res): Promise<void> => {
  const params = GetClientLedgerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  // Get all cases for this client
  const clientCases = await db.select({ id: trademarkCasesTable.id }).from(trademarkCasesTable).where(eq(trademarkCasesTable.clientId, params.data.id));
  if (clientCases.length === 0) {
    res.json({ entries: [], totalDue: 0, totalReceived: 0, balance: 0 });
    return;
  }
  const caseIds = clientCases.map((c) => c.id);
  const entries = await db
    .select()
    .from(ledgerEntriesTable)
    .where(sql`${ledgerEntriesTable.caseId} = ANY(${sql.raw(`ARRAY[${caseIds.join(",")}]::int[]`)})`)
    .orderBy(ledgerEntriesTable.date, ledgerEntriesTable.id);

  const totalDue = entries.reduce((sum, e) => sum + parseFloat(e.dueAmount), 0);
  const totalReceived = entries.reduce((sum, e) => sum + parseFloat(e.receivedAmount), 0);
  const balance = totalReceived - totalDue;
  res.json({ entries, totalDue, totalReceived, balance });
});

export default router;
