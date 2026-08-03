import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { conversationsTable } from "./conversations";
import { gamesTable } from "./games";

export const gameAccountRequestsTable = pgTable("game_account_requests", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  customerTelegramId: text("customer_telegram_id").notNull(),
  conversationId: integer("conversation_id").notNull().references(() => conversationsTable.id, { onDelete: "cascade" }),
  gameId: integer("game_id").notNull().references(() => gamesTable.id),
  gameName: text("game_name").notNull(),
  gameLink: text("game_link"),
  credentialsUsername: text("credentials_username"),
  credentialsPassword: text("credentials_password"),
  status: text("status").notNull().default("pending"), // pending | fulfilled | rejected
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertGameAccountRequestSchema = createInsertSchema(gameAccountRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGameAccountRequest = z.infer<typeof insertGameAccountRequestSchema>;
export type GameAccountRequest = typeof gameAccountRequestsTable.$inferSelect;
