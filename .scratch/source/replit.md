# Casino Admin Dashboard + Telegram Bot

## Project Overview

A full-stack AI-powered Telegram bot and admin dashboard for an online casino operation.

### Features
- **Telegram Bot** — Customer-facing bot with AI (Groq) responses, inline menu buttons, and escalation to live staff
- **Admin Dashboard** — React + Vite SPA for staff to manage all casino operations in real-time
- **Live Chat** — Staff can take over bot conversations and reply directly through the dashboard
- **Deposits & Redeems** — Approve, reject, and complete payment requests
- **Game Accounts** — Fulfill game account requests and send credentials via Telegram
- **Free Play** — Approve free play bonuses with custom amounts
- **Content Management** — Manage games, payment methods, bonuses, FAQs, and Telegram menu buttons
- **Settings** — Configure AI prompt, limits, and cashout windows

### Stack
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui (`artifacts/casino-dashboard`)
- **Backend**: Node.js + Express + TypeScript (`artifacts/api-server`)
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`)
- **AI**: Groq SDK (llama3-70b) with per-user conversation memory
- **Bot**: Telegram Bot API via raw fetch

### Architecture
- Monorepo managed with pnpm workspaces
- Shared packages: `lib/db`, `lib/api-spec`, `lib/api-client-react`, `lib/api-zod`
- OpenAPI spec drives code generation for typed React Query hooks and Zod schemas
- Telegram webhook auto-registers on API server startup using `REPLIT_DEV_DOMAIN`

### Environment Secrets
- `TELEGRAM_BOT_TOKEN` — Telegram bot token (required for bot to work)
- `SESSION_SECRET` — Express session secret
- `GROQ_API_KEY` — Groq AI API key (optional; can also be set via Settings page in dashboard)

### Workflows
- `artifacts/casino-dashboard: web` — Frontend dev server
- `artifacts/api-server: API Server` — Backend API + Telegram bot webhook

## User Preferences
- Minimize Replit credit usage — avoid subagents when possible
- Use dark theme by default for the admin dashboard
