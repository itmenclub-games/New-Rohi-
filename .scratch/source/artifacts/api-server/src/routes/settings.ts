import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const toNum = (v: unknown) => (v != null ? Number(v) : 0);

async function getOrCreateSettings() {
  const [existing] = await db.select().from(settingsTable).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(settingsTable).values({}).returning();
  return created;
}

router.get("/settings", async (_req, res): Promise<void> => {
  try {
    const s = await getOrCreateSettings();
    res.json({
      ...s,
      minDepositAmount: toNum(s.minDepositAmount),
      minRedeemAmount: toNum(s.minRedeemAmount),
      maxDailyRedeem: toNum(s.maxDailyRedeem),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get settings" });
  }
});

router.patch("/settings", async (req, res): Promise<void> => {
  try {
    const s = await getOrCreateSettings();
    const {
      groqApiKey,
      aiSystemPrompt,
      minDepositAmount,
      minRedeemAmount,
      maxDailyRedeem,
      cashoutBlockedStart,
      cashoutBlockedEnd,
    } = req.body;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (groqApiKey !== undefined) updates.groqApiKey = groqApiKey;
    if (aiSystemPrompt !== undefined) updates.aiSystemPrompt = aiSystemPrompt;
    if (minDepositAmount !== undefined) updates.minDepositAmount = String(minDepositAmount);
    if (minRedeemAmount !== undefined) updates.minRedeemAmount = String(minRedeemAmount);
    if (maxDailyRedeem !== undefined) updates.maxDailyRedeem = String(maxDailyRedeem);
    if (cashoutBlockedStart !== undefined) updates.cashoutBlockedStart = cashoutBlockedStart;
    if (cashoutBlockedEnd !== undefined) updates.cashoutBlockedEnd = cashoutBlockedEnd;

    const [updated] = await db
      .update(settingsTable)
      .set(updates)
      .where(eq(settingsTable.id, s.id))
      .returning();

    res.json({
      ...updated,
      minDepositAmount: toNum(updated.minDepositAmount),
      minRedeemAmount: toNum(updated.minRedeemAmount),
      maxDailyRedeem: toNum(updated.maxDailyRedeem),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to update settings" });
  }
});

export default router;
