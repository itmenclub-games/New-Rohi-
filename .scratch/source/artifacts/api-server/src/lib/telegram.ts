import { logger } from "./logger";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: { parse_mode?: "HTML" | "Markdown"; reply_markup?: object }
): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    logger.warn("TELEGRAM_BOT_TOKEN not set, skipping message send");
    return;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          ...(options?.parse_mode ? { parse_mode: options.parse_mode } : {}),
          reply_markup: options?.reply_markup,
        }),
      }
    );

    if (!response.ok) {
      const body = await response.text();
      logger.error({ chatId, status: response.status, body }, "Telegram API error");
    }
  } catch (err) {
    logger.error({ err, chatId }, "Failed to send Telegram message");
  }
}

export async function sendTelegramInlineKeyboard(
  chatId: string,
  text: string,
  buttons: Array<Array<{ text: string; callback_data: string }>>
): Promise<void> {
  await sendTelegramMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: buttons,
    },
  });
}

export async function sendTelegramReplyKeyboard(
  chatId: string,
  text: string,
  buttons: string[][],
): Promise<void> {
  await sendTelegramMessage(chatId, text, {
    reply_markup: {
      keyboard: buttons.map((row) => row.map((button) => ({ text: button }))),
      resize_keyboard: true,
      is_persistent: true,
      one_time_keyboard: false,
      input_field_placeholder: "Choose an option or ask a question",
    },
  });
}

export async function answerTelegramCallbackQuery(callbackQueryId: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    logger.warn("TELEGRAM_BOT_TOKEN not set, skipping callback acknowledgement");
    return;
  }

  try {
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: callbackQueryId }),
      },
    );
  } catch (err) {
    logger.error({ err }, "Failed to acknowledge Telegram callback query");
  }
}

export async function getTelegramFileUrl(fileId: string): Promise<string | null> {
  if (!TELEGRAM_BOT_TOKEN) {
    logger.warn("TELEGRAM_BOT_TOKEN not set, cannot resolve Telegram file");
    return null;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`,
    );
    const body = (await response.json()) as {
      ok: boolean;
      result?: { file_path?: string };
    };
    if (!body.ok || !body.result?.file_path) return null;
    return `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${body.result.file_path}`;
  } catch (err) {
    logger.error({ err }, "Failed to resolve Telegram file URL");
    return null;
  }
}

export async function setTelegramWebhook(webhookUrl: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    logger.warn("TELEGRAM_BOT_TOKEN not set, skipping webhook setup");
    return;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      }
    );

    const body = await response.json() as { ok: boolean; description?: string };
    if (body.ok) {
      logger.info({ webhookUrl }, "Telegram webhook set successfully");
    } else {
      logger.error({ body }, "Failed to set Telegram webhook");
    }
  } catch (err) {
    logger.error({ err }, "Error setting Telegram webhook");
  }
}
