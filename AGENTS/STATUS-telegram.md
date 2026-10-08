# STATUS — telegram

## Decision
Long polling (`getUpdates`) per bot token inside the gateway, talking to the Telegram Bot API directly.
* Works the same locally and on Cloudflare: the container has no public inbound port for the gateway, and polling needs none.
* Spectrum's Telegram provider receives updates through Fusor webhooks (needs Photon creds + Photon-side registration) — an extra
  moving part per bot token and unusable in terminal/local modes. Direct Bot API = zero dependencies, fully fakeable in tests.
* The poller calls `deleteWebhook` before polling (getUpdates 409s while a webhook is set).

## Checklist (ticked only when proven by a run)
- [x] Gateway Telegram transport: per-token pollers synced from DB (no restart), encrypted config, /start greeting, text/photo/document/location,
      typing while thinking, bubbles, 4096 split, plain text, per-chat ordered queue, 429 retry_after, bad update never crashes
- [x] Revoked token → channel status 'error', poller stops
- [x] Outbound scheduled_messages channel telegram → sendMessage
- [x] Web: Deploy → Telegram card (3 steps, token form, getMe validation errors, encrypted store, t.me link + QR + Open in Telegram, disconnect)
- [x] Conversations filter shows Telegram
- [x] Simulator: fake Telegram API (no network) — /start, message→reply, burst ordering, 429 retry, bad token, disconnect
- [ ] Real bot test — no TELEGRAM_TEST_BOT_TOKEN in env or Keychain (see Needs Aki)
- [x] Deployed to Cloudflare (version 6e525091, 17:46); live / → 200, /login → 200 "Sign in · Threadline"
- [x] Docs: apps/gateway/README.md, README.md "What works today"

## Proof
- `pnpm --filter @threadline/gateway test` → 35 passed, 0 failed (real core, THREADLINE_LLM=offline) and with SIM_CORE=echo.
- `pnpm --filter @threadline/gateway exec tsx ../web/scripts/telegram-e2e.ts` → PASS (web :3010 + gateway :3110 + headless Chrome,
  temp DB, fake Bot API): 3 steps shown, malformed + 401 token errors, BotFather message pasted → encrypted row + t.me link + QR,
  gateway picks it up without restart, /start greeting, question → reply (channel telegram), Conversations shows Telegram,
  mobile layout, disconnect → token wiped + polling stops. Screenshots: apps/web/screenshots/telegram-*.png (gitignored).
- `pnpm typecheck` clean in apps/gateway and apps/web.

## Not verified
- The Telegram path on the live container end to end (that needs a real token; the Deploy page there makes real getMe calls).

## Needs Aki
- Create a bot with @BotFather and paste its token on the Deploy page
