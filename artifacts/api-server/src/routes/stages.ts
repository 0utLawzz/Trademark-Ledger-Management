import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, trademarkCasesTable, caseStagesTable } from "@workspace/db";
import {
  ListCaseStagesParams,
  GetCaseStageParams,
  UpdateCaseStageParams,
  UpdateCaseStageBody,
} from "@workspace/api-zod";
import { auditLog } from "../lib/audit";

const router: IRouter = Router();

router.get("/cases/:folderId/stages", async (req, res): Promise<void> => {
  const params = ListCaseStagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [tmCase] = await db.select({ id: trademarkCasesTable.id }).from(trademarkCasesTable).where(eq(trademarkCasesTable.folderNumber, params.data.folderId));
  if (!tmCase) {
    res.status(404).json({ error: "Case not found" });
    return;
  }
  const stages = await db.select().from(caseStagesTable).where(eq(caseStagesTable.caseId, tmCase.id)).orderBy(caseStagesTable.stageNumber);
  res.json(stages);
});

router.get("/cases/:folderId/stages/:stageNumber", async (req, res): Promise<void> => {
  const params = GetCaseStageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [tmCase] = await db.select({ id: trademarkCasesTable.id }).from(trademarkCasesTable).where(eq(trademarkCasesTable.folderNumber, params.data.folderId));
  if (!tmCase) {
    res.status(404).json({ error: "Case not found" });
    return;
  }
  const [stage] = await db
    .select()
    .from(caseStagesTable)
    .where(and(eq(caseStagesTable.caseId, tmCase.id), eq(caseStagesTable.stageNumber, params.data.stageNumber)));
  if (!stage) {
    res.status(404).json({ error: "Stage not found" });
    return;
  }
  res.json(stage);
});

router.patch("/cases/:folderId/stages/:stageNumber", async (req, res): Promise<void> => {
  const params = UpdateCaseStageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCaseStageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [tmCase] = await db.select({ id: trademarkCasesTable.id }).from(trademarkCasesTable).where(eq(trademarkCasesTable.folderNumber, params.data.folderId));
  if (!tmCase) {
    res.status(404).json({ error: "Case not found" });
    return;
  }
  const [existingStage] = await db
    .select()
    .from(caseStagesTable)
    .where(and(eq(caseStagesTable.caseId, tmCase.id), eq(caseStagesTable.stageNumber, params.data.stageNumber)));
  if (!existingStage) {
    res.status(404).json({ error: "Stage not found" });
    return;
  }

  const { status, subStatus, timelineEvent } = parsed.data;

  // Build history entry for status/subStatus changes
  const historyEntries: Array<{ changedAt: string; field: string; oldValue: string | null; newValue: string | null }> = [];
  const now = new Date().toISOString();
  if (status !== undefined && status !== existingStage.status) {
    historyEntries.push({ changedAt: now, field: "status", oldValue: existingStage.status, newValue: status });
  }
  if (subStatus !== undefined && subStatus !== existingStage.subStatus) {
    historyEntries.push({ changedAt: now, field: "subStatus", oldValue: existingStage.subStatus, newValue: subStatus });
  }

  const currentTimeline = (existingStage.timeline as Array<{ date: string; description: string }>) ?? [];
  const currentHistory = (existingStage.history as Array<{ changedAt: string; field: string; oldValue: string | null; newValue: string | null }>) ?? [];

  const newTimeline = timelineEvent ? [...currentTimeline, timelineEvent] : currentTimeline;
  const newHistory = [...currentHistory, ...historyEntries];

  const updateData: Record<string, unknown> = {
    timeline: newTimeline,
    history: newHistory,
    updatedAt: new Date(),
  };
  if (status !== undefined) updateData["status"] = status;
  if (subStatus !== undefined) updateData["subStatus"] = subStatus;

  const [updated] = await db
    .update(caseStagesTable)
    .set(updateData)
    .where(and(eq(caseStagesTable.caseId, tmCase.id), eq(caseStagesTable.stageNumber, params.data.stageNumber)))
    .returning();

  await auditLog("case_stages", "UPDATE", `${params.data.folderId}-${params.data.stageNumber}`, { status, subStatus });
  res.json(updated);
});

export default router;
