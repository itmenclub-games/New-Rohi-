import { pgTable, text, serial, timestamp, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bonusesTable = pgTable("bonuses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  minDeposit: numeric("min_deposit", { precision: 10, scale: 2 }),
  percentage: numeric("percentage", { precision: 6, scale: 2 }),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBonusSchema = createInsertSchema(bonusesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBonus = z.infer<typeof insertBonusSchema>;
export type Bonus = typeof bonusesTable.$inferSelect;
