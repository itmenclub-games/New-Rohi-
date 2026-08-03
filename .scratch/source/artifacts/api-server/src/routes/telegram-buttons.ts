import { Router } from "express";
import { db } from "@workspace/db";
import { telegramButtonsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router = Router();

router.get("/telegram-buttons", async (_req, res): Promise<void> => {
  try {
    const buttons = await db.select().from(telegramButtonsTable).orderBy(asc(telegramButtonsTable.order));
    res.json(buttons);
  } catch (err) { res.status(500).json({ error: "Failed to list Telegram buttons" }); }
});

router.post("/telegram-buttons", async (req, res): Promise<void> => {
  try {
    const { label, action, order } = req.body;
    if (!label || !action) { res.status(400).json({ error: "label and action are required" }); return; }
    const [btn] = await db.insert(telegramButtonsTable).values({ label, action, order: order ?? 0 }).returning();
    res.status(201).json(btn);
  } catch (err) { res.status(500).json({ error: "Failed to create Telegram button" }); }
});

router.patch("/telegram-buttons/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const { label, action, order, enabled } = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (label !== undefined) updates.label = label;
    if (action !== undefined) updates.action = action;
    if (order !== undefined) updates.order = order;
    if (enabled !== undefined) updates.enabled = enabled;
    const [btn] = await db.update(telegramButtonsTable).set(updates).where(eq(telegramButtonsTable.id, id)).returning();
    if (!btn) { res.status(404).json({ error: "Not found" }); return; }
    res.json(btn);
  } catch (err) { res.status(500).json({ error: "Failed to update Telegram button" }); }
});

router.delete("/telegram-buttons/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    await db.delete(telegramButtonsTable).where(eq(telegramButtonsTable.id, id));
    res.sendStatus(204);
  } catch (err) { res.status(500).json({ error: "Failed to delete Telegram button" }); }
});

export default router;
