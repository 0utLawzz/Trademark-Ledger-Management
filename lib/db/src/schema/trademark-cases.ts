import { pgTable, text, serial, timestamp, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

export const trademarkCasesTable = pgTable("trademark_cases", {
  id: serial("id").primaryKey(),
  folderNumber: text("folder_number").notNull().unique(),
  clientId: integer("client_id").notNull().references(() => clientsTable.id),
  tmNumber: text("tm_number"),
  applicantName: text("applicant_name").notNull(),
  class: text("class"),
  filingDate: date("filing_date", { mode: "string" }),
  stage: integer("stage").notNull().default(1),
  subStage: text("sub_stage"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCaseSchema = createInsertSchema(trademarkCasesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type TrademarkCase = typeof trademarkCasesTable.$inferSelect;
