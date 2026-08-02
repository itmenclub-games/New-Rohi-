import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { conversationsTable } from "./conversations";
import { gamesTable } from "./games";

export const redeemsTable = pgTable("redeems", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  customerTelegramId: text("customer_telegram_id").notNull(),
  conversationId: integer("conversation_id").notNull().references(() => conversationsTable.id, { onDelete: "cascade" }),
  gameId: integer("game_id").references(() => gamesTable.id),
  gameName: text("game_name"),
  amount: numeric("amount", { precision: 10, scale: 2 }),
  paymentMethod: text("payment_method"),
  paymentDetails: text("payment_details"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected | completed
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRedeemSchema = createInsertSchema(redeemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRedeem = z.infer<typeof insertRedeemSchema>;
export type Redeem = typeof redeemsTable.$inferSelect;
