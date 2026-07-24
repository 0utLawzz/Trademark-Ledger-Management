import { db, auditLogsTable } from "@workspace/db";

export async function auditLog(
  tableName: string,
  operation: "CREATE" | "UPDATE" | "DELETE",
  recordId: string,
  changes?: Record<string, unknown>,
  performedBy?: string,
) {
  await db.insert(auditLogsTable).values({
    tableName,
    operation,
    recordId,
    changes: changes ? JSON.stringify(changes) : null,
    performedBy: performedBy ?? null,
  });
}
