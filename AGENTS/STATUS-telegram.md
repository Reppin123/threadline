# STATUS — telegram

## Decision
Long polling (`getUpdates`) per bot token inside the gateway, talking to the Telegram Bot API directly.
* Works the same locally and on Cloudflare: the container has no public inbound port for the gateway, and polling needs none.
* Spectrum's Telegram provider receives updates through Fusor webhooks (needs Photon creds + Photon-side registration) — an extra
  moving part per bot token and unusable in terminal/local modes. Direct Bot API = zero dependencies, fully fakeable in tests.
* The poller calls `deleteWebhook` before polling (getUpdates 409s while a webhook is set).

## Checklist (ticked only when proven by a run)
- [ ] Gateway Telegram transport: per-token pollers synced from DB (no restart), encrypted config, /start greeting, text/photo/document/location,
      typing while thinking, bubbles, 4096 split, plain text, per-chat ordered queue, 429 retry_after, bad update never crashes
- [ ] Revoked token → channel status 'error', poller stops
- [ ] Outbound scheduled_messages channel telegram → sendMessage
- [ ] Web: Deploy → Telegram card (3 steps, token form, getMe validation errors, encrypted store, t.me link + QR + Open in Telegram, disconnect)
- [ ] Conversations filter shows Telegram
- [ ] Simulator: fake Telegram API (no network) — /start, message→reply, burst ordering, 429 retry, bad token, disconnect
- [ ] Real bot test (needs token)
- [ ] Deployed to Cloudflare; / and /login still serve
- [ ] Docs: apps/gateway/README.md, README.md "What works today"
