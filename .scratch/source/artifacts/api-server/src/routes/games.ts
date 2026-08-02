import { Router } from "express";
import { db } from "@workspace/db";
import { gamesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/games", async (_req, res): Promise<void> => {
  try {
    const games = await db.select().from(gamesTable).orderBy(gamesTable.name);
    res.json(games);
  } catch (err) {
    res.status(500).json({ error: "Failed to list games" });
  }
});

router.post("/games", async (req, res): Promise<void> => {
  try {
    const { name, link, description } = req.body;
    if (!name) { res.status(400).json({ error: "name is required" }); return; }
    const [game] = await db.insert(gamesTable).values({ name, link: link || null, description: description || null }).returning();
    res.status(201).json(game);
  } catch (err) {
    res.status(500).json({ error: "Failed to create game" });
  }
});

router.patch("/games/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const { name, link, description } = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (link !== undefined) updates.link = link;
    if (description !== undefined) updates.description = description;
    const [game] = await db.update(gamesTable).set(updates).where(eq(gamesTable.id, id)).returning();
    if (!game) { res.status(404).json({ error: "Not found" }); return; }
    res.json(game);
  } catch (err) {
    res.status(500).json({ error: "Failed to update game" });
  }
});

router.delete("/games/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    await db.delete(gamesTable).where(eq(gamesTable.id, id));
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete game" });
  }
});

router.patch("/games/:id/toggle", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const [current] = await db.select().from(gamesTable).where(eq(gamesTable.id, id));
    if (!current) { res.status(404).json({ error: "Not found" }); return; }
    const [game] = await db.update(gamesTable).set({ enabled: !current.enabled, updatedAt: new Date() }).where(eq(gamesTable.id, id)).returning();
    res.json(game);
  } catch (err) {
    res.status(500).json({ error: "Failed to toggle game" });
  }
});

export default router;
