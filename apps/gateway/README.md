# @threadline/gateway

The long-running service that puts every live Threadline bot on messaging channels, built on
[Photon Spectrum](https://photon.codes/docs) (`spectrum-ts`, MIT). It receives messages, routes each customer to
the right bot, calls `core.chat()` and sends the replies back, and it delivers scheduled outbound messages.

```
customer ──iMessage/terminal──▶ Spectrum provider ──▶ app.messages / POST /spectrum/webhook
customer ──Telegram──▶ getUpdates long poll (one per bot token) ──┘
   ▶ dedupe ▶ per-sender debounce (1.2s) ▶ per-sender serial queue ▶ router (join codes → line_routes)
   ▶ core.chat() inside space.responding() (typing…) ▶ one bubble per reply, with short human-like pauses
scheduled_messages (due) ──▶ outbound worker ──▶ core.composeOutbound() if text is null ──▶ same send path
```

## Quick start (no credentials)

```bash
export PATH=/opt/homebrew/bin:$PATH
pnpm --filter @threadline/gateway dev            # tsx watch, GATEWAY_MODE=terminal (default)
pnpm --filter @threadline/gateway start          # same without watch
pnpm --filter @threadline/gateway test           # simulator: 35 end-to-end scenarios (incl. a fake Telegram Bot API), no network
```

You need a bot that is **live on iMessage** (`channels.channel='imessage' AND status='live'`); the dashboard's
Deploy step creates one. For a throwaway demo bot:

```bash
THREADLINE_DB=/tmp/tl-demo.db pnpm --filter @threadline/gateway exec tsx scripts/seed-demo.ts
# → {"botId":"bot_…","joinCode":"bakery-slz"}
THREADLINE_DB=/tmp/tl-demo.db pnpm --filter @threadline/gateway start
> start bakery-slz
> do you have croissants?
```

In a real TTY the terminal mode uses Spectrum's TUI (`@spectrum-ts/terminal` → tuichat; `Ctrl+N` opens a new chat =
a new customer). Piped/non-TTY input, or `GATEWAY_TERMINAL_UI=plain`, uses a plain stdin/stdout chat. There,
`/as <handle>` lets you act as a different customer, and Ctrl+D exits once in-flight replies are sent. If tuichat can't be
downloaded from GitHub, the gateway switches to the plain chat automatically. To use a binary you've already
downloaded, set `TUICHAT_BINARY=/path/to/tuichat`.

## Modes

| `GATEWAY_MODE` | Transport | Needs |
|---|---|---|
| `terminal` (default without creds) | `@spectrum-ts/terminal` TUI, or the built-in plain stdin/stdout provider | nothing |
| `local` | `@spectrum-ts/imessage-local`: this Mac's Messages app (`~/Library/Messages/chat.db`) | macOS, Messages signed in, **Full Disk Access** |
| `cloud` (default when creds are set) | `@spectrum-ts/imessage` (Spectrum Cloud shared line) | `PHOTON_PROJECT_ID`, `PHOTON_PROJECT_SECRET` |

Telegram runs in **every** mode alongside the above (see [Telegram](#telegram)).

With `GATEWAY_MODE` unset the gateway picks `cloud` if `SPECTRUM_PROJECT_ID`/`SECRET` (or `PHOTON_*`) are in the env, or — on macOS —
in Keychain service "Threadline Spectrum" (accounts `SPECTRUM_PROJECT_ID` / `SPECTRUM_PROJECT_SECRET`; values are never printed;
`GATEWAY_NO_KEYCHAIN=1` disables the lookup). Otherwise it runs `terminal`.

### cloud
* `GATEWAY_INGEST=stream` (default): consumes `app.messages` over Spectrum's gRPC stream. No public URL is needed.
* `GATEWAY_INGEST=webhook`: Spectrum POSTs HMAC-signed deliveries to `POST /spectrum/webhook` on port 3100.
  Requires `SPECTRUM_WEBHOOK_SECRET`. The raw body is passed to `app.webhook()`, which verifies the signature and
  rejects bad signatures with 401. Deliveries are at-least-once, so the gateway dedupes on message id.
* **Free/Pro plans use a shared number pool**: each customer may be routed through a different number and the SDK does not
  expose one fixed number (`im.phone` is the `"shared"` sentinel), so "text start <code> to <number>" only works once you set
  `IMESSAGE_LINE_HANDLE` from the Photon dashboard. The reliable path on the shared pool is business-initiated: `POST /invite`
  (below) texts the customer first and binds them to the bot; their replies then route normally.
* **Allowlist (Free/Pro):** the shared pool only messages handles registered under **Users** in app.photon.codes (max 10 on Free).
  Anything else fails with `Target not allowed for this project`; the outbound worker marks such rows failed at once (no retries).
  If a registered number is still rejected, Apple is sending iMessage from a different handle: open https://debug.photon.codes on
  the phone, and register the handle it reports. Each registered user also gets an `assignedPhoneNumber` (Spectrum API
  `GET /projects/<id>/users/`) that they can text `start <code>` to.
  `tsx scripts/send-once.ts <handle> [text]` sends one message without consuming the stream (delivery check).
* With missing or invalid credentials the gateway exits immediately (exit code 1) and prints which variable is
  missing and how to get it.

### local (this Mac)
```bash
GATEWAY_MODE=local pnpm --filter @threadline/gateway start
```
* Customers text the Apple ID or phone number signed into Messages on this Mac. Messages arrive by polling
  `chat.db`, and replies are sent through Messages.app.
* **Safety default:** this is your personal Messages account, so in local mode the gateway only replies to senders
  who text a join code, or who joined earlier. Everyone else is ignored and gets no help text.
  To change that, set `GATEWAY_QUIET_UNBOUND=0`.
* Local mode can't do typing indicators, tapbacks, or markdown. Replies are sent as plain text.
* If Full Disk Access is missing, the gateway exits and prints the fix:
  1. Open **System Settings → Privacy & Security → Full Disk Access**.
  2. Click **+** and add the app that runs the gateway (Terminal, iTerm2, Warp, VS Code, Cursor…), or the node binary
     (`/opt/homebrew/bin/node`).
  3. Turn it on, then **quit and reopen** that app. The permission only applies to new processes.
* No launchd setup is needed. Keep it running in a terminal tab with `pnpm --filter @threadline/gateway start`.
  For a supervised setup, run it under the repo's process supervisor or `while true; do pnpm --filter @threadline/gateway start; sleep 2; done`.
* `@spectrum-ts/imessage-local` is an **optionalDependency** that is loaded with a dynamic import only in local mode,
  so Linux and Docker installs use `--no-optional` and never build `better-sqlite3`.

## Telegram
Each Threadline bot can have its own Telegram bot. The owner connects it on **Deploy → Telegram**: open @BotFather, `/newbot`,
paste the token (or the whole BotFather message). The web app checks it with `getMe`, refuses a token another Threadline bot is
already using, and stores `encryptJson({token, username, tgBotId, name})` in `channels(bot_id,'telegram').config_json` with
`status='live'` and `line_handle='@username'`. Customers open `t.me/<username>` (link + QR on the Deploy page).

**Why long polling, not webhooks:** in the Cloudflare container only web :3000 is reachable from outside, so the gateway has no
public inbound URL. `getUpdates` needs none, works the same on a laptop, and has no per-bot registration step that can drift.
Spectrum's Telegram provider receives updates through Fusor webhooks (Photon credentials + registration per token), so the gateway
talks to the Bot API directly (`src/telegram.ts`, no dependencies). Before polling it calls `deleteWebhook` (getUpdates is
refused with 409 while a webhook is set).

* **Sync without restarts:** every `GATEWAY_TELEGRAM_SYNC_MS` (5 s) the gateway reads live telegram channels and starts, stops or
  restarts (token changed) one poller per bot. Disconnecting on the Deploy page sets `status='off'` and wipes the token; polling stops
  within one sync.
* **Bad or revoked token:** `getMe`/`getUpdates` answering 401/404 stops that poller, sets the channel to `status='error'` (the Deploy
  page asks for a new token) and logs `telegram_token_rejected`. No restart loop.
* **Messages:** private chats only (groups and other bots are ignored). Text, photos (largest size), documents, voice, audio and
  video are downloaded via `getFile` and passed as attachments (caption → text); locations/venues → `location`; contacts → text.
  `/start` (incl. deep-link payloads) sends the bot profile's greeting without calling core. The customer handle is the chat id and
  the Telegram name is passed as `customerName`.
* **Same pipeline as iMessage:** dedupe, debounce, the per-chat serial queue, `core.chat` with `channel: "telegram"`, one
  `sendMessage` per reply bubble, retries and events. `sendChatAction typing` is refreshed every 4 s while core thinks.
  Replies go out as plain text (light markdown stripped, so no MarkdownV2 escaping issues) and are split at 4096 chars.
* **429:** every Bot API call waits `retry_after` and retries (up to 5×). Network errors back off 1 s → 30 s. One bad update is
  logged as `gateway_error` and never stops the loop.
* **Outbound:** `scheduled_messages` with `channel='telegram'` are delivered by the outbound worker through the bot's own token.
* **One poller per token:** don't connect the same token to two running gateways (local + Cloudflare); Telegram lets only one
  `getUpdates` consumer win (409), and the gateway just keeps retrying.
* Tests: `scripts/fake-telegram.ts` is an in-process fake Bot API. The simulator covers /start, message → reply, burst ordering, 429,
  attachments/locations, two bots with the same customer, scheduled sends, bad/revoked token and disconnect.
  Full stack (web + gateway + headless Chrome, temp DB, fake API):
  `pnpm --filter @threadline/gateway exec tsx ../web/scripts/telegram-e2e.ts`.

## Routing on one shared line
All bots share one iMessage line, and customers pick a bot with its join code (`bots.join_code`, e.g. `bakery-7k2`):

| Customer texts | Result |
|---|---|
| `start bakery-7k2`, `Start  BAKERY 7K2`, `join bakery-7k2`, or just `bakery-7k2` | binds sender → bot (`line_routes`) and sends the bot's greeting |
| `start bakery-7k2 do you have croissants?` | binds, greets, and answers the question |
| `switch tea-9xp` (or any other code) | rebinds to another bot |
| `stop` | unbinds |
| anything, while unbound | short help text explaining `start <code>` (not in local mode) |
| an unknown code | "couldn't find an assistant with the code …" (a bound customer's `start over` goes to their bot as normal text) |

* A bot is routable only while `channels(channel='imessage', status='live')`. Routing reads the DB on every message,
  so a newly deployed bot works right away and a bot taken offline stops getting messages. When that happens, its
  customers are told and unbound.
* In terminal mode, routes are stored with `line_routes.channel='terminal'` and conversations with `channel='terminal'`.
  The terminal stands in for the shared iMessage line, so the same live-on-iMessage bots are routable there.

## Message handling
* **Debounce:** messages from one sender that arrive within `GATEWAY_DEBOUNCE_MS` (1200) of each other become one turn.
  For example, "hi" followed by "need to move my cut" is one `core.chat` call with the texts joined by `\n`.
* **Ordering:** each sender has a serial queue, so a slow turn never reorders replies. Different senders run in parallel.
* **Replies:** each `ChatResult.replies[i]` is sent as its own bubble. Between bubbles the gateway shows a typing
  indicator and pauses for `min(2.2s, 350ms + 12ms × length)`; `GATEWAY_BUBBLE_DELAY_SCALE` scales or disables the pause.
  Bubbles are sent as `markdown()` on iMessage cloud and Telegram, and as plain text elsewhere.
* **Typing:** `core.chat` runs inside `space.responding()`.
* **Attachments and voice notes** are downloaded to `data/media/YYYY-MM/` (or `GATEWAY_MEDIA_DIR`) and passed as
  `attachments: [{path, mime, name}]`.
* **Shared locations:** Apple Maps and Google Maps links are passed as `location`.
* Reactions/tapbacks, read receipts, edits, and unsends are ignored. So are outbound echoes.
* **Retries:** each send is tried `GATEWAY_MAX_SEND_ATTEMPTS` (3) times, backing off from `GATEWAY_RETRY_BASE_MS` (500ms).
  `core.chat` is tried twice. If it still fails, the customer gets a short apology.
* A bad message never takes down the process: everything is caught and logged to `events` as `gateway_error`.
* **Events written:** `message_in` / `message_out` (`data.source="gateway"`), `route_bind`, `route_switch`, `route_stop`,
  `scheduled_sent`, `scheduled_failed`, `gateway_error`, and `gateway_heartbeat` (every `GATEWAY_HEARTBEAT_MS`, default 60s,
  containing the /health payload).

## Outbound worker (scheduled_messages)
Every `GATEWAY_OUTBOUND_POLL_MS` (3000) the worker picks rows with `status='scheduled'` and `send_at <= now`, on the
channels this gateway serves:
1. **Claim.** `UPDATE … SET status='sending' WHERE id=? AND status='scheduled'`. Only one worker or tick can win,
   which makes delivery exactly-once. `UNIQUE(bot_id, idempotency_key)` also rejects duplicate requests.
2. **Text.** If `text` is null, call `core.composeOutbound()` and store the text, so a retry re-sends the same words.
3. **Send.** Send to the customer's handle, reusing the last conversation or opening a DM with `space.create`.
   On the shared line, the message is prefixed with `"<Bot name>: "` if the customer is currently bound to a different bot.
4. **Finish.** On success, mark the row `sent` (`sent_at`). On failure, set it back to `scheduled` with `attempts` and
   `next_attempt_at` backoff (migration `0003_gateway_outbound.sql`). Once attempts reach the maximum, mark it `failed`
   with `error`. Rows left in `sending` by a crash are marked failed after 5 minutes rather than re-sent.

## HTTP (port `GATEWAY_PORT`, default 3100)
* `GET /health`: returns 200 when at least one provider is connected and 503 otherwise. The payload:
  ```json
  { "ok": true, "mode": "terminal", "ingest": "stream",
    "providers": [{ "name": "terminal", "status": "connected", "platforms": ["stdio"] }],
    "connectedProviders": ["terminal"], "liveBots": 3, "lastMessageAt": "…", "queueDepth": 0, "scheduledDue": 0,
    "stats": { "inbound": 12, "turns": 7, "outbound": 9, "errors": 0, "sendRetries": 0, "ignored": 1,
               "scheduled": { "sent": 2, "failed": 0, "retried": 0 } },
    "startedAt": "…", "uptimeSec": 42, "lineHandle": null }
  ```
* `POST /spectrum/webhook`: Spectrum Cloud deliveries (cloud mode).
* `POST /invite` `{"botId":"<bot id or join code>","handle":"+15551234567"}` → `200 {ok, bot, handle, routeChannel}`: binds the
  phone/email to the (live) bot and sends the greeting as the first message. `400` for a bot that isn't live or a bad handle,
  `502` if the provider send fails. Only accepted from localhost without proxy headers, or with
  `Authorization: Bearer $GATEWAY_ADMIN_TOKEN` (it texts real people, so it must not be open through the tunnel).
  ```sh
  curl -XPOST localhost:3100/invite -d '{"botId":"sanitea-dyk","handle":"+15551234567"}'
  ```

## Environment variables
| Var | Default | |
|---|---|---|
| `GATEWAY_MODE` | `cloud` if creds, else `terminal` | `terminal` \| `local` \| `cloud` |
| `GATEWAY_ADMIN_TOKEN` | — | lets non-local callers use `POST /invite` |
| `GATEWAY_INGEST` | `stream` | cloud only: `stream` \| `webhook` |
| `PHOTON_PROJECT_ID`, `PHOTON_PROJECT_SECRET` | — | cloud (also accepts `SPECTRUM_PROJECT_ID/SECRET`) |
| `SPECTRUM_WEBHOOK_SECRET` | — | webhook ingest |
| `IMESSAGE_LINE_HANDLE` | — | shown in help text |
| `THREADLINE_DB` | `<repo>/data/threadline.db` | shared with web |
| `GATEWAY_PORT` / `PORT`, `GATEWAY_HOST` | `3100`, `0.0.0.0` | |
| `GATEWAY_TERMINAL_UI` | `tui` if TTY else `plain` | |
| `GATEWAY_TERMINAL_HANDLE` | `terminal-user` | plain terminal's initial customer handle |
| `GATEWAY_QUIET_UNBOUND` | `1` in local mode, else `0` | ignore unbound senders without a code |
| `GATEWAY_DEBOUNCE_MS` | `1200` | |
| `GATEWAY_BUBBLE_DELAY_SCALE` | `1` | `0` = no pauses |
| `GATEWAY_MAX_SEND_ATTEMPTS`, `GATEWAY_RETRY_BASE_MS` | `3`, `500` | |
| `GATEWAY_OUTBOUND_POLL_MS`, `GATEWAY_HEARTBEAT_MS` | `3000`, `60000` | |
| `GATEWAY_MEDIA_DIR` | `<repo>/data/media` | |
| `GATEWAY_LOG` | — | `silent` to mute gateway logs |
| `TUICHAT_BINARY` | — | pre-downloaded tuichat for the TUI |
| `GATEWAY_TELEGRAM` | on | `0` disables Telegram polling |
| `GATEWAY_TELEGRAM_SYNC_MS` | `5000` | how often live telegram channels are re-read |
| `GATEWAY_TELEGRAM_POLL_TIMEOUT` | `25` | getUpdates long-poll seconds |
| `TELEGRAM_API_BASE` | `https://api.telegram.org` | Bot API base (tests point it at the fake); also read by web |
| `THREADLINE_ENCRYPTION_KEY` / `AUTH_SECRET` | dev key | must match web's, to decrypt Telegram tokens |

LLM keys (`ANTHROPIC_API_KEY`, etc.) are read by `@threadline/core`, not by the gateway.

## Photon signup (to get real iMessage)
1. Go to **https://app.photon.codes** and sign up. Create a project. The Free plan gives a shared iMessage line for up to
   10 users, Pro ($25/mo) allows up to 100 users, and Business ($250/line/mo) gives you a dedicated number.
2. On **Free/Pro**, the shared line only messages recipients registered as **users** of your project. In the dashboard
   (or with `photon` CLI), add the phone numbers or emails that will test. Otherwise sends fail with
   `Target not allowed for this project`.
3. Copy the **Project ID** and **Secret Key** from the project's Settings, then run:
   `export PHOTON_PROJECT_ID=… PHOTON_PROJECT_SECRET=…`
4. Optional: put the line's number in `IMESSAGE_LINE_HANDLE` so help texts and the web Deploy page can show it.
5. Run `GATEWAY_MODE=cloud pnpm --filter @threadline/gateway start` and check `curl localhost:3100/health`.
6. Optional webhooks: register `https://<public-host>/spectrum/webhook` in the dashboard. Then set
   `SPECTRUM_WEBHOOK_SECRET` to the signing secret and use `GATEWAY_INGEST=webhook`.

## Deploying (cloud mode)
* Docker (build from the repo root): `docker build -f apps/gateway/Dockerfile -t threadline-gateway .`, then
  `docker run -p 3100:3100 -v tl-data:/data -e PHOTON_PROJECT_ID=… -e PHOTON_PROJECT_SECRET=… threadline-gateway`
* Render: see `render.yaml` in this folder (Docker service with a persistent `/data` disk and `/health` health check).
* Run **one** gateway instance per Photon project. Spectrum's stream should have a single consumer. The outbound
  claim is safe across instances, but routing state such as debounce buffers is in-process.

## Files
`src/main.ts` (entry) · `src/transports.ts` (Spectrum apps per mode, FDA check, Telegram poller sync) · `src/telegram.ts` (Bot API client, poller, adapters) · `src/gateway.ts`
(debounce, queue, routing, chat, bubbles, retries) · `src/router.ts` (join codes, line_routes, copy) ·
`src/outbound.ts` (scheduled_messages worker) · `src/server.ts` (/health, webhook) · `src/platforms/memory.ts`
(in-memory Spectrum platform for the simulator and plain terminal) · `scripts/simulate.ts` (tests) · `scripts/fake-telegram.ts` (fake Bot API) ·
`scripts/seed-demo.ts`.
