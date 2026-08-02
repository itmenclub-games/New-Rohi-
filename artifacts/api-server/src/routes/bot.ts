import { Router } from "express";
import { db } from "@workspace/db";
import {
  bonusesTable,
  conversationsTable,
  depositsTable,
  faqsTable,
  freePlayRequestsTable,
  gameAccountRequestsTable,
  gamesTable,
  messagesTable,
  paymentMethodsTable,
  paymentMethodRequestsTable,
  redeemsTable,
  telegramButtonsTable,
} from "@workspace/db";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import {
  answerTelegramCallbackQuery,
  getTelegramFileUrl,
  sendTelegramInlineKeyboard,
  sendTelegramMessage,
  sendTelegramReplyKeyboard,
} from "../lib/telegram";
import { saveConversationMessage } from "../lib/conversation";
import { getAIResponse } from "../lib/ai";
import { logger } from "../lib/logger";

const router = Router();

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: { id: number; type: string };
    text?: string;
    photo?: Array<{ file_id: string; file_size?: number }>;
    caption?: string;
  };
  callback_query?: {
    id: string;
    from: { id: number; first_name: string; last_name?: string };
    message?: { chat: { id: number }; message_id: number };
    data?: string;
  };
}

type MenuButton = { label: string; action: string };

const FALLBACK_MENU: MenuButton[] = [
  { label: "Game Account", action: "game_account" },
  { label: "Deposit", action: "deposit" },
  { label: "Redeem", action: "redeem" },
  { label: "Free Play", action: "free_play" },
  { label: "Bonuses", action: "bonuses" },
  { label: "Payment methods", action: "payment_methods" },
  { label: "Chat with Staff", action: "staff_chat" },
  { label: "FAQs", action: "faqs" },
];

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

async function getMenuButtons(): Promise<MenuButton[]> {
  const configured = await db
    .select({
      label: telegramButtonsTable.label,
      action: telegramButtonsTable.action,
    })
    .from(telegramButtonsTable)
    .where(eq(telegramButtonsTable.enabled, true))
    .orderBy(asc(telegramButtonsTable.order));

  return configured.length > 0 ? configured : FALLBACK_MENU;
}

async function sendMainMenu(
  chatId: string,
  text: string,
  menuButtons: MenuButton[],
): Promise<void> {
  const rows: string[][] = [];
  for (let index = 0; index < menuButtons.length; index += 2) {
    rows.push(menuButtons.slice(index, index + 2).map((button) => button.label));
  }
  await sendTelegramReplyKeyboard(chatId, text, rows);
}

async function getOrCreateConversation(telegramId: string, customerName: string) {
  const [existing] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.customerTelegramId, telegramId));

  if (existing) {
    if (existing.customerName !== customerName && customerName !== "Customer") {
      const [updated] = await db
        .update(conversationsTable)
        .set({ customerName, updatedAt: new Date() })
        .where(eq(conversationsTable.id, existing.id))
        .returning();
      return updated ?? existing;
    }
    return existing;
  }

  const [created] = await db
    .insert(conversationsTable)
    .values({ customerTelegramId: telegramId, customerName })
    .returning();

  return created;
}

async function sendSaved(
  chatId: string,
  conversationId: number,
  text: string,
): Promise<void> {
  const menuButtons = await getMenuButtons();
  const rows: string[][] = [];
  for (let index = 0; index < menuButtons.length; index += 2) {
    rows.push(menuButtons.slice(index, index + 2).map((button) => button.label));
  }
  await sendTelegramReplyKeyboard(chatId, text, rows);
  await saveConversationMessage(conversationId, text, "bot");
}

async function sendInlineSaved(
  chatId: string,
  conversationId: number,
  text: string,
  buttons: Array<Array<{ text: string; callback_data: string }>>,
): Promise<void> {
  await sendTelegramInlineKeyboard(chatId, text, buttons);
  await saveConversationMessage(conversationId, text, "bot");
}

async function listGamesText(): Promise<string> {
  const games = await db
    .select()
    .from(gamesTable)
    .where(eq(gamesTable.enabled, true))
    .orderBy(asc(gamesTable.name));

  if (games.length === 0) {
    return "There are no games available right now. Please check back soon or chat with staff.";
  }

  return [
    "Here are the games currently available:",
    "",
    ...games.map((game) => {
      const details = [
        `🎮 ${game.name}`,
        game.description ? game.description : null,
        game.link ? `Play: ${game.link}` : null,
      ].filter(Boolean);
      return details.join("\n");
    }),
  ].join("\n\n");
}

async function listPaymentMethodsText(): Promise<string> {
  const methods = await db
    .select()
    .from(paymentMethodsTable)
    .where(eq(paymentMethodsTable.enabled, true))
    .orderBy(asc(paymentMethodsTable.name));

  if (methods.length === 0) {
    return "There are no deposit methods available right now. Please chat with staff.";
  }

  return [
    "These deposit methods are currently available:",
    "",
    ...methods.map((method, index) => `${index + 1}. ${method.name}`),
    "",
    "To start a deposit request, choose Deposit from the menu.",
  ].join("\n");
}

async function handlePaymentMethods(
  chatId: string,
  conversationId: number,
): Promise<void> {
  const methods = await db
    .select()
    .from(paymentMethodsTable)
    .where(eq(paymentMethodsTable.enabled, true))
    .orderBy(asc(paymentMethodsTable.name));

  if (methods.length === 0) {
    await sendSaved(
      chatId,
      conversationId,
      "There are no payment methods available right now. Please chat with staff.",
    );
    return;
  }

  await sendInlineSaved(
    chatId,
    conversationId,
    "Which payment method would you like information for? Choose one below:",
    methods.map((method) => [
      { text: method.name, callback_data: `payment_info_method:${method.id}` },
    ]),
  );
}

async function listBonusesText(): Promise<string> {
  const bonuses = await db
    .select()
    .from(bonusesTable)
    .where(eq(bonusesTable.enabled, true))
    .orderBy(asc(bonusesTable.name));

  if (bonuses.length === 0) {
    return "There are no active bonuses right now. Please check back soon.";
  }

  return [
    "Here are the current bonuses:",
    "",
    ...bonuses.map((bonus) => {
      const rules = [
        bonus.percentage != null ? `${Number(bonus.percentage)}% bonus` : null,
        bonus.minDeposit != null
          ? `minimum deposit $${Number(bonus.minDeposit).toFixed(2)}`
          : null,
      ].filter(Boolean);
      return `🎁 ${bonus.name}${rules.length ? ` — ${rules.join(", ")}` : ""}\n${bonus.description ?? ""}`.trim();
    }),
  ].join("\n\n");
}

async function listFaqsText(): Promise<string> {
  const faqs = await db
    .select()
    .from(faqsTable)
    .orderBy(asc(faqsTable.category), asc(faqsTable.id));

  if (faqs.length === 0) {
    return "There are no FAQs configured yet. Please chat with staff for help.";
  }

  return [
    "Here are the most common questions:",
    "",
    ...faqs.map((faq) => `❓ ${faq.question}\n${faq.answer}`),
  ].join("\n\n");
}

async function handleGameAccount(
  chatId: string,
  conversationId: number,
): Promise<void> {
  const games = await db
    .select()
    .from(gamesTable)
    .where(eq(gamesTable.enabled, true))
    .orderBy(asc(gamesTable.name));

  if (games.length === 0) {
    await sendSaved(
      chatId,
      conversationId,
      "There are no games available for account creation right now. Please chat with staff.",
    );
    return;
  }

  await sendInlineSaved(
    chatId,
    conversationId,
    "Which game would you like an account for? Choose one below:",
    games.map((game) => [
      { text: game.name, callback_data: `game_select:${game.id}` },
    ]),
  );
}

async function handleDeposit(
  chatId: string,
  conversationId: number,
): Promise<void> {
  const methods = await db
    .select()
    .from(paymentMethodsTable)
    .where(eq(paymentMethodsTable.enabled, true))
    .orderBy(asc(paymentMethodsTable.name));

  if (methods.length === 0) {
    await sendSaved(
      chatId,
      conversationId,
      "There are no deposit methods available right now. Please chat with staff.",
    );
    return;
  }

  await sendInlineSaved(
    chatId,
    conversationId,
    "Choose your preferred deposit method. Staff will send the payment details from the dashboard:",
    methods.map((method) => [
      { text: method.name, callback_data: `deposit_method:${method.id}` },
    ]),
  );
}

async function handleRedeem(
  chatId: string,
  conversationId: number,
): Promise<void> {
  const games = await db
    .select()
    .from(gamesTable)
    .where(eq(gamesTable.enabled, true))
    .orderBy(asc(gamesTable.name));

  if (games.length === 0) {
    await sendSaved(
      chatId,
      conversationId,
      "Please tell staff which game your redeem is for. A staff member will help you shortly.",
    );
    await db
      .update(conversationsTable)
      .set({ status: "staff_handling", updatedAt: new Date() })
      .where(eq(conversationsTable.id, conversationId));
    return;
  }

  await sendInlineSaved(
    chatId,
    conversationId,
    "Which game is your redeem for? Choose a game below and staff will handle the request:",
    games.map((game) => [
      { text: game.name, callback_data: `redeem_game:${game.id}` },
    ]),
  );
}

async function handleAction(
  chatId: string,
  action: string,
  conv: typeof conversationsTable.$inferSelect,
): Promise<void> {
  await saveConversationMessage(conv.id, `[Button] ${action}`, "customer");

  switch (action) {
    case "game_account":
    case "game_account_creation":
      await handleGameAccount(chatId, conv.id);
      return;

    case "games_list":
      await sendSaved(
        chatId,
        conv.id,
        "To create a game account, choose Game Account from the menu. To see available games, chat with staff.",
      );
      return;

    case "deposit":
      await handleDeposit(chatId, conv.id);
      return;

    case "redeem":
      await handleRedeem(chatId, conv.id);
      return;

    case "free_play":
      const [existingFreePlay] = await db
        .select()
        .from(freePlayRequestsTable)
        .where(
          and(
            eq(freePlayRequestsTable.conversationId, conv.id),
            eq(freePlayRequestsTable.status, "pending"),
          ),
        )
        .orderBy(desc(freePlayRequestsTable.createdAt))
        .limit(1);

      if (!existingFreePlay) {
        await db.insert(freePlayRequestsTable).values({
          customerName: conv.customerName,
          customerTelegramId: chatId,
          conversationId: conv.id,
          requestedAmount: null,
          status: "pending",
        });
      }

      await db
        .update(conversationsTable)
        .set({ status: "staff_handling", updatedAt: new Date() })
        .where(eq(conversationsTable.id, conv.id));

      await sendSaved(
        chatId,
        conv.id,
        existingFreePlay
          ? "Your free play request is already with staff. They will review it and message you with the result."
          : "Your free play approval request has been sent to staff. They will review it and message you with the result.",
      );
      return;

    case "bonuses":
      await sendSaved(chatId, conv.id, await listBonusesText());
      return;

    case "faqs":
      await sendSaved(chatId, conv.id, await listFaqsText());
      return;

    case "staff_chat":
    case "chat_support":
      await db
        .update(conversationsTable)
        .set({ status: "staff_handling", updatedAt: new Date() })
        .where(eq(conversationsTable.id, conv.id));
      await sendSaved(
        chatId,
        conv.id,
        "You are connected to staff. Please send your message and a team member will reply from the dashboard.",
      );
      return;

    case "payment_methods":
      await handlePaymentMethods(chatId, conv.id);
      return;

    default:
      await sendSaved(
        chatId,
        conv.id,
        "That button is not configured yet. Please choose another option or chat with staff.",
      );
  }
}

async function resolveMenuAction(text: string): Promise<string | null> {
  const normalizedText = normalize(text);
  const buttons = await getMenuButtons();
  const matchingButton = buttons.find(
    (button) => normalize(button.label) === normalizedText,
  );
  if (matchingButton) return normalizeAction(matchingButton.action);

  const aliases: Record<string, string> = {
    "game account creation": "game_account",
    "game account": "game_account",
    "games": "games_list",
    "games list": "games_list",
    "payment methods": "payment_methods",
    "chat support": "staff_chat",
    "chat support with staff": "staff_chat",
    "free play approval": "free_play",
  };
  return aliases[normalizedText] ?? null;
}

function normalizeAction(action: string): string {
  const normalizedAction = normalize(action).replace(/^\/+/, "");
  const aliases: Record<string, string> = {
    "create_account": "game_account",
    "create-game-account": "game_account",
    "game-account": "game_account",
    "list_games": "games_list",
    "game_list": "games_list",
    "make_deposit": "deposit",
    "deposit_request": "deposit",
    "make_redeem": "redeem",
    "redeem_request": "redeem",
    "request_free_play": "free_play",
    "free-play": "free_play",
    "view_bonuses": "bonuses",
    "view_faqs": "faqs",
    "staff": "staff_chat",
    "support": "staff_chat",
  };
  return aliases[normalizedAction] ?? normalizedAction;
}

async function createOrUpdateDepositFromPhoto(
  chatId: string,
  conversation: typeof conversationsTable.$inferSelect,
  fileId: string,
  caption: string,
): Promise<void> {
  const screenshotUrl = await getTelegramFileUrl(fileId);
  const [pending] = await db
    .select()
    .from(depositsTable)
    .where(
      and(
        eq(depositsTable.conversationId, conversation.id),
        eq(depositsTable.status, "pending"),
      ),
    )
    .orderBy(desc(depositsTable.createdAt))
    .limit(1);

  if (pending) {
    await db
      .update(depositsTable)
      .set({
        screenshotUrl: screenshotUrl ?? fileId,
        ...(caption ? { details: caption } : {}),
        updatedAt: new Date(),
      })
      .where(eq(depositsTable.id, pending.id));
  } else {
    await db.insert(depositsTable).values({
      customerName: conversation.customerName,
      customerTelegramId: chatId,
      conversationId: conversation.id,
      screenshotUrl: screenshotUrl ?? fileId,
      details: caption || null,
      status: "pending",
    });
  }

  await db
    .update(conversationsTable)
    .set({ status: "staff_handling", updatedAt: new Date() })
    .where(eq(conversationsTable.id, conversation.id));

  const reply = caption
    ? "Thanks — I received your payment screenshot and sent it to staff for verification. They will review it shortly."
    : "Thanks — I received your payment screenshot and sent it to staff for verification. They will review it shortly.";
  await sendSaved(chatId, conversation.id, reply);
}

async function handlePendingDepositAmount(
  chatId: string,
  conversation: typeof conversationsTable.$inferSelect,
  text: string,
): Promise<boolean> {
  const normalizedAmount = text.replace(/^\$/, "").replace(/,/g, "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalizedAmount)) return false;

  const amount = Number(normalizedAmount);
  if (!Number.isFinite(amount) || amount <= 0) return false;

  const [pending] = await db
    .select()
    .from(depositsTable)
    .where(
      and(
        eq(depositsTable.conversationId, conversation.id),
        eq(depositsTable.status, "pending"),
        isNull(depositsTable.amount),
      ),
    )
    .orderBy(desc(depositsTable.createdAt))
    .limit(1);

  if (!pending) return false;

  await db
    .update(depositsTable)
    .set({ amount: normalizedAmount, updatedAt: new Date() })
    .where(eq(depositsTable.id, pending.id));

  await db
    .update(conversationsTable)
    .set({ status: "staff_handling", updatedAt: new Date() })
    .where(eq(conversationsTable.id, conversation.id));

  await sendSaved(
    chatId,
    conversation.id,
    `Your $${amount.toFixed(2)}${pending.paymentMethod ? ` ${pending.paymentMethod}` : ""} deposit request has been sent to staff. They will review it from the dashboard. After you pay, send your screenshot in this chat.`,
  );
  return true;
}

router.post("/bot/webhook", async (req, res): Promise<void> => {
  const update: TelegramUpdate = req.body;

  // Acknowledge Telegram only after the update has been fully processed. Returning
  // success early can make Telegram discard an update when a database/API step fails.
  try {
    logger.info(
      {
        updateId: update.update_id,
        kind: update.callback_query
          ? "callback"
          : update.message
            ? "message"
            : "other",
        telegramId: String(
          update.message?.chat?.id ?? update.callback_query?.from?.id ?? "",
        ),
      },
      "Telegram update received",
    );

    if (update.callback_query) {
      const callback = update.callback_query;
      await answerTelegramCallbackQuery(callback.id);
      const chatId = String(
        callback.message?.chat.id ?? callback.from.id,
      );
      const customerName = [callback.from.first_name, callback.from.last_name]
        .filter(Boolean)
        .join(" ");
      const conversation = await getOrCreateConversation(chatId, customerName);
      const data = callback.data ?? "";

      if (data.startsWith("game_select:")) {
        const gameId = Number(data.split(":")[1]);
        const [game] = await db
          .select()
          .from(gamesTable)
          .where(
            and(eq(gamesTable.id, gameId), eq(gamesTable.enabled, true)),
          );
        if (!game) {
          await sendSaved(
            chatId,
            conversation.id,
            "That game is no longer available. Please choose Game Account again.",
          );
        } else {
          await saveConversationMessage(
            conversation.id,
            `[Button] ${game.name}`,
            "customer",
          );
          const [existingPending] = await db
            .select()
            .from(gameAccountRequestsTable)
            .where(
              and(
                eq(gameAccountRequestsTable.conversationId, conversation.id),
                eq(gameAccountRequestsTable.gameId, game.id),
                eq(gameAccountRequestsTable.status, "pending"),
              ),
            )
            .limit(1);

          if (!existingPending) {
            await db.insert(gameAccountRequestsTable).values({
              customerName: conversation.customerName,
              customerTelegramId: chatId,
              conversationId: conversation.id,
              gameId: game.id,
              gameName: game.name,
              gameLink: game.link,
              status: "pending",
            });
          }

          await db
            .update(conversationsTable)
            .set({ status: "staff_handling", updatedAt: new Date() })
            .where(eq(conversationsTable.id, conversation.id));

          await sendSaved(
            chatId,
            conversation.id,
            existingPending
              ? `Your ${game.name} account request is already with staff. They will send the username, password, and game link here when it is ready.`
              : `Your ${game.name} account request has been sent to staff. They will add the username, password, and game link in the dashboard and send the details here when it is ready.`,
          );
        }
        res.status(200).json({ ok: true });
      return;
      }

      if (data.startsWith("deposit_method:")) {
        const methodId = Number(data.split(":")[1]);
        const [method] = await db
          .select()
          .from(paymentMethodsTable)
          .where(
            and(
              eq(paymentMethodsTable.id, methodId),
              eq(paymentMethodsTable.enabled, true),
            ),
          );
        if (!method) {
          await sendSaved(
            chatId,
            conversation.id,
            "That payment method is no longer available. Please choose Deposit again.",
          );
        } else {
          await saveConversationMessage(
            conversation.id,
            `[Button] ${method.name}`,
            "customer",
          );
          const [existingPending] = await db
            .select()
            .from(depositsTable)
            .where(
              and(
                eq(depositsTable.conversationId, conversation.id),
                eq(depositsTable.status, "pending"),
                isNull(depositsTable.amount),
              ),
            )
            .orderBy(desc(depositsTable.createdAt))
            .limit(1);
          if (existingPending) {
            await db
              .update(depositsTable)
              .set({ paymentMethod: method.name, updatedAt: new Date() })
              .where(eq(depositsTable.id, existingPending.id));
          } else {
            await db.insert(depositsTable).values({
              customerName: conversation.customerName,
              customerTelegramId: chatId,
              conversationId: conversation.id,
              paymentMethod: method.name,
              status: "pending",
            });
          }
          await sendSaved(
            chatId,
            conversation.id,
            `You selected ${method.name}. How much would you like to deposit? Reply with the amount, for example 50. Staff will then send the payment details from the dashboard. After you pay, send your screenshot here for verification.`,
          );
        }
        res.status(200).json({ ok: true });
      return;
      }

      if (data.startsWith("redeem_game:")) {
        const gameId = Number(data.split(":")[1]);
        const [game] = await db
          .select()
          .from(gamesTable)
          .where(
            and(eq(gamesTable.id, gameId), eq(gamesTable.enabled, true)),
          );
        if (!game) {
          await sendSaved(
            chatId,
            conversation.id,
            "That game is no longer available. Please choose Redeem again.",
          );
        } else {
          await saveConversationMessage(
            conversation.id,
            `[Button] Redeem — ${game.name}`,
            "customer",
          );
          const [existingPending] = await db
            .select()
            .from(redeemsTable)
            .where(
              and(
                eq(redeemsTable.conversationId, conversation.id),
                eq(redeemsTable.gameId, game.id),
                eq(redeemsTable.status, "pending"),
              ),
            )
            .orderBy(desc(redeemsTable.createdAt))
            .limit(1);

          if (!existingPending) {
            await db.insert(redeemsTable).values({
              customerName: conversation.customerName,
              customerTelegramId: chatId,
              conversationId: conversation.id,
              gameId: game.id,
              gameName: game.name,
              status: "pending",
            });
          }

          await db
            .update(conversationsTable)
            .set({ status: "staff_handling", updatedAt: new Date() })
            .where(eq(conversationsTable.id, conversation.id));

          await sendSaved(
            chatId,
            conversation.id,
            existingPending
              ? `Your ${game.name} redeem request is already with staff. They can approve it, reject it, or ask for more information from the dashboard.`
              : `Your ${game.name} redeem request has been sent to staff. They can approve it, reject it, or ask for more information from the dashboard.`,
          );
        }
        res.status(200).json({ ok: true });
      return;
      }

      if (data.startsWith("payment_info_method:")) {
        const methodId = Number(data.split(":")[1]);
        const [method] = await db
          .select()
          .from(paymentMethodsTable)
          .where(
            and(
              eq(paymentMethodsTable.id, methodId),
              eq(paymentMethodsTable.enabled, true),
            ),
          );

        if (!method) {
          await sendSaved(
            chatId,
            conversation.id,
            "That payment method is no longer available. Please choose Payment methods again.",
          );
        } else {
          await saveConversationMessage(
            conversation.id,
            `[Button] Payment information — ${method.name}`,
            "customer",
          );

          const [existingRequest] = await db
            .select()
            .from(paymentMethodRequestsTable)
            .where(
              and(
                eq(paymentMethodRequestsTable.conversationId, conversation.id),
                eq(paymentMethodRequestsTable.paymentMethodId, method.id),
                eq(paymentMethodRequestsTable.status, "pending"),
              ),
            )
            .orderBy(desc(paymentMethodRequestsTable.createdAt))
            .limit(1);

          if (!existingRequest) {
            await db.insert(paymentMethodRequestsTable).values({
              customerName: conversation.customerName,
              customerTelegramId: chatId,
              conversationId: conversation.id,
              paymentMethodId: method.id,
              paymentMethodName: method.name,
              status: "pending",
            });
          }

          await db
            .update(conversationsTable)
            .set({ status: "staff_handling", updatedAt: new Date() })
            .where(eq(conversationsTable.id, conversation.id));

          await sendSaved(
            chatId,
            conversation.id,
            existingRequest
              ? `Your request for ${method.name} payment information is already with staff. They will send an available account tag from the dashboard.`
              : `Your request for ${method.name} payment information has been sent to staff. They will send an available account tag from the dashboard.`,
          );
        }
        res.status(200).json({ ok: true });
      return;
      }

      const action = data.startsWith("action:")
        ? data.slice("action:".length)
        : data.startsWith("custom:")
          ? data.slice("custom:".length)
          : null;
      if (action) {
        await handleAction(chatId, action, conversation);
      }
      res.status(200).json({ ok: true });
      return;
    }

    const message = update.message;
    if (!message) {
      res.status(200).json({ ok: true });
      return;
    }

    const chatId = String(message.chat.id);
    const customerName = message.from
      ? [message.from.first_name, message.from.last_name].filter(Boolean).join(" ")
      : "Customer";
    const conversation = await getOrCreateConversation(chatId, customerName);

    if (message.photo && message.photo.length > 0) {
      await saveConversationMessage(
        conversation.id,
        `[Photo] ${message.caption ?? "Payment screenshot"}`,
        "customer",
      );
      await createOrUpdateDepositFromPhoto(
        chatId,
        conversation,
        message.photo[message.photo.length - 1].file_id,
        message.caption ?? "",
      );
      res.status(200).json({ ok: true });
      return;
    }

    const text = message.text?.trim() ?? "";
    if (!text) {
      res.status(200).json({ ok: true });
      return;
    }
    await saveConversationMessage(conversation.id, text, "customer");

    if (text === "/start" || text === "/menu") {
      const menuButtons = await getMenuButtons();
      await sendMainMenu(
        chatId,
        "Welcome! I’m your friendly casino assistant. Choose an option below, or type your question and I’ll help if it’s covered by our casino information.",
        menuButtons,
      );
      await saveConversationMessage(
        conversation.id,
        "Welcome! I’m your friendly casino assistant. Choose an option below, or type your question and I’ll help if it’s covered by our casino information.",
        "bot",
      );
      res.status(200).json({ ok: true });
      return;
    }

    if (await handlePendingDepositAmount(chatId, conversation, text)) {
      res.status(200).json({ ok: true });
      return;
    }

    const action = await resolveMenuAction(text);
    if (action) {
      await handleAction(chatId, action, conversation);
      res.status(200).json({ ok: true });
      return;
    }

    if (conversation.status === "staff_handling") {
      res.status(200).json({ ok: true });
      return;
    }

    const aiReply = await getAIResponse(chatId, text);
    await sendSaved(chatId, conversation.id, aiReply);
    res.status(200).json({ ok: true });
  } catch (err) {
    logger.error({ err, updateId: update.update_id }, "Bot webhook error");
    if (!res.headersSent) {
      res.status(500).json({ ok: false });
    }
  }
});

export default router;