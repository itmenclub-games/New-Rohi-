import Groq from "groq-sdk";
import { logger } from "./logger";
import { db } from "@workspace/db";
import {
  settingsTable,
  gamesTable,
  paymentMethodsTable,
  bonusesTable,
  faqsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

// Conversation memory: Map<telegramId, messages[]>
const conversationMemory = new Map<
  string,
  Array<{ role: "user" | "assistant"; content: string }>
>();

const MAX_MEMORY = 20; // keep last 20 messages per user

export async function getAIResponse(
  telegramId: string,
  userMessage: string
): Promise<string> {
  try {
    // Load settings for API key and system prompt
    const [settings] = await db.select().from(settingsTable).limit(1);
    const apiKey = settings?.groqApiKey || process.env.GROQ_API_KEY;

    if (!apiKey) {
      return "I am currently unable to process your request. Please contact staff for assistance.";
    }

    // Load context from DB
    const [games, paymentMethods, bonuses, faqs] = await Promise.all([
      db.select().from(gamesTable).where(eq(gamesTable.enabled, true)),
      db.select().from(paymentMethodsTable).where(eq(paymentMethodsTable.enabled, true)),
      db.select().from(bonusesTable).where(eq(bonusesTable.enabled, true)),
      db.select().from(faqsTable),
    ]);

    const gamesList = games.map((g) => `- ${g.name}${g.link ? ` (${g.link})` : ""}${g.description ? `: ${g.description}` : ""}`).join("\n");
    const paymentList = paymentMethods
      .map((m) => `- ${m.name}`)
      .join("\n");
    const bonusList = bonuses
      .map((b) => `- ${b.name}${b.percentage ? ` (${b.percentage}%)` : ""}${b.minDeposit ? ` - Min deposit: $${b.minDeposit}` : ""}`)
      .join("\n");
    const faqList = faqs
      .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
      .join("\n\n");

    const minDeposit = settings?.minDepositAmount ?? "10";
    const minRedeem = settings?.minRedeemAmount ?? "50";
    const maxDailyRedeem = settings?.maxDailyRedeem ?? "1500";
    const cashoutBlockedStart = settings?.cashoutBlockedStart ?? "03:00";
    const cashoutBlockedEnd = settings?.cashoutBlockedEnd ?? "09:00";

    const defaultSystemPrompt = `You are a friendly, conversational, and professional assistant for an online casino.

The LIVE CASINO DATA below is the only source of truth. It is loaded from the admin dashboard database for this reply.

LIVE CASINO DATA:
Available Games:
${gamesList || "No games currently available"}

Payment Methods:
${paymentList || "No payment methods currently available"}

Bonuses:
${bonusList || "No bonuses currently available"}

FAQs:
${faqList || "No FAQs available"}

BUSINESS RULES:
- Minimum deposit: $${minDeposit}
- Minimum redeem: $${minRedeem}
- Maximum daily redeem: $${maxDailyRedeem}
- Cashout blocked: ${cashoutBlockedStart} - ${cashoutBlockedEnd}
- Request-specific amounts, bonus terms, redeem destinations, and payment account details must come from the live database or staff.

YOU CAN HELP WITH:
- Game questions and recommendations
- Deposit questions and instructions
- Redeem questions
- Bonus information
- Account questions
- General help and FAQs
- Chat support with staff

YOU MUST NEVER:
- Approve deposits or redeems
- Approve free play
- Send payment account details/tags
- Change any balance
- Ask for passwords
- Make promises about wins or outcomes
 - If a customer is upset about losing, respond respectfully and empathetically. Address them as sir or ma'am when natural, acknowledge that their frustration is understandable, explain that wins and losses are based on luck, and offer staff support. Never sound dismissive, judgmental, sarcastic, or blaming.
- Dismiss, shame, or argue with a user who is upset about losing
- Invent games, payment methods, bonuses, FAQs, links, prices, limits, or account details
- Claim that a request was approved or completed

When a user wants to:
- Create a game account: Ask which game they want, then tell them to use the "Game Account" button or that staff will assist
- Make a deposit: Guide them to click Deposit button, explain they'll receive payment info from staff
- Make a redeem: Ask them to use the Redeem button or tell them staff will handle it
- Get free play: Tell them to use the Free Play button and staff will approve
- Chat with staff: Let them know staff will be with them shortly

If the answer is not present in LIVE CASINO DATA or BUSINESS RULES, say that you do not have that information and direct the user to the relevant button or Chat with Staff. Never guess.
Keep responses concise, warm, and under 3 short paragraphs. Use plain text.`;

    const configuredPrompt = settings?.aiSystemPrompt?.trim();
    const systemPrompt = configuredPrompt
      ? `${configuredPrompt}\n\n${defaultSystemPrompt}`
      : defaultSystemPrompt;

    // Get or initialize conversation memory
    if (!conversationMemory.has(telegramId)) {
      conversationMemory.set(telegramId, []);
    }

    const history = conversationMemory.get(telegramId)!;
    history.push({ role: "user", content: userMessage });

    // Keep memory bounded
    if (history.length > MAX_MEMORY) {
      history.splice(0, history.length - MAX_MEMORY);
    }

    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content ?? "I am sorry, I could not process your request. Please try again.";

    history.push({ role: "assistant", content: reply });

    return reply;
  } catch (err) {
    logger.error({ err }, "AI response error");
    return "I am experiencing technical difficulties. Please try again later or contact staff directly.";
  }
}

export function clearConversationMemory(telegramId: string): void {
  conversationMemory.delete(telegramId);
}
