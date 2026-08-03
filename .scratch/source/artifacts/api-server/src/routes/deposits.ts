import { Router } from "express";
import { conversationsTable, db, depositsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { sendTelegramMessage } from "../lib/telegram";
import { saveConversationMessage } from "../lib/conversation";

const router = Router();

async function notifyDepositCustomer(
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

router.get("/deposits", async (req, res): Promise<void> => {
  try {
    const { status } = req.query as Record<string, string>;
    const results = status
      ? await db.select().from(depositsTable).where(eq(depositsTable.status, status)).orderBy(desc(depositsTable.createdAt))
      : await db.select().from(depositsTable).orderBy(desc(depositsTable.createdAt));
    res.json(results.map(r => ({ ...r, amount: r.amount ? Number(r.amount) : null })));
  } catch (err) {
    req.log.error({ err }, "Failed to list deposits");
    res.status(500).json({ error: "Failed to list deposits" });
  }
});

router.patch("/deposits/:id/approve", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const [updated] = await db.update(depositsTable).set({ status: "approved", updatedAt: new Date() }).where(eq(depositsTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    await notifyDepositCustomer(
      updated.conversationId,
      "Your deposit request has been approved. Staff will let you know when it is completed.",
    );
    res.json({ ...updated, amount: updated.amount ? Number(updated.amount) : null });
  } catch (err) {
    req.log.error({ err }, "Failed to approve deposit");
    res.status(500).json({ error: "Failed to approve deposit" });
  }
});

router.patch("/deposits/:id/reject", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const { reason } = req.body;
    const [updated] = await db.update(depositsTable).set({ status: "rejected", rejectionReason: reason || null, updatedAt: new Date() }).where(eq(depositsTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    await notifyDepositCustomer(
      updated.conversationId,
      `Your deposit request was not approved${reason ? `: ${reason}` : "."}`,
    );
    res.json({ ...updated, amount: updated.amount ? Number(updated.amount) : null });
  } catch (err) {
    req.log.error({ err }, "Failed to reject deposit");
    res.status(500).json({ error: "Failed to reject deposit" });
  }
});

router.patch("/deposits/:id/complete", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const [updated] = await db.update(depositsTable).set({ status: "completed", updatedAt: new Date() }).where(eq(depositsTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    await notifyDepositCustomer(
      updated.conversationId,
      "Your deposit has been completed. Thank you!",
    );
    res.json({ ...updated, amount: updated.amount ? Number(updated.amount) : null });
  } catch (err) {
    req.log.error({ err }, "Failed to complete deposit");
    res.status(500).json({ error: "Failed to complete deposit" });
  }
});

export default router;
