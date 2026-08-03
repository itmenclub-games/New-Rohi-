import { pgTable, text, serial, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  groqApiKey: text("groq_api_key"),
  aiSystemPrompt: text("ai_system_prompt"),
  minDepositAmount: numeric("min_deposit_amount", { precision: 10, scale: 2 }).notNull().default("10"),
  minRedeemAmount: numeric("min_redeem_amount", { precision: 10, scale: 2 }).notNull().default("50"),
  maxDailyRedeem: numeric("max_daily_redeem", { precision: 10, scale: 2 }).notNull().default("1500"),
  cashoutBlockedStart: text("cashout_blocked_start").notNull().default("03:00"),
  cashoutBlockedEnd: text("cashout_blocked_end").notNull().default("09:00"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
