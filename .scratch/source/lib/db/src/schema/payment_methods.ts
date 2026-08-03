import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const paymentMethodsTable = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const paymentTagsTable = pgTable("payment_tags", {
  id: serial("id").primaryKey(),
  paymentMethodId: integer("payment_method_id").notNull().references(() => paymentMethodsTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  accountDetails: text("account_details").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethodsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPaymentTagSchema = createInsertSchema(paymentTagsTable).omit({ id: true, createdAt: true });
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type PaymentMethod = typeof paymentMethodsTable.$inferSelect;
export type InsertPaymentTag = z.infer<typeof insertPaymentTagSchema>;
export type PaymentTag = typeof paymentTagsTable.$inferSelect;
