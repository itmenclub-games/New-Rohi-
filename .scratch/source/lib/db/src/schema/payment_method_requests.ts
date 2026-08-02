import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { conversationsTable } from "./conversations";
import { paymentMethodsTable } from "./payment_methods";

export const paymentMethodRequestsTable = pgTable("payment_method_requests", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  customerTelegramId: text("customer_telegram_id").notNull(),
  conversationId: integer("conversation_id").notNull().references(() => conversationsTable.id, { onDelete: "cascade" }),
  paymentMethodId: integer("payment_method_id").notNull().references(() => paymentMethodsTable.id, { onDelete: "cascade" }),
  paymentMethodName: text("payment_method_name").notNull(),
  status: text("status").notNull().default("pending"), // pending | sent
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPaymentMethodRequestSchema = createInsertSchema(paymentMethodRequestsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPaymentMethodRequest = z.infer<typeof insertPaymentMethodRequestSchema>;
export type PaymentMethodRequest = typeof paymentMethodRequestsTable.$inferSelect;