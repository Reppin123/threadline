# STATUS — web

## Checklist (Definition of Done)
- [ ] 1. `pnpm --filter @threadline/web build` passes; dev serves every route, no console errors
- [ ] 2. apps/web/scripts/e2e.mjs (puppeteer-core + system Chrome) all green
- [ ] 3. Works with stub core and real core (re-run e2e each loop)
- [ ] 4. Visual polish pass

## In progress
- scaffolding Next 15 app, verifying @threadline/db (node:sqlite) works under Next bundling
