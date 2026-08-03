import { Router } from "express";
import { db } from "@workspace/db";
import { freePlayRequestsTable, conversationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { sendTelegramMessage } from "../lib/telegram";
import { saveConversationMessage } from "../lib/conversation";

const router = Router();

router.get("/free-play", async (req, res): Promise<void> => {
  try {
    const { status } = req.query as Record<string, string>;
    const results = status
      ? await db.select().from(freePlayRequestsTable).where(eq(freePlayRequestsTable.status, status)).orderBy(desc(freePlayRequestsTable.createdAt))
      : await db.select().from(freePlayRequestsTable).orderBy(desc(freePlayRequestsTable.createdAt));
    res.json(results.map(r => ({
      ...r,
      requestedAmount: r.requestedAmount ? Number(r.requestedAmount) : null,
      approvedAmount: r.approvedAmount ? Number(r.approvedAmount) : null,
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list free play requests");
    res.status(500).json({ error: "Failed to list free play requests" });
  }
});

router.patch("/free-play/:id/approve", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const { amount } = req.body;
    if (!amount) {
      res.status(400).json({ error: "amount is required" });
      return;
    }

    const [request] = await db.select().from(freePlayRequestsTable).where(eq(freePlayRequestsTable.id, id));
    if (!request) { res.status(404).json({ error: "Not found" }); return; }

    const [updated] = await db
      .update(freePlayRequestsTable)
      .set({ status: "approved", approvedAmount: String(amount), updatedAt: new Date() })
      .where(eq(freePlayRequestsTable.id, id))
      .returning();

    // Notify customer
    const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, request.conversationId));
    if (conv) {
      const message = `Great news! Your free play request has been approved. You have been credited $${amount} in free play.`;
      await sendTelegramMessage(conv.customerTelegramId, message);
      await saveConversationMessage(conv.id, message, "staff", "Staff");
    }

    res.json({ ...updated, approvedAmount: updated.approvedAmount ? Number(updated.approvedAmount) : null, requestedAmount: updated.requestedAmount ? Number(updated.requestedAmount) : null });
  } catch (err) {
    req.log.error({ err }, "Failed to approve free play");
    res.status(500).json({ error: "Failed to approve free play" });
  }
});

router.patch("/free-play/:id/reject", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const { reason } = req.body;
    const [updated] = await db
      .update(freePlayRequestsTable)
      .set({ status: "rejected", rejectionReason: reason || null, updatedAt: new Date() })
      .where(eq(freePlayRequestsTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, updated.conversationId));
    if (conv) {
      const message = `Your free play request was not approved${reason ? `: ${reason}` : "."}`;
      await sendTelegramMessage(conv.customerTelegramId, message);
      await saveConversationMessage(conv.id, message, "staff", "Staff");
    }
    res.json({ ...updated, requestedAmount: updated.requestedAmount ? Number(updated.requestedAmount) : null, approvedAmount: updated.approvedAmount ? Number(updated.approvedAmount) : null });
  } catch (err) {
    req.log.error({ err }, "Failed to reject free play");
    res.status(500).json({ error: "Failed to reject free play" });
  }
});

export default router;
