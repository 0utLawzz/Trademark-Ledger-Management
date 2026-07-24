import { pgTable, serial, integer, text, timestamp, date, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { trademarkCasesTable } from "./trademark-cases";

export const ledgerEntriesTable = pgTable("ledger_entries", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => trademarkCasesTable.id, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }).notNull(),
  folderNumber: text("folder_number").notNull(),
  tmNumber: text("tm_number"),
  stage: integer("stage"),
  detail: text("detail").notNull(),
  dueAmount: numeric("due_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  receivedAmount: numeric("received_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  runningBalance: numeric("running_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLedgerEntrySchema = createInsertSchema(ledgerEntriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLedgerEntry = z.infer<typeof insertLedgerEntrySchema>;
export type LedgerEntry = typeof ledgerEntriesTable.$inferSelect;
