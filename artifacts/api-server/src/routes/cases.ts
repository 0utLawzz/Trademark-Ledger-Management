import { Router, type IRouter } from "express";
import { eq, ilike, or, sql, and } from "drizzle-orm";
import { db, trademarkCasesTable, clientsTable, caseStagesTable } from "@workspace/db";
import {
  ListCasesQueryParams,
  GetCaseParams,
  CreateCaseBody,
  UpdateCaseParams,
  UpdateCaseBody,
  DeleteCaseParams,
} from "@workspace/api-zod";
import { auditLog } from "../lib/audit";

const router: IRouter = Router();

async function createDefaultStages(caseId: number) {
  const stagesData = [1, 2, 3, 4].map((stageNumber) => ({
    caseId,
    stageNumber,
    status: null,
    subStatus: null,
    timeline: [],
    history: [],
  }));
  await db.insert(caseStagesTable).values(stagesData);
}

router.get("/cases", async (req, res): Promise<void> => {
  const query = ListCasesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { folderNumber, tmNumber, clientNumber, applicantName, class: tmClass, stage, page = 1, limit = 20 } = query.data;
  const offset = (page - 1) * limit;

  const conditions: ReturnType<typeof eq>[] = [];
  if (folderNumber) conditions.push(ilike(trademarkCasesTable.folderNumber, `%${folderNumber}%`) as ReturnType<typeof eq>);
  if (tmNumber) conditions.push(ilike(trademarkCasesTable.tmNumber ?? sql`''`, `%${tmNumber}%`) as ReturnType<typeof eq>);
  if (clientNumber) conditions.push(ilike(clientsTable.clientNumber, `%${clientNumber}%`) as ReturnType<typeof eq>);
  if (applicantName) conditions.push(ilike(trademarkCasesTable.applicantName, `%${applicantName}%`) as ReturnType<typeof eq>);
  if (tmClass) conditions.push(ilike(trademarkCasesTable.class ?? sql`''`, `%${tmClass}%`) as ReturnType<typeof eq>);
  if (stage) conditions.push(eq(trademarkCasesTable.stage, stage) as ReturnType<typeof eq>);

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const baseQuery = db
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
    .leftJoin(clientsTable, eq(trademarkCasesTable.clientId, clientsTable.id));

  const [data, countResult] = await Promise.all([
    baseQuery.where(where).limit(limit).offset(offset).orderBy(trademarkCasesTable.folderNumber),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(trademarkCasesTable)
      .leftJoin(clientsTable, eq(trademarkCasesTable.clientId, clientsTable.id))
      .where(where),
  ]);

  res.json({ data, total: countResult[0]?.count ?? 0 });
});

router.post("/cases", async (req, res): Promise<void> => {
  const parsed = CreateCaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [tmCase] = await db.insert(trademarkCasesTable).values(parsed.data).returning();
  // Auto-create 4 stage records
  await createDefaultStages(tmCase!.id);
  await auditLog("trademark_cases", "CREATE", tmCase!.folderNumber, { folderNumber: tmCase!.folderNumber, clientId: tmCase!.clientId });
  // Return with client info
  const [fullCase] = await db
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
    .where(eq(trademarkCasesTable.id, tmCase!.id));
  res.status(201).json(fullCase);
});

router.get("/cases/:folderId", async (req, res): Promise<void> => {
  const params = GetCaseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [tmCase] = await db
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
    .where(eq(trademarkCasesTable.folderNumber, params.data.folderId));

  if (!tmCase) {
    res.status(404).json({ error: "Case not found" });
    return;
  }

  // Get stages and assignments
  const [stages, assignments] = await Promise.all([
    db.select().from(caseStagesTable).where(eq(caseStagesTable.caseId, tmCase.id)).orderBy(caseStagesTable.stageNumber),
    db
      .select()
      .from((await import("@workspace/db")).stageAssignmentsTable)
      .where(eq((await import("@workspace/db")).stageAssignmentsTable.caseId, tmCase.id)),
  ]);

  res.json({ ...tmCase, stages, assignments });
});

router.patch("/cases/:folderId", async (req, res): Promise<void> => {
  const params = UpdateCaseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [tmCase] = await db
    .update(trademarkCasesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(trademarkCasesTable.folderNumber, params.data.folderId))
    .returning();
  if (!tmCase) {
    res.status(404).json({ error: "Case not found" });
    return;
  }
  await auditLog("trademark_cases", "UPDATE", tmCase.folderNumber, parsed.data);
  // Return with client info
  const [fullCase] = await db
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
    .where(eq(trademarkCasesTable.id, tmCase.id));
  res.json(fullCase);
});

router.delete("/cases/:folderId", async (req, res): Promise<void> => {
  const params = DeleteCaseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [tmCase] = await db
    .delete(trademarkCasesTable)
    .where(eq(trademarkCasesTable.folderNumber, params.data.folderId))
    .returning();
  if (!tmCase) {
    res.status(404).json({ error: "Case not found" });
    return;
  }
  await auditLog("trademark_cases", "DELETE", tmCase.folderNumber);
  res.json({ success: true });
});

export default router;
