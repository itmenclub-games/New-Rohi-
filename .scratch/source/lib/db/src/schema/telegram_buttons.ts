import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const telegramButtonsTable = pgTable("telegram_buttons", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  action: text("action").notNull(),
  order: integer("order").notNull().default(0),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTelegramButtonSchema = createInsertSchema(telegramButtonsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTelegramButton = z.infer<typeof insertTelegramButtonSchema>;
export type TelegramButton = typeof telegramButtonsTable.$inferSelect;
