import { Router, type IRouter } from "express";
import { sql, desc } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { db, clientsTable, trademarkCasesTable, ledgerEntriesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
  const { gte, lte } = await import("drizzle-orm");

  const [
    [totalClientsRow],
    [totalCasesRow],
    casesByStageRows,
    recentCases,
    [outstandingRow],
    [monthlyRow],
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(clientsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(trademarkCasesTable),
    db
      .select({ stage: trademarkCasesTable.stage, count: sql<number>`count(*)::int` })
      .from(trademarkCasesTable)
      .groupBy(trademarkCasesTable.stage)
      .orderBy(trademarkCasesTable.stage),
    db
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
      .orderBy(desc(trademarkCasesTable.createdAt))
      .limit(10),
    db
      .select({
        totalDue: sql<number>`COALESCE(SUM(due_amount::numeric), 0)`,
        totalReceived: sql<number>`COALESCE(SUM(received_amount::numeric), 0)`,
      })
      .from(ledgerEntriesTable),
    db
      .select({ totalReceived: sql<number>`COALESCE(SUM(received_amount::numeric), 0)` })
      .from(ledgerEntriesTable)
      .where(gte(ledgerEntriesTable.date, firstOfMonth)),
  ]);

  const totalDue = Number(outstandingRow?.totalDue ?? 0);
  const totalReceived = Number(outstandingRow?.totalReceived ?? 0);
  const totalOutstanding = Math.max(0, totalDue - totalReceived);

  res.json({
    totalClients: totalClientsRow?.count ?? 0,
    totalCases: totalCasesRow?.count ?? 0,
    casesByStage: casesByStageRows,
    recentCases,
    totalOutstanding,
    monthlyCollection: Number(monthlyRow?.totalReceived ?? 0),
  });
});

export default router;
