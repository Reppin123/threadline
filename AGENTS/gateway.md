# Agent "gateway" — Photon Spectrum deployment layer (apps/gateway)

Read AGENTS/COMMON.md first. You own apps/gateway only. Study research/photon/* (spectrum-readme.md, docs-full.txt — search it with grep,
imessage-kit-readme.md, pricing.txt). Use spectrum-ts (MIT, npm) and its providers; read the real package types in node_modules
rather than guessing APIs. Docs base: https://photon.codes/docs (llms.txt index) — fetch more pages if needed.

## What to build
A long-running Node service (`pnpm --filter @threadline/gateway dev`, tsx watch) that connects every live bot to messaging channels:
1. Providers by GATEWAY_MODE:
   - cloud: Spectrum Cloud iMessage via PHOTON_PROJECT_ID/PHOTON_PROJECT_SECRET (+ telegram provider when a bot has a telegram token in
     channels.config_json). Support both the `app.messages` stream and the webhook mode (HTTP POST /spectrum/webhook on :3100 with
     SPECTRUM_WEBHOOK_SECRET) — config flag GATEWAY_INGEST=stream|webhook.
   - local: @spectrum-ts/imessage-local on this Mac (Messages DB). Detect missing Full Disk Access and print the exact fix.
   - terminal: @spectrum-ts/terminal (or your own minimal provider) for local testing with no credentials. DEFAULT.
2. Routing on ONE shared line (see SPEC.md "Routing on a shared iMessage line"): join codes ("start <code>", case/spacing tolerant, also a
   bare code), line_routes binding per sender, "switch <code>", "stop", help text for unbound senders, only bots with
   channels(channel='imessage', status='live') are routable. Picks up newly deployed bots without restart (query DB per message / short cache).
3. Message handling: inbound → core.chat({botId, channel, customerHandle: sender, text, attachments, location}) inside
   space.responding() (typing indicator) → send each reply as its own bubble with small human-like delays; markdown where supported;
   reactions/tapbacks ignored gracefully; attachments passed through (download to data/media/ if needed); per-sender serial queue so
   rapid messages are handled in order; debounce bursts (e.g. 1.2s) so "hi" + "need to move my cut" become one turn; retries with backoff;
   never crash the process on one bad message. Log message_in/message_out/errors to events.
4. Outbound worker: every few seconds deliver due scheduled_messages (status scheduled, send_at <= now): core.composeOutbound if text is null,
   send via the right provider to the customer's handle, mark sent/failed, respect idempotency.
5. Health: GET :3100/health (mode, connected providers, live bots count, last message time, queue depth); write gateway_heartbeat events.
6. Deployability: Dockerfile for cloud mode, a render.yaml (or fly.toml) example, and a launchd-free run doc for local mode
   (just `pnpm --filter @threadline/gateway start`). README in apps/gateway explaining modes, env vars, and the Photon signup steps.
7. Simulator for tests: apps/gateway/scripts/simulate.ts that feeds scripted inbound messages through the SAME routing + handler code path
   using an in-memory fake provider (no network), so it can run in CI.

## Definition of Done (verify each by running it)
1. Typecheck passes; `GATEWAY_MODE=terminal` gateway starts, and a terminal conversation works end-to-end: "start <join_code>" → bound →
   greeting → question → reply from core.chat (stub now, real core later) → rows appear in conversations/messages with channel imessage/terminal.
2. simulate.ts covers: unbound sender help, join, switch, stop, burst debounce, ordering, scheduled message delivery, idempotency,
   a provider send failure + retry. All pass. Add to package.json "test".
3. cloud mode code path compiles and fails fast with a precise message when PHOTON creds are missing (list them under "Needs Aki").
4. local mode: try it on this Mac. If Full Disk Access blocks it, document exactly what to grant and keep the code path ready.
5. /health accurate. README complete. Re-run tests each loop against the latest core (read COORDINATION.md).
