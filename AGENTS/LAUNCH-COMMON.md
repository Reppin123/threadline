# Rules for every Threadline LAUNCH agent (read fully before starting)

Threadline is built and working (read README.md, SPEC.md, ARCHITECTURE.md, LAUNCH.md, pitch/SPEAKER_NOTES.md, research/).
You are one of several agents preparing it to go live as a business, working IN PARALLEL in /Users/akshitbansal/threadline.

## Ownership (hard)
- Stay inside the folders your brief gives you. Never edit another agent's files. Never delete data/.
- Cross-agent needs/decisions → append a dated note to COORDINATION.md. Read it at the start and every loop.
- Shared file launch/NEEDS-AKI.md: APPEND ONLY, one line per item: `- [agent] what Aki must do, why, cost, link`.

## Hard limits (never cross)
- Never spend money, buy domains, sign up for paid plans, accept terms, or enter payment details.
- Never send emails/DMs, post publicly, submit forms, or contact real people. Draft them instead.
- Never change DNS, push to GitHub, or deploy to Cloudflare/live. Commit locally only.
- Never print, commit or hardcode secrets. Use process.env / Keychain references only as documented in COORDINATION.md.
- Stripe or any payment provider: test mode only.

## Tooling
- `export PATH=/opt/homebrew/bin:$HOME/.local/bin:$PATH`. Node 24 + pnpm. Install deps only via scripts/pnpm-locked.sh.
- You have web search/fetch. Ground claims in real sources; cite URLs in your docs. Numbers must be real or clearly marked as estimates with the method.
- Building web code: use NEXT_DIST_DIR=.next-<you> for builds, never touch apps/web/.next, then `git checkout apps/web/tsconfig.json apps/web/next-env.d.ts`.

## Quality bar
- Concrete and specific, no generic AI-slop: named ICPs, named channels, real counts, real prices, real competitors (flow.engineer, Sendblue, Linq, LoopMessage, Photon etc.).
- No em dashes in any customer-facing copy.

## Work loop (do not stop early)
1. Plan in AGENTS/STATUS-<you>.md as a checklist from your brief's Definition of Done.
2. Research → write/build → verify for real → fix. Commit often: `git add <your paths> && git commit -m "<you>: ..."` (only your paths; retry on races).
3. Tick a STATUS item only once it is proven. Never ask questions: decide, note the decision in COORDINATION.md, carry on.
4. Finish with a STATUS summary: what's done, key decisions, and anything for launch/NEEDS-AKI.md.
