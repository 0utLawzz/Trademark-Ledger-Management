import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, auditLogsTable } from "@workspace/db";
import { ListAuditLogsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/audit-logs", async (req, res): Promise<void> => {
  const query = ListAuditLogsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { tableName, operation, recordId, page = 1, limit = 50 } = query.data;
  const offset = (page - 1) * limit;

  const conditions: ReturnType<typeof eq>[] = [];
  if (tableName) conditions.push(eq(auditLogsTable.tableName, tableName) as ReturnType<typeof eq>);
  if (operation) conditions.push(eq(auditLogsTable.operation, operation) as ReturnType<typeof eq>);
  if (recordId) conditions.push(eq(auditLogsTable.recordId, recordId) as ReturnType<typeof eq>);

  const { and } = await import("drizzle-orm");
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [data, countResult] = await Promise.all([
    db.select().from(auditLogsTable).where(where).orderBy(desc(auditLogsTable.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(auditLogsTable).where(where),
  ]);
  res.json({ data, total: countResult[0]?.count ?? 0 });
});

export default router;
