# STATUS — inspect (DONE, polish pass done)

## Definition of Done checklist (from AGENTS/inspect.md)
- [x] 1. /bots/[id]/inspect renders real live config, read-only, all sections — e2e: 9 sections present, prompt contains the runtime's
      "# Rules"/"# Output format", channel switch shows the iMessage style rule; screenshots in apps/web/screenshots/inspect/
- [x] 2. connector-detect.ts proven against local fake servers (node:http, not Express — no new dep): OpenAPI vs plain vs MCP, no key → none,
      key → bearer first; also header/query/basic/spec-declared-header/MCP-bearer, wrong key, overrides — connector-test.ts 21/21
- [x] 3. Connect form wired: Check shows "Detected: Plain API · No key" before saving → Save writes a validated bot_connections row + tool
      github_get → in Build → Test the bot (real Claude) called github_get and answered "GitHub shows 'torvalds' with 12 public repos. The profile
      name is Linus Torvalds." (inspect-e2e.mjs ALL PASSED, 2026-10-10, dev DB bot bot_giPyaDT0vwImIA owned by an e2e test account)
- [x] 4. Typecheck: apps/web clean; packages/core clean except src/schedule-test.ts (scheduler agent's in-progress file, not mine).
      selftest.ts +1 connector-detect step (protocol + auth + saved connection callable) — 19/19

## What was built (all files mine)
- packages/db/migrations/0008_bot_connections.sql — bot_connections (+ auth_name, spec_url, test_path, tool_count)
- packages/core/src/ingest/connector-detect.ts — detectConnector: MCP Streamable HTTP initialize first → OpenAPI/Swagger doc at the address and
  common paths → plain API. Auth detected separately: no key → none; key → spec's securityScheme if any, user:pass → basic, else bearer, then
  x-api-key/api-key/apikey header, then ?api_key/apikey/key; "confirmed" only when no-key is refused and the scheme is accepted. One validation GET
  (owner's "Test with a GET to", else the spec's first param-less GET, else the address). add/list/recheck/remove connection.
- packages/core/src/tools/http.ts (additive) — connectionTools (OpenAPI via existing specToTools; MCP via listMcpTools; plain = <name>_get
  [+ <name>_change if "Can change things"]), writeConnectionTools, syncConnectionTools; httpImpl routes tools with config.connectionId to the
  connection (auth decrypted at call time; plain paths can't leave the host; query keys redacted in dry runs).
- packages/core/src/inspect.ts — inspectBot(): Instructions = buildSystemPrompt() (the function runtime.chat uses) with per-message parts empty;
  tools with kind/connection labels; channels; connections; masked keys (credentials_json keys + connection keys); settings; test questions;
  saved data counts (customer vs test rows); pages read; versions.
- apps/web/app/(app)/bots/[id]/inspect/{page.tsx,actions.ts,inspect.css}, components/app/InspectConnect.tsx, InspectIcon.tsx,
  WsNav.tsx (+Inspect nav item after Build). Live/Draft toggle, channel toggle for the prompt, copy button.
- Polish: empty-state bot (never built/deployed) verified by screenshot; mobile 390px verified; connect form is inert until hydrated (a
  pre-hydration click used to do a native GET submit); "Not deployed yet" instead of "No unsaved changes" when there's no live version.

## Honest notes
- "Files you gave it": Threadline has no file-upload-to-bot concept; shows "None yet" + the pages it read from the site.
- "Updates": shows bot_versions (Threadline's own first build vs the owner's changes); no platform-pushed updates exist yet.
- Instructions show memories/matching pages empty, because those are filled in per message.
- OAuth sign-in is detected (spec oauth2 / MCP resource_metadata) but saving is refused: "use a key instead".
- A rebuild or rollback drops connection tools from the draft (the row stays); the UI flags it and Recheck restores them. Flagged to core in COORDINATION.

## Run commands
- export PATH=/opt/homebrew/bin:$PATH
- node --experimental-strip-types packages/core/src/connector-test.ts      # 21/21, local servers, offline LLM, /tmp/tl-inspect-test.db
- (cd packages/core && node --experimental-strip-types src/selftest.ts)   # 19/19
- (cd apps/web && npx tsc --noEmit -p .)
- APP_URL=http://localhost:3047 NEXT_DIST_DIR=.next-inspect npx next dev -p 3047   (in apps/web), then
  BASE_URL=http://localhost:3047 BOT_ID=<bot> EMAIL=<owner email> node apps/web/scripts/inspect-e2e.mjs   # real LLM; CONNECT_URL/QUESTION/EXPECT overridable

## Needs Aki
- Nothing blocking. Production: set NODE_ENV=production (private-address guard for connector checks is on only then).
