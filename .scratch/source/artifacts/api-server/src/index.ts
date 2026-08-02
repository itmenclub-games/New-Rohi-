import app from "./app";
import { logger } from "./lib/logger";
import { setTelegramWebhook } from "./lib/telegram";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Auto-register Telegram webhook on startup. Prefer Railway's public URL
  // in production; REPLIT_DEV_DOMAIN remains a fallback for Replit development.
  // Railway does not always expose a public-domain variable at runtime.
  // The known production domain is the safe fallback so Telegram is always
  // pointed at this service after a deployment.
  const publicUrl = process.env.RAILWAY_STATIC_URL
    ?? (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : "https://new-rohi-production.up.railway.app");

  if (publicUrl) {
    const webhookUrl = `${publicUrl.replace(/\/$/, "")}/api/bot/webhook`;
    await setTelegramWebhook(webhookUrl);
  } else {
    logger.warn("No public domain is configured — skipping Telegram webhook registration");
  }
});
