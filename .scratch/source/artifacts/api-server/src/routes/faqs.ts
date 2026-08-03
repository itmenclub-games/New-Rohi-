import { Router } from "express";
import { db } from "@workspace/db";
import { faqsTable } from "@workspace/db";
import { eq, ilike } from "drizzle-orm";

const router = Router();

router.get("/faqs", async (req, res): Promise<void> => {
  try {
    const { category } = req.query as Record<string, string>;
    const faqs = category
      ? await db.select().from(faqsTable).where(ilike(faqsTable.category, `%${category}%`)).orderBy(faqsTable.category)
      : await db.select().from(faqsTable).orderBy(faqsTable.category);
    res.json(faqs);
  } catch (err) { res.status(500).json({ error: "Failed to list FAQs" }); }
});

router.post("/faqs", async (req, res): Promise<void> => {
  try {
    const { category, question, answer } = req.body;
    if (!category || !question || !answer) { res.status(400).json({ error: "category, question, and answer are required" }); return; }
    const [faq] = await db.insert(faqsTable).values({ category, question, answer }).returning();
    res.status(201).json(faq);
  } catch (err) { res.status(500).json({ error: "Failed to create FAQ" }); }
});

router.patch("/faqs/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    const { category, question, answer } = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (category !== undefined) updates.category = category;
    if (question !== undefined) updates.question = question;
    if (answer !== undefined) updates.answer = answer;
    const [faq] = await db.update(faqsTable).set(updates).where(eq(faqsTable.id, id)).returning();
    if (!faq) { res.status(404).json({ error: "Not found" }); return; }
    res.json(faq);
  } catch (err) { res.status(500).json({ error: "Failed to update FAQ" }); }
});

router.delete("/faqs/:id", async (req, res): Promise<void> => {
  try {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    await db.delete(faqsTable).where(eq(faqsTable.id, id));
    res.sendStatus(204);
  } catch (err) { res.status(500).json({ error: "Failed to delete FAQ" }); }
});

export default router;
