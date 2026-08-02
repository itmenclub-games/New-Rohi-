import { Router } from "express";
import { conversationsTable, db, redeemsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { sendTelegramMessage } from "../lib/telegram";
import { saveConversationMessage } from "../lib/conversation";

const router = Router();

async function notifyRedeemCustomer(
  conversationId: number,
  text: string,
): Promise<void> {
  const [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, conversationId));
  if (!conversation) return;

  await sendTelegramMessage(conversation.customerTelegramId, text);
  await saveConversationMessage(conversation.id, text, "staff", "Staff");
}

router.get("/redeems", async (req, res): Promise<void> => {
  try {
    const { status } = req.query as Record<string, string>;
    const results = status
      ? await db.select().from(redeemsTable).where(eq(redeemsTable.status, status)).orderBy(desc(redeemsTable.createdAt))
      : await db.select().from(redeemsTable).orderBy(desc(redeemsTable.createdAt));
    res.json(results.map(r => ({ ...r, amount: r.amount ? Number(r.amount) : null })));
  } catch (err) {
    req.log.error({ err }, "Failed to list redeems");
    res.status(500).json({ error: "Failed to list redeems" });
  }
});

router.patch("/redeems/:id/approve", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const [updated] = await db.update(redeemsTable).set({ status: "approved", updatedAt: new Date() }).where(eq(redeemsTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    await notifyRedeemCustomer(
      updated.conversationId,
      `Your redeem request${updated.gameName ? ` for ${updated.gameName}` : ""} has been approved.`,
    );
    res.json({ ...updated, amount: updated.amount ? Number(updated.amount) : null });
  } catch (err) {
    req.log.error({ err }, "Failed to approve redeem");
    res.status(500).json({ error: "Failed to approve redeem" });
  }
});

router.patch("/redeems/:id/reject", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const { reason } = req.body;
    const [updated] = await db.update(redeemsTable).set({ status: "rejected", rejectionReason: reason || null, updatedAt: new Date() }).where(eq(redeemsTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    await notifyRedeemCustomer(
      updated.conversationId,
      `Your redeem request${updated.gameName ? ` for ${updated.gameName}` : ""} was not approved${reason ? `: ${reason}` : "."}`,
    );
    res.json({ ...updated, amount: updated.amount ? Number(updated.amount) : null });
  } catch (err) {
    req.log.error({ err }, "Failed to reject redeem");
    res.status(500).json({ error: "Failed to reject redeem" });
  }
});

router.patch("/redeems/:id/complete", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const [updated] = await db.update(redeemsTable).set({ status: "completed", updatedAt: new Date() }).where(eq(redeemsTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    await notifyRedeemCustomer(
      updated.conversationId,
      `Your redeem request${updated.gameName ? ` for ${updated.gameName}` : ""} has been completed.`,
    );
    res.json({ ...updated, amount: updated.amount ? Number(updated.amount) : null });
  } catch (err) {
    req.log.error({ err }, "Failed to complete redeem");
    res.status(500).json({ error: "Failed to complete redeem" });
  }
});

export default router;
