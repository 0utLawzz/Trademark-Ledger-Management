import { Router, type IRouter } from "express";
import { ilike, or } from "drizzle-orm";
import { db, clientsTable, trademarkCasesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { GlobalSearchQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/search", async (req, res): Promise<void> => {
  const query = GlobalSearchQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { q } = query.data;
  if (!q || q.trim().length === 0) {
    res.json({ clients: [], cases: [] });
    return;
  }
  const term = `%${q.trim()}%`;
  const [clients, cases] = await Promise.all([
    db
      .select()
      .from(clientsTable)
      .where(or(ilike(clientsTable.name, term), ilike(clientsTable.clientNumber, term), ilike(clientsTable.email ?? sql`''`, term)))
      .limit(20),
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
      .where(
        or(
          ilike(trademarkCasesTable.folderNumber, term),
          ilike(trademarkCasesTable.tmNumber ?? sql`''`, term),
          ilike(clientsTable.clientNumber ?? sql`''`, term),
          ilike(trademarkCasesTable.applicantName, term),
          ilike(trademarkCasesTable.class ?? sql`''`, term),
        ),
      )
      .limit(20),
  ]);
  res.json({ clients, cases });
});

export default router;
