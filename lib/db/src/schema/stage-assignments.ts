import { pgTable, serial, integer, text, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { trademarkCasesTable } from "./trademark-cases";

export const stageAssignmentsTable = pgTable("stage_assignments", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => trademarkCasesTable.id, { onDelete: "cascade" }),
  personName: text("person_name").notNull(),
  city: text("city"),
  assignedDate: date("assigned_date", { mode: "string" }).notNull(),
  acceptedDate: date("accepted_date", { mode: "string" }),
  status: text("status").notNull().default("Pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAssignmentSchema = createInsertSchema(stageAssignmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type StageAssignment = typeof stageAssignmentsTable.$inferSelect;
