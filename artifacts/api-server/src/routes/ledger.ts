import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, trademarkCasesTable, ledgerEntriesTable } from "@workspace/db";
import {
  GetCaseLedgerParams,
  CreateLedgerEntryParams,
  CreateLedgerEntryBody,
  UpdateLedgerEntryParams,
  UpdateLedgerEntryBody,
  DeleteLedgerEntryParams,
} from "@workspace/api-zod";
import { auditLog } from "../lib/audit";

const router: IRouter = Router();

async function calcRunningBalance(caseId: number, dueAmount: number, receivedAmount: number): Promise<number> {
  const entries = await db
    .select({ runningBalance: ledgerEntriesTable.runningBalance })
    .from(ledgerEntriesTable)
    .where(eq(ledgerEntriesTable.caseId, caseId))
    .orderBy(desc(ledgerEntriesTable.date), desc(ledgerEntriesTable.id))
    .limit(1);
  const lastBalance = entries[0] ? parseFloat(entries[0].runningBalance) : 0;
  return lastBalance + receivedAmount - dueAmount;
}

router.get("/cases/:folderId/ledger", async (req, res): Promise<void> => {
  const params = GetCaseLedgerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [tmCase] = await db.select({ id: trademarkCasesTable.id }).from(trademarkCasesTable).where(eq(trademarkCasesTable.folderNumber, params.data.folderId));
  if (!tmCase) {
    res.status(404).json({ error: "Case not found" });
    return;
  }
  const entries = await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.caseId, tmCase.id)).orderBy(ledgerEntriesTable.date, ledgerEntriesTable.id);
  const totalDue = entries.reduce((sum, e) => sum + parseFloat(e.dueAmount), 0);
  const totalReceived = entries.reduce((sum, e) => sum + parseFloat(e.receivedAmount), 0);
  const balance = totalReceived - totalDue;
  res.json({ entries, totalDue, totalReceived, balance });
});

router.post("/cases/:folderId/ledger", async (req, res): Promise<void> => {
  const params = CreateLedgerEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateLedgerEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [tmCase] = await db.select({ id: trademarkCasesTable.id, folderNumber: trademarkCasesTable.folderNumber, tmNumber: trademarkCasesTable.tmNumber }).from(trademarkCasesTable).where(eq(trademarkCasesTable.folderNumber, params.data.folderId));
  if (!tmCase) {
    res.status(404).json({ error: "Case not found" });
    return;
  }
  const dueAmount = parsed.data.dueAmount ?? 0;
  const receivedAmount = parsed.data.receivedAmount ?? 0;
  const runningBalance = await calcRunningBalance(tmCase.id, dueAmount, receivedAmount);

  const [entry] = await db.insert(ledgerEntriesTable).values({
    caseId: tmCase.id,
    date: parsed.data.date,
    folderNumber: tmCase.folderNumber,
    tmNumber: parsed.data.tmNumber ?? tmCase.tmNumber,
    stage: parsed.data.stage ?? null,
    detail: parsed.data.detail,
    dueAmount: String(dueAmount),
    receivedAmount: String(receivedAmount),
    runningBalance: String(runningBalance),
  }).returning();

  await auditLog("ledger_entries", "CREATE", String(entry!.id), { folderNumber: tmCase.folderNumber, detail: entry!.detail });
  res.status(201).json(entry);
});

router.patch("/ledger/:entryId", async (req, res): Promise<void> => {
  const params = UpdateLedgerEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateLedgerEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, params.data.entryId));
  if (!existing) {
    res.status(404).json({ error: "Ledger entry not found" });
    return;
  }
  const dueAmount = parsed.data.dueAmount ?? parseFloat(existing.dueAmount);
  const receivedAmount = parsed.data.receivedAmount ?? parseFloat(existing.receivedAmount);

  const [entry] = await db
    .update(ledgerEntriesTable)
    .set({
      ...(parsed.data.date && { date: parsed.data.date }),
      ...(parsed.data.tmNumber !== undefined && { tmNumber: parsed.data.tmNumber }),
      ...(parsed.data.stage !== undefined && { stage: parsed.data.stage }),
      ...(parsed.data.detail && { detail: parsed.data.detail }),
      dueAmount: String(dueAmount),
      receivedAmount: String(receivedAmount),
      updatedAt: new Date(),
    })
    .where(eq(ledgerEntriesTable.id, params.data.entryId))
    .returning();

  await auditLog("ledger_entries", "UPDATE", String(entry!.id), parsed.data);
  res.json(entry);
});

router.delete("/ledger/:entryId", async (req, res): Promise<void> => {
  const params = DeleteLedgerEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [entry] = await db.delete(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, params.data.entryId)).returning();
  if (!entry) {
    res.status(404).json({ error: "Ledger entry not found" });
    return;
  }
  await auditLog("ledger_entries", "DELETE", String(entry.id));
  res.json({ success: true });
});

export default router;
