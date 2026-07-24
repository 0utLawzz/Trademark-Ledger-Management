import { pgTable, serial, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { trademarkCasesTable } from "./trademark-cases";

export const caseStagesTable = pgTable("case_stages", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => trademarkCasesTable.id, { onDelete: "cascade" }),
  stageNumber: integer("stage_number").notNull(),
  status: text("status"),
  subStatus: text("sub_status"),
  timeline: jsonb("timeline").notNull().default([]),
  history: jsonb("history").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCaseStageSchema = createInsertSchema(caseStagesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCaseStage = z.infer<typeof insertCaseStageSchema>;
export type CaseStage = typeof caseStagesTable.$inferSelect;
