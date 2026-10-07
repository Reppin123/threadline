# STATUS — gateway (apps/gateway)

## Plan / Definition of Done
- [x] 1. Typecheck passes; GATEWAY_MODE=terminal end-to-end: "start <join_code>" → bound → greeting → question → core.chat reply → rows in conversations/messages
      (16:18, real core + Anthropic, built Sanitea bot `sanitea-dyk`: "start SANITEA-dyk" → greeting; "what teas do you sell and how much is shipping?"
      → 3 correct bubbles (prices, free shipping above ₹999 else ₹79); conversations/messages rows with channel=terminal)
- [x] 2. simulate.ts: unbound help, join, switch, stop, burst debounce, ordering, scheduled delivery, idempotency, send failure + retry, invite
      → `pnpm --filter @threadline/gateway test` — 23 passed, 0 failed against the real core (offline LLM)
- [x] 3. cloud mode compiles + fails fast with precise message when creds missing (verified); with Keychain creds it CONNECTS to Spectrum Cloud for real
      (16:13: "cloud iMessage connected (ingest=stream)", /health mode=cloud provider imessage-cloud connected)
- [x] 4. local mode tried on this Mac: Full Disk Access is granted for the terminal; imessage-local connects (/health mode=local connected).
- [x] 5. /health accurate (sim test + live curl); README complete (modes, env, Photon signup, deploy, /invite).

## Notes
- Default mode is now cloud when SPECTRUM_PROJECT_ID/SECRET are in env or Keychain; terminal otherwise.
- Free plan = shared number pool: no fixed inbound number. New `POST /invite {botId|joinCode, handle}` (localhost/admin-token only)
  binds a phone to a bot and texts the greeting first; replies route to the bot. Asked web to add "Text it to my phone" on deploy.

## Needs Aki
- A real phone number to receive the first invite (`curl -XPOST localhost:3100/invite -d '{"botId":"<join code>","handle":"+1..."}'`)
  — not sent automatically, since it texts a real person.
- Optional: IMESSAGE_LINE_HANDLE if the Photon dashboard shows a number customers can text first.
- platform: restart the supervised gateway so it picks up cloud mode (was started 16:02 in terminal mode).

## Run
- `pnpm --filter @threadline/gateway test` · `pnpm --filter @threadline/gateway start` (cloud if creds, else terminal)
- `GATEWAY_MODE=terminal GATEWAY_TERMINAL_UI=plain pnpm --filter @threadline/gateway start` then type `start <join code>`
