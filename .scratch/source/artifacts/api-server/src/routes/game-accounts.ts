import { Router } from "express";
import { db } from "@workspace/db";
import { gameAccountRequestsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { sendTelegramMessage } from "../lib/telegram";
import { conversationsTable } from "@workspace/db";
import { saveConversationMessage } from "../lib/conversation";

const router = Router();

router.get("/game-accounts", async (req, res): Promise<void> => {
  try {
    const { status } = req.query as Record<string, string>;
    const results = status
      ? await db.select().from(gameAccountRequestsTable).where(eq(gameAccountRequestsTable.status, status)).orderBy(desc(gameAccountRequestsTable.createdAt))
      : await db.select().from(gameAccountRequestsTable).orderBy(desc(gameAccountRequestsTable.createdAt));
    res.json(results);
  } catch (err) {
    req.log.error({ err }, "Failed to list game account requests");
    res.status(500).json({ error: "Failed to list game account requests" });
  }
});

router.patch("/game-accounts/:id/fulfill", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const { username, password, gameLink } = req.body;
    if (!username || !password || !gameLink) {
      res.status(400).json({ error: "username, password, and gameLink are required" });
      return;
    }

    const [request] = await db.select().from(gameAccountRequestsTable).where(eq(gameAccountRequestsTable.id, id));
    if (!request) { res.status(404).json({ error: "Not found" }); return; }

    const [updated] = await db
      .update(gameAccountRequestsTable)
      .set({ status: "fulfilled", credentialsUsername: username, credentialsPassword: password, gameLink, updatedAt: new Date() })
      .where(eq(gameAccountRequestsTable.id, id))
      .returning();

    // Send credentials to customer via Telegram
    const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, request.conversationId));
    if (conv) {
      const msg = `Your game account for ${request.gameName} is ready!\n\nUsername: ${username}\nPassword: ${password}\nGame Link: ${gameLink}`;
      await sendTelegramMessage(conv.customerTelegramId, msg);
      await saveConversationMessage(conv.id, msg, "staff", "Staff");
    }

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to fulfill game account request");
    res.status(500).json({ error: "Failed to fulfill game account request" });
  }
});

router.patch("/game-accounts/:id/reject", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const { reason } = req.body;
    const [request] = await db.select().from(gameAccountRequestsTable).where(eq(gameAccountRequestsTable.id, id));
    if (!request) { res.status(404).json({ error: "Not found" }); return; }
    const [updated] = await db
      .update(gameAccountRequestsTable)
      .set({ status: "rejected", rejectionReason: reason || null, updatedAt: new Date() })
      .where(eq(gameAccountRequestsTable.id, id))
      .returning();
    const [conversation] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, request.conversationId));
    if (conversation) {
      const message = `Your game account request for ${request.gameName} was not approved${reason ? `: ${reason}` : "."}`;
      await sendTelegramMessage(conversation.customerTelegramId, message);
      await saveConversationMessage(conversation.id, message, "staff", "Staff");
    }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to reject game account request");
    res.status(500).json({ error: "Failed to reject game account request" });
  }
});

export default router;
