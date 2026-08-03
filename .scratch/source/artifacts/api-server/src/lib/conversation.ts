import { db } from "@workspace/db";
import { conversationsTable, messagesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export type ConversationSender = "customer" | "bot" | "staff";

export async function saveConversationMessage(
  conversationId: number,
  text: string,
  senderType: ConversationSender,
  senderName?: string,
): Promise<void> {
  await db.insert(messagesTable).values({
    conversationId,
    text,
    senderType,
    senderName: senderName ?? null,
  });

  await db
    .update(conversationsTable)
    .set({
      lastMessage: text,
      lastMessageAt: new Date(),
      messageCount: sql`coalesce(${conversationsTable.messageCount}, 0) + 1`,
      updatedAt: new Date(),
    })
    .where(eq(conversationsTable.id, conversationId));
}