import { Router } from "express";
import { db } from "@workspace/db";
import { bonusesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const toNum = (v: unknown) => v != null ? Number(v) : null;

router.get("/bonuses", async (_req, res): Promise<void> => {
  try {
    const bonuses = await db.select().from(bonusesTable).orderBy(bonusesTable.name);
    res.json(bonuses.map(b => ({ ...b, minDeposit: toNum(b.minDeposit), percentage: toNum(b.percentage) })));
  } catch (err) { res.status(500).json({ error: "Failed to list bonuses" }); }
});

router.post("/bonuses", async (req, res): Promise<void> => {
  try {
    const { name, description, minDeposit, percentage } = req.body;
    if (!name) { res.status(400).json({ error: "name is required" }); return; }
    const [b] = await db.insert(bonusesTable).values({ name, description: description || null, minDeposit: minDeposit != null ? String(minDeposit) : null, percentage: percentage != null ? String(percentage) : null }).returning();
    res.status(201).json({ ...b, minDeposit: toNum(b.minDeposit), percentage: toNum(b.percentage) });
  } catch (err) { res.status(500).json({ error: "Failed to create bonus" }); }
});

router.patch("/bonuses/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const { name, description, minDeposit, percentage } = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (minDeposit !== undefined) updates.minDeposit = minDeposit != null ? String(minDeposit) : null;
    if (percentage !== undefined) updates.percentage = percentage != null ? String(percentage) : null;
    const [b] = await db.update(bonusesTable).set(updates).where(eq(bonusesTable.id, id)).returning();
    if (!b) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...b, minDeposit: toNum(b.minDeposit), percentage: toNum(b.percentage) });
  } catch (err) { res.status(500).json({ error: "Failed to update bonus" }); }
});

router.delete("/bonuses/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    await db.delete(bonusesTable).where(eq(bonusesTable.id, id));
    res.sendStatus(204);
  } catch (err) { res.status(500).json({ error: "Failed to delete bonus" }); }
});

router.patch("/bonuses/:id/toggle", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const [current] = await db.select().from(bonusesTable).where(eq(bonusesTable.id, id));
    if (!current) { res.status(404).json({ error: "Not found" }); return; }
    const [b] = await db.update(bonusesTable).set({ enabled: !current.enabled, updatedAt: new Date() }).where(eq(bonusesTable.id, id)).returning();
    res.json({ ...b, minDeposit: toNum(b.minDeposit), percentage: toNum(b.percentage) });
  } catch (err) { res.status(500).json({ error: "Failed to toggle bonus" }); }
});

export default router;
