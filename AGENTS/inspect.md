# Agent "inspect" — Inspect tab (bot transparency) + smart connector onboarding

## Why (from a live Flow crawl, 2026-10-10, see research/flow/internals-2026-10-10.md)
Two gaps found by actually building a bot in Flow and clicking everything:

1. Flow has a tab, next to Test, called **Inspect** — "What the bot is made of — Read from its files":
   collapsible read-only sections for Instructions (the live system prompt), Tools, Connections, Keys and
   settings, Settings, Test questions, Saved data, Files you gave it, Updates. It's a trust/debugging
   surface that dumps the bot's real config — nothing hidden. We have none of this; today the only way to
   see a bot's actual system prompt or tool list is to read the database directly.

2. Flow's "Connect an app or server" form (used to wire a business's real API into an existing, already-
   built bot) auto-detects BOTH the protocol (Plain API / OpenAPI description / MCP server over Streamable
   HTTP) and the auth scheme (key in a header / Bearer token / user+password / key in the URL / none /
   OAuth) from just an Address + optional Key, with manual override on both, plus a "Test with a GET to
   (one harmless read)" field that validates the connection before saving. Threadline currently only
   imports tools from an OpenAPI/MCP source at BOT-CREATION time via the wizard (packages/core/src/ingest/
   openapi.ts) — there is no way to add or test a new connection to a bot that already exists.

## You own (nobody else touches these while you work)
- NEW route: `apps/web/app/(app)/bots/[id]/inspect/page.tsx` (new directory, no collision)
- NEW component(s) under `apps/web/components/app/Inspect*.tsx` (new files)
- NEW `packages/core/src/ingest/connector-detect.ts` (new file: given an address + optional key, probe it —
  try an MCP Streamable HTTP handshake first, then look for an OpenAPI/Swagger doc at common paths
  (`/openapi.json`, `/swagger.json`, the address itself), else treat as a plain API; separately detect auth
  by trying the provided key as a Bearer token, then as a header value, falling back to none — report its
  best guess plus the alternatives so the UI can show "Detected: X" with an override dropdown)
- NEW migration `packages/db/migrations/0008_bot_connections.sql` — a `bot_connections` table (id, bot_id,
  name, address, kind, auth_kind, key_encrypted, can_write, validated_at, last_error, created_at) so a bot
  can hold MULTIPLE live connections added after creation, not just the one source it was built from
- `packages/core/src/tools/http.ts` — ONLY to add a path that turns a validated `bot_connections` row into
  callable tools at runtime (reuse the existing OpenAPI-to-tools logic in ingest/openapi.ts, don't duplicate it)

Do NOT touch: `apps/web/app/(app)/bots/[id]/data/page.tsx`, `apps/web/components/app/Builder.tsx`,
`apps/worker/**`, `packages/core/src/tools/builtin.ts` — other agents own those this run.

## What "done" means (checkable)
1. `/bots/[id]/inspect` renders, read-only, pulling from existing data (no new tables needed for most of
   it): Instructions = the bot's actual rendered system prompt (same string runtime.ts sends the LLM, not a
   paraphrase); Tools = the bot's current callable tools with name + description + kind; Connections =
   channels (Telegram/WhatsApp/iMessage) status + the new bot_connections rows; Keys and settings = env-style
   key/value pairs already on the bot (if any exist today — check `credentials_json` on `bots`), each
   secret masked; Settings = web_access/languages (already columns on `bots`); Test questions = rows from
   `test_questions` with their rubric/expected text; Saved data = row counts per `bot_tables` (link through
   to Data). "Files you gave it" and "Updates" can be stubs ("None yet") if we don't have an equivalent
   concept yet — note that honestly in STATUS rather than faking content.
2. `connector-detect.ts`: given a real test target (stand up a tiny local Express server in your own test
   script serving a fake OpenAPI doc + a fake plain JSON endpoint) prove it correctly identifies both cases,
   and correctly identifies "no key provided → auth none" vs "key provided → guesses bearer first."
3. New UI: a "Connect an app or server" form inside the Inspect tab's Connections section — Address, Key
   (optional, password field), "Can change things" toggle, More options (Name, Kind dropdown defaulting to
   Detect, Signs-in-with dropdown defaulting to Detect, "Test with a GET to" field). Submitting runs
   connector-detect.ts, shows the detected kind/auth before committing, writes a validated `bot_connections`
   row, and the bot can immediately call it (prove with a real run: point it at a small real public API —
   e.g. https://api.github.com with no key — and have the bot answer a question using it in Test).
4. Typecheck passes; add a selftest case to `packages/core/src/selftest.ts` for connector-detect covering
   both protocol detection and auth detection paths.

## Notes
- Redact secrets everywhere in the UI — never render a real key value, only "•••• (set)" / "Not set."
- This tab is explicitly modeled on trust/transparency — match that tone in copy, don't over-engineer the
  visual design; function over polish for this pass.
