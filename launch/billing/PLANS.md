# Threadline plans, limits and unit economics (billing)

Owner: billing agent. Pricing decision: gtm, 2026-10-10 (`launch/gtm/PRICING.md` §1 and §3, COORDINATION.md). This file is how
that decision is **enforced in code**, plus a recheck of cost and margin that includes every Stripe fee.
Source of truth in code: `PLANS` / `ADDONS` in `packages/core/src/billing.ts`. A test (`billing-test.ts`, "plan table matches gtm PRICING.md §3")
fails if the code and gtm's JSON drift apart.

## 1. Plans

| | Free | Starter | Growth | Scale |
|---|---|---|---|---|
| Price | $0 | $29/mo, or $288/yr ($24/mo) | $149/mo, or $1,488/yr ($124/mo) | from $599/mo, contract |
| Conversations included / month | 50 | 300 | 1,500 | 6,000+ |
| Past the included amount | hard stop: "at capacity" reply, team takes over | $0.15 each (monthly plans) | $0.10 each (monthly plans) | $0.08 each, invoiced by hand |
| Bots | 1 | 1 (+$19/mo each extra) | 3 (+$19/mo each extra) | unlimited |
| Channels for customers | Telegram | iMessage (shared Threadline numbers), Telegram | + WhatsApp when it ships | all + dedicated iMessage number |
| iMessage | only the owner + 5 test phones per bot, never counted | yes | yes | yes |
| Public API + keys | no | yes | yes | yes |
| How it's bought | sign up | Stripe Checkout | Stripe Checkout | sales; set `users.plan='scale'` by hand |

Add-ons (Stripe prices exist, sold by email for now): extra bot $19/mo, dedicated iMessage number $399/mo (Growth; included in Scale).

### What counts (the meter)
A **conversation** is one customer's thread with one bot on one channel that got at least one bot reply. A new one starts
after 6 hours of silence, using the same rule (and the same rows) as core's `openConversation`. Counted once, by conversation id,
in `billed_conversations`. Bot-initiated messages (API check-ins, "text me my bot" invites) open or continue a conversation the
same way. Never counted: the dashboard playground, simulated-customer checks, Free-plan iMessage test phones, the web preview.
Allowances reset at 00:00 UTC on the 1st of each month (calendar month, not the Stripe billing date).

### Decisions made while implementing (also in COORDINATION.md)
1. **Yearly plans stop at the included conversations** instead of billing overage. Stripe Checkout can't create a subscription that
   mixes a yearly price with a monthly metered price ("You currently can't create mixed interval subscriptions on Checkout Sessions",
   docs.stripe.com/billing/subscriptions/mixed-interval), and billing a year of overage at renewal is a bad-debt risk.
   Monthly plans get the metered overage item. Overage is only ever allowed when it can be billed (subscription has the metered item, or Scale).
2. **A customer mid-conversation is never cut off.** When the allowance runs out, only NEW conversations get the "at capacity" reply
   (once per customer per day); open threads keep being answered until they go quiet for 6 hours.
3. **Free iMessage test phones** = the first 5 iMessage contacts bound to that bot (owner invites or "start <code>"). A 6th gets
   "isn't available on this app right now". This is gtm's "iMessage to the owner + 5 test phones".
4. **Starter and Growth switch in place** (`/api/billing/change`, prorated). The Customer Portal is used for card, invoices, tax ids
   and cancel (at period end); it can't update subscriptions that carry a metered item next to the base price.
5. **Scale is never touched by Stripe events** (contracted, set by hand). Old placeholder names map: `pro` → Starter, `business` → Scale.
6. **`BILLING_DEFAULT_PLAN`** (env) lifts every account below that plan, e.g. `starter` for a pilot or the current demo deployment.
   It never lowers a paid plan, and it doesn't enable overage (nothing to bill).

### Not enforced by billing (product follow-ups, listed for whoever owns them)
Check depth per plan (quick vs full suite), recrawl frequency, "Powered by Threadline" sign-off removal, helpdesk handoff,
SSO. They're on the Billing page as plan features; core/web would gate them by reading `billing.planOf(userId)`.

## 2. Cost per message and per conversation

Prices: claude-sonnet-5-5 $2 / $10 per million input / output tokens, claude-haiku-5-5 $0.10 / $0.50 (Anthropic API price list, Oct 2026;
same numbers as `PRICES` in `packages/core/src/llm.ts`). Photon: photon.codes/pricing (research/photon/pricing.txt).
Stripe: stripe.com/pricing (card 2.9% + 30c), stripe.com/billing/pricing (Billing 0.7% of billing volume),
stripe.com/tax/pricing (Tax 0.5% per transaction where registered, Checkout integration).

| Line | Cost | Basis |
|---|---|---|
| One bot reply (LLM) | **$0.011** | Measured $0.0086 avg per answering call (3,783 in / 199 out tokens, data/threadline.db `usage`, Oct 7); $0.011 = gtm's planning number (the measured tests avg) to cover tool loops and growing memory |
| One iMessage/Telegram message sent | **$0.00 marginal** | Photon plans have unlimited daily messages; Telegram Bot API is free. The iMessage cost is the fixed line fee below |
| Memory + topic tagging per conversation (Haiku 5.5) | $0.0005 | ~4k in / 200 out. (gtm's sheet says $0.004, which is Haiku 4.5 pricing; Haiku 5.5 is 10x cheaper) |
| Replies per conversation | 4 | gtm assumption; measured 1.6 on mostly synthetic traffic |
| LLM per conversation | **$0.045** | 4 × $0.011 + $0.0005 |
| Hosting per conversation | $0.007 | gtm estimate (~$140/mo infra at 20k conversations) |
| iMessage line share | $0.0125 | Photon Business $250/line/mo ÷ 20,000 conversations per line (gtm assumption). Early on this is a fixed $250/mo, see §4 |
| **COGS per conversation** | **$0.064** iMessage, **$0.052** Telegram | |

## 3. Margin per plan (all Stripe fees included)

Stripe fees per invoice: Starter $29 → $0.84 + $0.30 card + $0.20 Billing + $0.15 Tax = **$1.49**.
Growth $149 → $4.32 + $0.30 + $1.04 + $0.75 = **$6.41**. (gtm's sheet counted only the card fee: $1.14 / $4.62.)
Yearly plans pay the same percentages once on the annual invoice ($288 → $12.11, $1,488 → $61.31), shown per month below.
Checks per release: quick $0.35, full suite $1.63 (gtm, measured).

Worst case, every included conversation used, all on iMessage:

| Plan | Revenue | Stripe | COGS | Checks | Gross profit | Margin |
|---|---|---|---|---|---|---|
| Free | $0 | $0 | 50 × $0.052 = $2.60 | $0.45 once | -$3.05 | acquisition cost |
| Starter monthly | $29.00 | $1.49 | 300 × $0.064 = $19.20 | $0.35 | **$7.96** | **27%** |
| Starter yearly ($24/mo) | $24.00 | $1.01 | $19.20 | $0.35 | **$3.44** | **14%** |
| Growth monthly | $149.00 | $6.41 | 1,500 × $0.064 = $96.00 | $1.63 | **$44.96** | **30%** |
| Growth yearly ($124/mo) | $124.00 | $5.11 | $96.00 | $1.63 | **$21.26** | **17%** |
| Overage, Starter | $0.15 | $0.006 | $0.064 | | $0.080 | 53% |
| Overage, Growth | $0.10 | $0.004 | $0.064 | | $0.032 | 32% |
| Extra bot | $19.00 | $1.08 | ~$0.45 onboarding | | $17.47 | 92% |
| Dedicated number | $399.00 | $16.66 | $250 line | | $132.34 | 33% |

Typical usage (gtm assumption, unmeasured: 40% of included conversations):

| Plan | COGS + fees + checks | Gross profit | Margin |
|---|---|---|---|
| Starter monthly | 120 × $0.064 + $1.49 + $0.35 = $9.52 | $19.48 | **67%** |
| Growth monthly | 600 × $0.064 + $6.41 + $1.63 = $46.44 | $102.56 | **69%** |

Every plan stays positive in the worst case. Yearly plans are thinnest (14 to 17% at full use); that's acceptable because yearly
plans hard-stop at the included amount. If prompt caching on the static system prompt halves LLM cost per reply (gtm lever 1, an estimate to measure), COGS drops to
~$0.042 per iMessage conversation and Starter monthly's worst case rises to about 50%.

## 4. Photon is a fixed cost with hard caps (the real constraint)

| Photon plan | Cost | Cap that bites | What it means for us |
|---|---|---|---|
| Free (today) | $0 | **10 end users total**, allowlisted, across ALL our customers | Fine for the owner + test phones of a handful of Free bots only |
| Pro | $25/mo | **100 end users total** across all customers | Breaks at the 1st Starter customer with real traffic (300 conversations) |
| Business | $250/line/mo | 50 *new* contacts per line per day for bot-texts-first (cold) starts; unlimited users needs Auto Scale | Needed before selling Starter. One line can be the shared Threadline number for many Starter brands |

So iMessage COGS is really **$250/mo per line, fixed**. First line break-even: 12 Starter or 3 Growth customers at typical usage
(gross profit before any line cost: Starter ~$21, Growth ~$110 a month). Each line also caps bot-initiated invites at 50 new people a day
across every brand on it, so busy Starter brands that rely on "text me" invites will need a second line sooner than the
20,000-conversation assumption suggests.

## 5. Where it lives

| Piece | Path |
|---|---|
| Plans, meter, gates | `packages/core/src/billing.ts` |
| Stripe (fetch, no SDK): checkout, portal, plan change, webhooks, overage meter events, catalog setup | `packages/core/src/billing-stripe.ts`, `billing-setup.ts` |
| Schema | `packages/db/migrations/0004_billing_subscriptions.sql` |
| Gateway enforcement (inbound + scheduled sends) | `apps/gateway/src/gateway.ts` (chatTurn), `apps/gateway/src/outbound.ts` (deliver) |
| Web | `/billing` page, `/api/billing/{checkout,portal,change}`, `/api/stripe/webhook`, banner in `(app)/layout.tsx`, gates in `(app)/actions.ts`, `lib/api.ts`, `/api/v1/.../messages` |
| Tests | `pnpm --filter @threadline/core test:billing` (41), gateway sim (37, two billing scenarios), `node --experimental-strip-types launch/billing/scripts/e2e-web.ts` (16 steps against the built app) |
