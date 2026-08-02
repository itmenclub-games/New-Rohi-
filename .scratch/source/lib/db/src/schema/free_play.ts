import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { conversationsTable } from "./conversations";

export const freePlayRequestsTable = pgTable("free_play_requests", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  customerTelegramId: text("customer_telegram_id").notNull(),
  conversationId: integer("conversation_id").notNull().references(() => conversationsTable.id, { onDelete: "cascade" }),
  requestedAmount: numeric("requested_amount", { precision: 10, scale: 2 }),
  approvedAmount: numeric("approved_amount", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFreePlayRequestSchema = createInsertSchema(freePlayRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFreePlayRequest = z.infer<typeof insertFreePlayRequestSchema>;
export type FreePlayRequest = typeof freePlayRequestsTable.$inferSelect;
