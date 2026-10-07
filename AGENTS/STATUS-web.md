# STATUS — web

## Checklist (Definition of Done)
- [ ] 1. `pnpm --filter @threadline/web build` passes; dev serves every route, no console errors
- [ ] 2. apps/web/scripts/e2e.mjs (puppeteer-core + system Chrome) all green
- [ ] 3. Works with stub core and real core (re-run e2e each loop)
- [ ] 4. Visual polish pass

## MVP slice (deadline 16:45)
- [x] signup via dev magic link → wizard prefilled (e2e verified 16:15)
- [x] wizard → website https://sanitea.vercel.app → createBot + build_bot job (worker claims it) (e2e verified 16:15)
- [ ] build page → builder; playground reply
- [ ] deploy: iMessage join code + QR, deploy
- [ ] gateway reply (gateway agent owns delivery)

## Notes
- Slow work goes through apps/web/lib/jobs.ts (enqueueJob; in-process fallback if no worker claims within 4s).
- apps/web/lib/db.ts wraps @threadline/db all/get to return plain objects (node:sqlite rows are null-prototype → RSC error).
- Run: `node apps/web/scripts/e2e.mjs` (env SKIP_LANDING=1 SKIP_SEO=1 to focus on the app slice).

## In progress
- e2e run against real core + worker
