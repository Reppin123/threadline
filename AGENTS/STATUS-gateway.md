# STATUS — gateway (apps/gateway)

## Plan / Definition of Done
- [ ] 1. Typecheck passes; GATEWAY_MODE=terminal end-to-end: "start <join_code>" → bound → greeting → question → core.chat reply → rows in conversations/messages
- [ ] 2. simulate.ts: unbound help, join, switch, stop, burst debounce, ordering, scheduled delivery, idempotency, send failure + retry → `pnpm --filter @threadline/gateway test`
- [ ] 3. cloud mode compiles + fails fast with precise message when PHOTON creds missing
- [ ] 4. local mode tried on this Mac (Full Disk Access check + doc)
- [ ] 5. /health accurate; README complete; tests re-run against latest core

## Log
- in progress: building src/ (config, router, handler, outbound worker, platforms, server)
