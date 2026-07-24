import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, trademarkCasesTable, stageAssignmentsTable } from "@workspace/db";
import {
  ListAssignmentsParams,
  CreateAssignmentParams,
  CreateAssignmentBody,
  UpdateAssignmentParams,
  UpdateAssignmentBody,
  DeleteAssignmentParams,
} from "@workspace/api-zod";
import { auditLog } from "../lib/audit";

const router: IRouter = Router();

async function resolveCaseByFolder(folderNumber: string) {
  const [tmCase] = await db
    .select({ id: trademarkCasesTable.id })
    .from(trademarkCasesTable)
    .where(eq(trademarkCasesTable.folderNumber, folderNumber));
  return tmCase ?? null;
}

router.get("/cases/:folderId/assignments", async (req, res): Promise<void> => {
  const params = ListAssignmentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tmCase = await resolveCaseByFolder(params.data.folderId);
  if (!tmCase) {
    res.status(404).json({ error: "Case not found" });
    return;
  }
  const assignments = await db
    .select()
    .from(stageAssignmentsTable)
    .where(eq(stageAssignmentsTable.caseId, tmCase.id))
    .orderBy(stageAssignmentsTable.assignedDate);
  res.json(assignments);
});

router.post("/cases/:folderId/assignments", async (req, res): Promise<void> => {
  const params = CreateAssignmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateAssignmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tmCase = await resolveCaseByFolder(params.data.folderId);
  if (!tmCase) {
    res.status(404).json({ error: "Case not found" });
    return;
  }
  const [assignment] = await db
    .insert(stageAssignmentsTable)
    .values({ ...parsed.data, caseId: tmCase.id })
    .returning();
  await auditLog("stage_assignments", "CREATE", String(assignment!.id), { personName: assignment!.personName, folderId: params.data.folderId });
  res.status(201).json(assignment);
});

router.patch("/cases/:folderId/assignments/:assignmentId", async (req, res): Promise<void> => {
  const params = UpdateAssignmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateAssignmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tmCase = await resolveCaseByFolder(params.data.folderId);
  if (!tmCase) {
    res.status(404).json({ error: "Case not found" });
    return;
  }
  const [assignment] = await db
    .update(stageAssignmentsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(stageAssignmentsTable.id, params.data.assignmentId), eq(stageAssignmentsTable.caseId, tmCase.id)))
    .returning();
  if (!assignment) {
    res.status(404).json({ error: "Assignment not found" });
    return;
  }
  await auditLog("stage_assignments", "UPDATE", String(assignment.id), parsed.data);
  res.json(assignment);
});

router.delete("/cases/:folderId/assignments/:assignmentId", async (req, res): Promise<void> => {
  const params = DeleteAssignmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const tmCase = await resolveCaseByFolder(params.data.folderId);
  if (!tmCase) {
    res.status(404).json({ error: "Case not found" });
    return;
  }
  const [assignment] = await db
    .delete(stageAssignmentsTable)
    .where(and(eq(stageAssignmentsTable.id, params.data.assignmentId), eq(stageAssignmentsTable.caseId, tmCase.id)))
    .returning();
  if (!assignment) {
    res.status(404).json({ error: "Assignment not found" });
    return;
  }
  await auditLog("stage_assignments", "DELETE", String(assignment.id));
  res.json({ success: true });
});

export default router;
