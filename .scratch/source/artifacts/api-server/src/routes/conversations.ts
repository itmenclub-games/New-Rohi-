import { Router } from "express";
import { db } from "@workspace/db";
import { conversationsTable, messagesTable } from "@workspace/db";
import { eq, desc, ilike, or } from "drizzle-orm";
import { sendTelegramMessage } from "../lib/telegram";

const router = Router();

router.get("/conversations", async (req, res): Promise<void> => {
  try {
    const { search, status } = req.query as Record<string, string>;
    let query = db.select().from(conversationsTable).orderBy(desc(conversationsTable.updatedAt));

    if (status) {
      const results = await db
        .select()
        .from(conversationsTable)
        .where(eq(conversationsTable.status, status))
        .orderBy(desc(conversationsTable.updatedAt));
      res.json(results);
      return;
    }

    if (search) {
      const results = await db
        .select()
        .from(conversationsTable)
        .where(
          or(
            ilike(conversationsTable.customerName, `%${search}%`),
            ilike(conversationsTable.customerTelegramId, `%${search}%`)
          )
        )
        .orderBy(desc(conversationsTable.updatedAt));
      res.json(results);
      return;
    }

    const results = await query;
    res.json(results);
  } catch (err) {
    req.log.error({ err }, "Failed to list conversations");
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

router.get("/conversations/:id", async (req, res): Promise<void> => {
  try {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);

    const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, id));
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const msgs = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, id))
      .orderBy(messagesTable.createdAt);

    res.json({ conversation: conv, messages: msgs });
  } catch (err) {
    req.log.error({ err }, "Failed to get conversation");
    res.status(500).json({ error: "Failed to get conversation" });
  }
});

router.patch("/conversations/:id/resolve", async (req, res): Promise<void> => {
  try {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);

    const [updated] = await db
      .update(conversationsTable)
      .set({ status: "resolved", updatedAt: new Date() })
      .where(eq(conversationsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to resolve conversation");
    res.status(500).json({ error: "Failed to resolve conversation" });
  }
});

router.patch("/conversations/:id/takeover", async (req, res): Promise<void> => {
  try {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);

    const [updated] = await db
      .update(conversationsTable)
      .set({ status: "staff_handling", handledBy: "Staff", updatedAt: new Date() })
      .where(eq(conversationsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to takeover conversation");
    res.status(500).json({ error: "Failed to takeover conversation" });
  }
});

router.patch("/conversations/:id/release", async (req, res): Promise<void> => {
  try {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);

    const [updated] = await db
      .update(conversationsTable)
      .set({ status: "open", handledBy: null, updatedAt: new Date() })
      .where(eq(conversationsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to release conversation");
    res.status(500).json({ error: "Failed to release conversation" });
  }
});

router.post("/conversations/:id/messages", async (req, res): Promise<void> => {
  try {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);

    const { text } = req.body;
    if (!text) {
      res.status(400).json({ error: "text is required" });
      return;
    }

    const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, id));
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    // Send to Telegram
    await sendTelegramMessage(conv.customerTelegramId, text);

    const [msg] = await db
      .insert(messagesTable)
      .values({ conversationId: id, text, senderType: "staff", senderName: "Staff" })
      .returning();

    // Update conversation
    await db.update(conversationsTable).set({
      lastMessage: text,
      lastMessageAt: new Date(),
      messageCount: (conv.messageCount || 0) + 1,
      updatedAt: new Date(),
    }).where(eq(conversationsTable.id, id));

    res.status(201).json(msg);
  } catch (err) {
    req.log.error({ err }, "Failed to send staff message");
    res.status(500).json({ error: "Failed to send staff message" });
  }
});

export default router;
