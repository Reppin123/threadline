# STATUS — inspect

## Definition of Done checklist (from AGENTS/inspect.md)
- [ ] 1. /bots/[id]/inspect renders real live config, read-only, all sections
- [x] 2. connector-detect.ts proven against a local fake OpenAPI + plain JSON server (connector-test.ts 21/21)
- [ ] 3. Connect-an-app form wired, validated row created, bot can call it live (real run vs a real public API)
- [ ] 4. Typecheck + selftest coverage for connector-detect

## Plan / files (all mine)
- packages/db/migrations/0008_bot_connections.sql — bot_connections (+ auth_name, spec_url, test_path, tool_count)
- packages/core/src/ingest/connector-detect.ts — detectConnector (MCP handshake → OpenAPI doc → plain; auth detected separately), add/list/recheck/remove
- packages/core/src/tools/http.ts — additive: connectionTools / writeConnectionTools / syncConnectionTools + connection path in httpImpl
- packages/core/src/inspect.ts — inspectBot(): buildSystemPrompt() (the exact runtime function), tools, channels, connections, masked keys, settings, test questions, saved data, pages, versions
- packages/core/src/connector-test.ts — local-server proof matrix; selftest.ts +1 step; index.ts +2 export lines
- apps/web/app/(app)/bots/[id]/inspect/{page.tsx,actions.ts,inspect.css}, components/app/InspectConnect.tsx, InspectIcon.tsx, WsNav.tsx (+1 nav item)
- apps/web/scripts/inspect-e2e.mjs — headless Chrome proof

## Progress
- core + migration + tests committed (2c9e903). Web UI written, typechecks; e2e running.
