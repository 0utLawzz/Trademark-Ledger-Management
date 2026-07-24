import { Router, type IRouter } from "express";
import { eq, sql, and, gte, lte } from "drizzle-orm";
import { db, clientsTable, trademarkCasesTable, ledgerEntriesTable } from "@workspace/db";
import {
  ReportClientLedgerQueryParams,
  ReportCaseLedgerQueryParams,
  ReportOutstandingQueryParams,
  ReportDailyCollectionQueryParams,
  ReportMonthlyCollectionQueryParams,
  ReportStageQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/reports/client-ledger", async (req, res): Promise<void> => {
  const query = ReportClientLedgerQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { clientId, startDate, endDate } = query.data;
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId));
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  const clientCases = await db.select({ id: trademarkCasesTable.id }).from(trademarkCasesTable).where(eq(trademarkCasesTable.clientId, clientId));
  const caseIds = clientCases.map((c) => c.id);
  if (caseIds.length === 0) {
    res.json({ client, entries: [], totalDue: 0, totalReceived: 0, balance: 0 });
    return;
  }
  const conditions = [sql`${ledgerEntriesTable.caseId} = ANY(${sql.raw(`ARRAY[${caseIds.join(",")}]::int[]`)})`];
  if (startDate) conditions.push(gte(ledgerEntriesTable.date, typeof startDate === 'string' ? startDate : (startDate as Date).toISOString().split('T')[0]!));
  if (endDate) conditions.push(lte(ledgerEntriesTable.date, typeof endDate === 'string' ? endDate : (endDate as Date).toISOString().split('T')[0]!));

  const entries = await db.select().from(ledgerEntriesTable).where(and(...conditions)).orderBy(ledgerEntriesTable.date, ledgerEntriesTable.id);
  const totalDue = entries.reduce((s, e) => s + parseFloat(e.dueAmount), 0);
  const totalReceived = entries.reduce((s, e) => s + parseFloat(e.receivedAmount), 0);
  res.json({ client, entries, totalDue, totalReceived, balance: totalReceived - totalDue });
});

router.get("/reports/case-ledger", async (req, res): Promise<void> => {
  const query = ReportCaseLedgerQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { folderId, startDate, endDate } = query.data;
  const [tmCase] = await db
    .select({ id: trademarkCasesTable.id, folderNumber: trademarkCasesTable.folderNumber, clientId: trademarkCasesTable.clientId, tmNumber: trademarkCasesTable.tmNumber, applicantName: trademarkCasesTable.applicantName, class: trademarkCasesTable.class, filingDate: trademarkCasesTable.filingDate, stage: trademarkCasesTable.stage, subStage: trademarkCasesTable.subStage, notes: trademarkCasesTable.notes, createdAt: trademarkCasesTable.createdAt, updatedAt: trademarkCasesTable.updatedAt, clientNumber: clientsTable.clientNumber, clientName: clientsTable.name })
    .from(trademarkCasesTable)
    .leftJoin(clientsTable, eq(trademarkCasesTable.clientId, clientsTable.id))
    .where(eq(trademarkCasesTable.folderNumber, folderId));
  if (!tmCase) {
    res.status(404).json({ error: "Case not found" });
    return;
  }
  const conditions = [eq(ledgerEntriesTable.caseId, tmCase.id)];
  if (startDate) conditions.push(gte(ledgerEntriesTable.date, typeof startDate === 'string' ? startDate : (startDate as Date).toISOString().split('T')[0]!));
  if (endDate) conditions.push(lte(ledgerEntriesTable.date, typeof endDate === 'string' ? endDate : (endDate as Date).toISOString().split('T')[0]!));

  const entries = await db.select().from(ledgerEntriesTable).where(and(...conditions)).orderBy(ledgerEntriesTable.date, ledgerEntriesTable.id);
  const totalDue = entries.reduce((s, e) => s + parseFloat(e.dueAmount), 0);
  const totalReceived = entries.reduce((s, e) => s + parseFloat(e.receivedAmount), 0);
  res.json({ case: tmCase, entries, totalDue, totalReceived, balance: totalReceived - totalDue });
});

router.get("/reports/outstanding", async (req, res): Promise<void> => {
  const query = ReportOutstandingQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { clientId } = query.data;

  let baseWhere = clientId ? eq(trademarkCasesTable.clientId, clientId) : undefined;

  const rows = await db
    .select({
      clientId: clientsTable.id,
      clientName: clientsTable.name,
      clientNumber: clientsTable.clientNumber,
      folderNumber: trademarkCasesTable.folderNumber,
      tmNumber: trademarkCasesTable.tmNumber,
      totalDue: sql<number>`COALESCE(SUM(${ledgerEntriesTable.dueAmount}::numeric), 0)`,
      totalReceived: sql<number>`COALESCE(SUM(${ledgerEntriesTable.receivedAmount}::numeric), 0)`,
    })
    .from(trademarkCasesTable)
    .leftJoin(clientsTable, eq(trademarkCasesTable.clientId, clientsTable.id))
    .leftJoin(ledgerEntriesTable, eq(ledgerEntriesTable.caseId, trademarkCasesTable.id))
    .where(baseWhere)
    .groupBy(clientsTable.id, clientsTable.name, clientsTable.clientNumber, trademarkCasesTable.folderNumber, trademarkCasesTable.tmNumber)
    .having(sql`COALESCE(SUM(${ledgerEntriesTable.dueAmount}::numeric), 0) > COALESCE(SUM(${ledgerEntriesTable.receivedAmount}::numeric), 0)`)
    .orderBy(clientsTable.name);

  res.json(rows.map((r) => ({ ...r, balance: Number(r.totalReceived) - Number(r.totalDue) })));
});

router.get("/reports/daily-collection", async (req, res): Promise<void> => {
  const query = ReportDailyCollectionQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { date } = query.data;
  const dateStr = typeof date === 'string' ? date : (date as Date).toISOString().split('T')[0]!;
  const entries = await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.date, dateStr)).orderBy(ledgerEntriesTable.id);
  const totalReceived = entries.reduce((s, e) => s + parseFloat(e.receivedAmount), 0);
  res.json({ date, entries, totalReceived });
});

router.get("/reports/monthly-collection", async (req, res): Promise<void> => {
  const query = ReportMonthlyCollectionQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { year, month } = query.data;
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0).toISOString().split("T")[0]; // last day of month
  const entries = await db
    .select()
    .from(ledgerEntriesTable)
    .where(and(gte(ledgerEntriesTable.date, startDate!), lte(ledgerEntriesTable.date, endDate!)))
    .orderBy(ledgerEntriesTable.date);
  const totalReceived = entries.reduce((s, e) => s + parseFloat(e.receivedAmount), 0);
  const totalDue = entries.reduce((s, e) => s + parseFloat(e.dueAmount), 0);
  res.json({ year, month, entries, totalReceived, totalDue });
});

router.get("/reports/stage", async (req, res): Promise<void> => {
  const query = ReportStageQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { stage } = query.data;
  const where = stage ? eq(trademarkCasesTable.stage, stage) : undefined;
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
    .orderBy(trademarkCasesTable.stage, trademarkCasesTable.folderNumber);

  // Group by stage
  const grouped: Record<number, { stage: number; count: number; cases: typeof cases }> = {};
  for (const c of cases) {
    if (!grouped[c.stage]) grouped[c.stage] = { stage: c.stage, count: 0, cases: [] };
    grouped[c.stage]!.count++;
    grouped[c.stage]!.cases.push(c);
  }
  res.json(Object.values(grouped).sort((a, b) => a.stage - b.stage));
});

export default router;
