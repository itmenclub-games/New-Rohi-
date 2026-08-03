import { Router } from "express";
import { db } from "@workspace/db";
import {
  conversationsTable,
  depositsTable,
  redeemsTable,
  gameAccountRequestsTable,
  freePlayRequestsTable,
  messagesTable,
} from "@workspace/db";
import { eq, desc, count, and, gte } from "drizzle-orm";

const router = Router();

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalConvRows,
      activeConvRows,
      staffHandlingRows,
      pendingDepositsRows,
      pendingRedeemsRows,
      pendingGameAccountsRows,
      pendingFreePlayRows,
      todayDepositsRows,
      todayRedeemsRows,
    ] = await Promise.all([
      db.select({ count: count() }).from(conversationsTable),
      db.select({ count: count() }).from(conversationsTable).where(eq(conversationsTable.status, "open")),
      db.select({ count: count() }).from(conversationsTable).where(eq(conversationsTable.status, "staff_handling")),
      db.select({ count: count() }).from(depositsTable).where(eq(depositsTable.status, "pending")),
      db.select({ count: count() }).from(redeemsTable).where(eq(redeemsTable.status, "pending")),
      db.select({ count: count() }).from(gameAccountRequestsTable).where(eq(gameAccountRequestsTable.status, "pending")),
      db.select({ count: count() }).from(freePlayRequestsTable).where(eq(freePlayRequestsTable.status, "pending")),
      db.select({ count: count() }).from(depositsTable).where(gte(depositsTable.createdAt, today)),
      db.select({ count: count() }).from(redeemsTable).where(gte(redeemsTable.createdAt, today)),
    ]);

    res.json({
      totalConversations: Number(totalConvRows[0]?.count ?? 0),
      activeConversations: Number(activeConvRows[0]?.count ?? 0),
      staffHandling: Number(staffHandlingRows[0]?.count ?? 0),
      pendingDeposits: Number(pendingDepositsRows[0]?.count ?? 0),
      pendingRedeems: Number(pendingRedeemsRows[0]?.count ?? 0),
      pendingGameAccounts: Number(pendingGameAccountsRows[0]?.count ?? 0),
      pendingFreePlay: Number(pendingFreePlayRows[0]?.count ?? 0),
      todayDepositsCount: Number(todayDepositsRows[0]?.count ?? 0),
      todayRedeemsCount: Number(todayRedeemsRows[0]?.count ?? 0),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard stats");
    res.status(500).json({ error: "Failed to get dashboard stats" });
  }
});

router.get("/dashboard/recent-messages", async (req, res): Promise<void> => {
  try {
    const msgs = await db
      .select({
        id: messagesTable.id,
        conversationId: messagesTable.conversationId,
        customerName: conversationsTable.customerName,
        customerTelegramId: conversationsTable.customerTelegramId,
        text: messagesTable.text,
        senderType: messagesTable.senderType,
        createdAt: messagesTable.createdAt,
      })
      .from(messagesTable)
      .innerJoin(conversationsTable, eq(messagesTable.conversationId, conversationsTable.id))
      .orderBy(desc(messagesTable.createdAt))
      .limit(20);

    res.json(msgs);
  } catch (err) {
    req.log.error({ err }, "Failed to get recent messages");
    res.status(500).json({ error: "Failed to get recent messages" });
  }
});

export default router;
