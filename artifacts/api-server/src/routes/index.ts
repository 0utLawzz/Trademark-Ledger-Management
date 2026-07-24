import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clientsRouter from "./clients";
import casesRouter from "./cases";
import stagesRouter from "./stages";
import assignmentsRouter from "./assignments";
import ledgerRouter from "./ledger";
import reportsRouter from "./reports";
import importExportRouter from "./import-export";
import searchRouter from "./search";
import auditRouter from "./audit";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(clientsRouter);
router.use(casesRouter);
router.use(stagesRouter);
router.use(assignmentsRouter);
router.use(ledgerRouter);
router.use(reportsRouter);
router.use(importExportRouter);
router.use(searchRouter);
router.use(auditRouter);
router.use(dashboardRouter);

export default router;
