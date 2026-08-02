---
name: Casino project stack decisions
description: Non-obvious decisions made during the casino admin dashboard + Telegram bot build
---

## OpenAPI codegen quirks
- All `type: integer` changed to `type: number` in openapi.yaml — Orval v8 generates `zod.int()` for integers which is Zod v4 syntax and breaks the Zod v3 catalog
- Removed `/bot/webhook` from OpenAPI spec — caused `zod.looseObject` + name collision; route lives directly in Express

## DB schema exports
- After adding new tables to `lib/db/src/schema/`, run `pnpm run typecheck:libs` from workspace root to rebuild declarations before typechecking consumers
- Without that rebuild, all table imports from `@workspace/db` fail with "Module has no exported member"

**Why:** lib/db uses composite TypeScript project references; consumers read from `dist/` declarations, not source

## Telegram
- Webhook auto-registered at server startup in `artifacts/api-server/src/index.ts` using `REPLIT_DEV_DOMAIN`
- Sending uses raw fetch to Telegram API (not node-telegram-bot-api SDK, even though SDK is installed)
- Groq AI key loads from DB settings table first, then `GROQ_API_KEY` env var as fallback
- Main menu uses a persistent reply keyboard; database-backed selections use inline callbacks, and AI is reserved for typed questions after deterministic handlers run

**Why:** Menu actions and request creation must be reliable and must not allow AI to invent games, payment methods, bonuses, FAQs, or operational outcomes.

**How to apply:** Keep configurable Telegram button actions normalized through aliases, keep request mutations in explicit handlers, and append live database facts plus safety rules to any custom AI prompt.

- Customer request flows are deterministic and staff-controlled: deposits may be created from an amount, method, or screenshot alone, while redeems are game-only and immediately queued without an amount.

**Why:** Screenshot-only deposits must remain actionable for staff verification, and redeem customers should not be asked for an amount the business does not use.

**How to apply:** Keep payment/account delivery and request follow-up in dashboard staff actions, log outbound staff messages in Conversations, and keep incomplete deposits visible with approve/reject controls.

## Frontend
- `skeleton.tsx` had invalid syntax `function Foo(...): Type => {` — must be either `function Foo(...): Type {` or `const Foo = (...): Type => {`
- All pages were scaffolded with real content (250–360 lines each); design subagent was not needed
