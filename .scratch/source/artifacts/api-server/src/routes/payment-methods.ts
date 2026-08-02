import { Router } from "express";
import { db } from "@workspace/db";
import {
  paymentMethodsTable,
  paymentTagsTable,
  paymentMethodRequestsTable,
  depositsTable,
  conversationsTable,
  messagesTable,
} from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { sendTelegramMessage } from "../lib/telegram";
import { saveConversationMessage } from "../lib/conversation";

const router = Router();

router.get("/payment-methods", async (_req, res): Promise<void> => {
  try {
    const methods = await db.select().from(paymentMethodsTable).orderBy(paymentMethodsTable.name);
    const tags = await db.select().from(paymentTagsTable);
    const result = methods.map(m => ({
      ...m,
      tags: tags.filter(t => t.paymentMethodId === m.id),
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to list payment methods" });
  }
});

router.get("/payment-method-requests", async (req, res): Promise<void> => {
  try {
    const { status } = req.query as Record<string, string>;
    const results = status
      ? await db
          .select()
          .from(paymentMethodRequestsTable)
          .where(eq(paymentMethodRequestsTable.status, status))
          .orderBy(desc(paymentMethodRequestsTable.createdAt))
      : await db
          .select()
          .from(paymentMethodRequestsTable)
          .orderBy(desc(paymentMethodRequestsTable.createdAt));
    res.json(results);
  } catch (err) {
    req.log.error({ err }, "Failed to list payment method requests");
    res.status(500).json({ error: "Failed to list payment method requests" });
  }
});

router.post("/payment-methods", async (req, res): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name) { res.status(400).json({ error: "name is required" }); return; }
    const [method] = await db.insert(paymentMethodsTable).values({ name }).returning();
    res.status(201).json({ ...method, tags: [] });
  } catch (err) {
    res.status(500).json({ error: "Failed to create payment method" });
  }
});

router.patch("/payment-methods/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const { name } = req.body;
    const [method] = await db.update(paymentMethodsTable).set({ name, updatedAt: new Date() }).where(eq(paymentMethodsTable.id, id)).returning();
    if (!method) { res.status(404).json({ error: "Not found" }); return; }
    const tags = await db.select().from(paymentTagsTable).where(eq(paymentTagsTable.paymentMethodId, id));
    res.json({ ...method, tags });
  } catch (err) {
    res.status(500).json({ error: "Failed to update payment method" });
  }
});

router.delete("/payment-methods/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    await db.delete(paymentMethodsTable).where(eq(paymentMethodsTable.id, id));
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete payment method" });
  }
});

router.patch("/payment-methods/:id/toggle", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const [current] = await db.select().from(paymentMethodsTable).where(eq(paymentMethodsTable.id, id));
    if (!current) { res.status(404).json({ error: "Not found" }); return; }
    const [method] = await db.update(paymentMethodsTable).set({ enabled: !current.enabled, updatedAt: new Date() }).where(eq(paymentMethodsTable.id, id)).returning();
    const tags = await db.select().from(paymentTagsTable).where(eq(paymentTagsTable.paymentMethodId, id));
    res.json({ ...method, tags });
  } catch (err) {
    res.status(500).json({ error: "Failed to toggle payment method" });
  }
});

router.post("/payment-methods/:id/tags", async (req, res): Promise<void> => {
  try {
    const paymentMethodId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const { label, accountDetails } = req.body;
    if (!label || !accountDetails) { res.status(400).json({ error: "label and accountDetails are required" }); return; }
    const [tag] = await db.insert(paymentTagsTable).values({ paymentMethodId, label, accountDetails }).returning();
    res.status(201).json(tag);
  } catch (err) {
    res.status(500).json({ error: "Failed to add payment tag" });
  }
});

router.delete("/payment-methods/:id/tags/:tagId", async (req, res): Promise<void> => {
  try {
    const tagId = parseInt(Array.isArray(req.params.tagId) ? req.params.tagId[0] : req.params.tagId, 10);
    await db.delete(paymentTagsTable).where(eq(paymentTagsTable.id, tagId));
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete payment tag" });
  }
});

router.post("/payment-methods/:id/send-tag", async (req, res): Promise<void> => {
  try {
    const methodId = Number(req.params.id);
    const { tagId, conversationId, requestId, depositId } = req.body;
    if (!tagId || !conversationId) { res.status(400).json({ error: "tagId and conversationId are required" }); return; }

    const [tag] = await db.select().from(paymentTagsTable).where(eq(paymentTagsTable.id, Number(tagId)));
    const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, conversationId));

    if (!tag || !conv) { res.status(404).json({ error: "Tag or conversation not found" }); return; }

    const [method] = await db
      .select()
      .from(paymentMethodsTable)
      .where(eq(paymentMethodsTable.id, methodId));
    if (!method || tag.paymentMethodId !== method.id) {
      res.status(400).json({ error: "Payment tag does not belong to the selected payment method" });
      return;
    }
    if (requestId) {
      const [request] = await db
        .select()
        .from(paymentMethodRequestsTable)
        .where(
          and(
            eq(paymentMethodRequestsTable.id, Number(requestId)),
            eq(paymentMethodRequestsTable.paymentMethodId, method.id),
            eq(paymentMethodRequestsTable.conversationId, Number(conversationId)),
          ),
        );
      if (!request) {
        res.status(400).json({ error: "Payment tag does not belong to the requested payment method" });
        return;
      }
    }
    if (depositId) {
      const [deposit] = await db
        .select()
        .from(depositsTable)
        .where(
          and(
            eq(depositsTable.id, Number(depositId)),
            eq(depositsTable.conversationId, Number(conversationId)),
          ),
        );
      if (!deposit) {
        res.status(400).json({ error: "Deposit request does not belong to this conversation" });
        return;
      }
    }
    if (!method) {
      res.status(400).json({ error: "Payment tag does not belong to the requested payment method" });
      return;
    }
    const message = `${tag.label}:\n${tag.accountDetails}`;
    await sendTelegramMessage(conv.customerTelegramId, message);
    await saveConversationMessage(conv.id, message, "staff", "Staff");
    if (depositId) {
      await db
        .update(depositsTable)
        .set({ paymentMethod: method?.name ?? null, updatedAt: new Date() })
        .where(eq(depositsTable.id, Number(depositId)));
    }
    if (requestId) {
      await db
        .update(paymentMethodRequestsTable)
        .set({ status: "sent", updatedAt: new Date() })
        .where(eq(paymentMethodRequestsTable.id, Number(requestId)));
    }
    res.json({ success: true, message: "Tag sent successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to send payment tag" });
  }
});

export default router;
