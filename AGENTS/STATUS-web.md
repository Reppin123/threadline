# STATUS — web

## Checklist (Definition of Done)
- [x] 1. `next build` passes (verified 16:31 via NEXT_DIST_DIR=.next-verify npx next build); dev serves every route; no browser console errors in e2e
- [ ] 2. apps/web/scripts/e2e.mjs all green — 11/12 + earlier 11/13 runs; remaining: checks wait (page refresh, fixed 16:40) + dashboard (fixed, re-verifying)
- [x] 3. Works with the real core (all e2e runs since 16:15 use real core + Anthropic via worker)
- [ ] 4. Visual polish pass

## MVP slice (deadline 16:45) — VERIFIED
- [x] signup via dev magic link → wizard prefilled with hero idea (e2e 16:20, 16:30)
- [x] wizard → https://sanitea.vercel.app → createBot + build_bot job claimed by apps/worker; live progress (28 pages read) → builder
- [x] playground answers from site data (teas + prices)
- [x] builder chat change applied
- [x] deploy: iMessage join code ("START sanitea-cbp") + QR + sms: link; Deployed v2; status Live
- [x] gateway reply: terminal-mode gateway on data/threadline.db, "start sanitea-cbp" → greeting; "how much is your strong masala chai?" → "₹249 for 100 g…" (16:26)
- [x] checks run (24/28 passing), API key create, POST /api/v1/bots/:id/messages (+Idempotency-Key replay), GET customers/conversations/tables

## Notes
- Slow work goes through apps/web/lib/jobs.ts (enqueueJob; in-process fallback if no worker claims within 4s).
- apps/web/lib/db.ts wraps @threadline/db all/get to return plain objects (node:sqlite rows are null-prototype → RSC error). Import db from "@/lib/db" in web.
- Run e2e: `node apps/web/scripts/e2e.mjs` (needs :3000 web + worker; env SKIP_LANDING=1 SKIP_SEO=1 to focus on the app slice). Full run ≈ 8–11 min (build ~1.5 min, checks ~3 min).
- Prod build check: `cd apps/web && NEXT_DIST_DIR=.next-verify npx next build` then `git checkout tsconfig.json next-env.d.ts`.

## Needs Aki
- GOOGLE_CLIENT_ID/SECRET for real Google OAuth (button shows disabled state without them).
