import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, clientsTable, trademarkCasesTable, caseStagesTable, ledgerEntriesTable } from "@workspace/db";
import { ImportCasesBody, ExportCasesQueryParams, ExportLedgerQueryParams } from "@workspace/api-zod";
import { auditLog } from "../lib/audit";

const router: IRouter = Router();

router.post("/import/cases", async (req, res): Promise<void> => {
  const parsed = ImportCasesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { rows } = parsed.data;
  let imported = 0;
  let skipped = 0;
  const errors: Array<{ row: number; error: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    try {
      if (!row.folderNumber || !row.applicantName) {
        errors.push({ row: i + 1, error: "folderNumber and applicantName are required" });
        skipped++;
        continue;
      }
      // Check if case already exists
      const [existing] = await db.select({ id: trademarkCasesTable.id }).from(trademarkCasesTable).where(eq(trademarkCasesTable.folderNumber, row.folderNumber));
      if (existing) {
        errors.push({ row: i + 1, error: `Folder number ${row.folderNumber} already exists` });
        skipped++;
        continue;
      }
      // Find or create client by clientNumber
      let clientId: number;
      if (row.clientNumber) {
        const [client] = await db.select({ id: clientsTable.id }).from(clientsTable).where(eq(clientsTable.clientNumber, row.clientNumber));
        if (client) {
          clientId = client.id;
        } else {
          // Auto-create client
          const [newClient] = await db.insert(clientsTable).values({ clientNumber: row.clientNumber, name: `Client ${row.clientNumber}` }).returning();
          clientId = newClient!.id;
        }
      } else {
        errors.push({ row: i + 1, error: "clientNumber is required for import" });
        skipped++;
        continue;
      }
      const [tmCase] = await db.insert(trademarkCasesTable).values({
        folderNumber: row.folderNumber,
        clientId,
        tmNumber: row.tmNumber ?? null,
        applicantName: row.applicantName,
        class: row.class ?? null,
        filingDate: row.filingDate ?? null,
        stage: row.stage ?? 1,
        subStage: row.subStage ?? null,
        notes: row.notes ?? null,
      }).returning();
      // Create default 4 stages
      await db.insert(caseStagesTable).values([1, 2, 3, 4].map((stageNumber) => ({ caseId: tmCase!.id, stageNumber, timeline: [], history: [] })));
      await auditLog("trademark_cases", "CREATE", tmCase!.folderNumber, { source: "import" });
      imported++;
    } catch (err) {
      errors.push({ row: i + 1, error: String(err) });
      skipped++;
    }
  }
  res.json({ imported, skipped, errors });
});

router.get("/export/cases", async (req, res): Promise<void> => {
  const query = ExportCasesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { clientId, stage } = query.data;
  const conditions = [];
  if (clientId) conditions.push(eq(trademarkCasesTable.clientId, clientId));
  if (stage) conditions.push(eq(trademarkCasesTable.stage, stage));

  const { and } = await import("drizzle-orm");
  const where = conditions.length > 0 ? and(...conditions) : undefined;
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
    .where(where)
    .orderBy(trademarkCasesTable.folderNumber);
  res.json(cases);
});

router.get("/export/ledger", async (req, res): Promise<void> => {
  const query = ExportLedgerQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { clientId, folderId, startDate, endDate } = query.data;
  const { and, gte, lte } = await import("drizzle-orm");
  const conditions: ReturnType<typeof eq>[] = [];

  if (folderId) {
    const [tmCase] = await db.select({ id: trademarkCasesTable.id }).from(trademarkCasesTable).where(eq(trademarkCasesTable.folderNumber, folderId));
    if (tmCase) conditions.push(eq(ledgerEntriesTable.caseId, tmCase.id) as ReturnType<typeof eq>);
  } else if (clientId) {
    const clientCases = await db.select({ id: trademarkCasesTable.id }).from(trademarkCasesTable).where(eq(trademarkCasesTable.clientId, clientId));
    const { sql } = await import("drizzle-orm");
    const caseIds = clientCases.map((c) => c.id);
    if (caseIds.length > 0) {
      conditions.push(sql`${ledgerEntriesTable.caseId} = ANY(${sql.raw(`ARRAY[${caseIds.join(",")}]::int[]`)})` as ReturnType<typeof eq>);
    }
  }
  if (startDate) conditions.push(gte(ledgerEntriesTable.date, typeof startDate === 'string' ? startDate : (startDate as Date).toISOString().split('T')[0]!) as ReturnType<typeof eq>);
  if (endDate) conditions.push(lte(ledgerEntriesTable.date, typeof endDate === 'string' ? endDate : (endDate as Date).toISOString().split('T')[0]!) as ReturnType<typeof eq>);

  const entries = await db.select().from(ledgerEntriesTable).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(ledgerEntriesTable.date, ledgerEntriesTable.id);
  res.json(entries);
});

export default router;
