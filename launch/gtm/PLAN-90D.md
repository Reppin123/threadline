# 90-day go-to-market plan

Day 1 = Monday 2026-10-12. Day 90 = Saturday 2027-01-09. One founder (Aki) plus agents. All numbers below are **targets**
(planning assumptions), except costs, which are vendor list prices checked 2026-10-10 (sources in OUTBOUND.md, PRICING.md,
INBOUND.md). Week 4 replaces these targets with measured rates where we have them.

## The funnel

```
visitors ──► signups ──► activated bots ──► live bots ──► paid
             (account)   (built + tested)   (>=1 real      (Starter / Growth)
                                             customer conv.)
outbound: contacted ──► link opened ──► texted bot ──► claimed (signup) ──► live ──► paid
```

Definitions: **activated** = bot built and passed checks; **live** = at least one conversation with a real customer (not the
owner/test phones) in the last 7 days; **paid** = active Stripe subscription.

### Day-90 targets (cumulative)

| Stage | Inbound | Outbound | Total |
|---|---|---|---|
| Visitors | 16,500 | n/a | 16,500 |
| Contacted (cold) | n/a | 1,400 | 1,400 |
| Signups | 825 | 42 (claims) | 867 |
| Activated bots | 410 (50% of signups) | 42 | 452 |
| Live bots | 120 (15% of signups) | 24 | 144 |
| **Paid** | **24** | **9** | **33** |
| **MRR** | | | **~$2,000** (24 Starter × $29 + 9 Growth × $149 = $2,037) |

Why these are believable: Show HN + Product Hunt + r/ShopifyApps account for ~4,000 of the visitors; the rest is the 18 posts,
~50 indexed pages and directories. Paid conversion of 2.9% of inbound signups by day 90 is low for a product with a free plan
because most day-60+ signups will still be in their free month.

## Week by week

| Wk | Dates | Focus | Key actions (owner) | Exit targets |
|---|---|---|---|---|
| 1 | Oct 12 to 18 | **Unblock** | Aki: choose domain (domain agent), buy 3 sending domains + 6 Workspace inboxes, start Instantly warmup (21 days → cold sends from Nov 2). Move Photon to Business ($250/line). Semrush/Ahrefs 7-day trial for real volumes. Publish posts 1 to 2. Daily X posts start. | Warmup running; real keyword volumes in INBOUND.md; Photon line live |
| 2 | Oct 19 to 25 | **Demo-first plumbing** | Product: public share page `/t/<slug>`, bulk prospect builder, claim flow, first-message alert (COORDINATION.md). Billing live in test mode. Pre-build bots for the 30 leads in sample-leads.csv; QA every transcript by hand. Posts 3 to 4. | 30 prospect bots ≥ 85% checks |
| 3 | Oct 26 to Nov 1 | **First 30, by hand** | Aki emails the 30 sample leads personally from their own inbox (Sequence A, 1 email/lead, max 10/day). Free directories (SaaSHub, AlternativeTo, Microlaunch, DevHunt, G2, Capterra). Free tool `/tools/shopper-questions` live. Posts 5 to 6. | 30 sent, 5 opened links, 2 claims, 1 live store |
| 4 | Nov 2 to 8 | **Show HN + outbound on** | **Show HN Wed Nov 4** (not Tue Nov 3, US election day). Instantly sequences on at 10/inbox/day. StoreCensus pull #1 (1,500 stores). Calculator tool live. First measured funnel review: replace target rates with real ones. | 2,000 visitors, 80 signups, 150 contacted |
| 5 | Nov 9 to 15 | **BFCM angle** | Sequence A with BFCM hook ("ready before Black Friday"). Indie Hackers post. BFCM playbook post (before Nov 15). Shopify app: start build (OAuth, products, order lookup, theme extension). | 3 paid total, 250 contacted |
| 6 | Nov 16 to 22 | **Shopify app submit** | Submit Shopify app (review runs 2 to 6+ weeks). r/ShopifyApps post (1/month, disclosed). `/compare/gorgias` + `/compare/postscript` live. Outbound at 20/inbox/day. | App submitted; 5 paid |
| 7 | Nov 23 to 29 | **BFCM: support, don't sell** | **Pause cold sends Nov 23 to Dec 1** (Black Friday Nov 27, Cyber Monday Nov 30: owners are heads-down). Watch every live bot's transcripts daily; fix failures within 24h; collect quotes and numbers from live stores. | 0 bot incidents unanswered >24h; 2 case-study quotes |
| 8 | Nov 30 to Dec 6 | **Product Hunt** | Resume outbound Dec 2 at 30/inbox/day. **Product Hunt Sat Dec 5**, 12:01am PT, with BFCM numbers from live stores. Paid directories (TAAFT $49, Uneed, Toolify if PH top 5). | PH top 5; 1,500 visitors; 120 signups; 10 paid |
| 9 | Dec 7 to 13 | **Case study + referral** | Publish first customer case study (real numbers). Launch give-a-month/get-a-month referral and "Powered by Threadline" sign-off on Free. Agency partner outreach to 30 Shopify experts. | 14 paid; 3 partners |
| 10 | Dec 14 to 20 | **Programmatic pages** | 10 `/for/<vertical>` pages with real transcripts; 5 more `/compare/` pages. Secondary ICP test: pre-build 20 med spa bots and send Sequence B (dedicated-number pitch). | 50 pages indexed; 18 paid |
| 11 | Dec 21 to 27 | **Holiday low** | Low outbound (holiday week, 10/inbox/day). Cost-per-conversation post with real numbers. Ship prompt caching (PRICING.md lever 1). | 21 paid; COGS/conv measured |
| 12 | Dec 28 to Jan 3 | **Retention** | Call every paid and live-free store; fix top 3 reasons for churn or inactivity. Annual-plan offer to monthly payers. Shopify app live (if approved). | ≤ 1 paid churn; 25 paid |
| 13 | Jan 4 to 9 | **Review + next 90** | Full funnel review vs this plan; decide: double down on outbound or inbound by CAC; secondary ICP go/no-go (med spa vs hotel); raise prices if close rate > 30%. | **33 paid, ~$2,000 MRR** |

## Weekly metrics (one dashboard, reviewed every Monday)

| Area | Metric | Source | Week-8 target |
|---|---|---|---|
| Acquisition | Visitors, by source (organic / HN / PH / Reddit / X / direct) | site analytics (production agent) | 1,500/wk |
| | Signups, signup rate | users table | 5% |
| Activation | % signups with a built bot; % passing checks ≥ 85%; median time URL → first answer | bots, test_runs | 50%; 80%; < 3 min |
| | % activated bots that go live (real customer conversation) | conversations | 30% |
| Outbound | Contacted; share-link open rate; texted-bot rate; claim rate; bounce rate; spam rate | Instantly + events | 15%; 8%; 3%; < 2%; < 0.1% |
| Revenue | New paid, MRR, ARPA, plan mix, paid churn | Stripe (test → live) | 10 paid total |
| Quality | Conversations/week across all bots; "couldn't answer" rate; handoff rate; p50 reply latency; iMessage delivery success | messages, events | < 10%; < 4s; > 98% |
| Economics | COGS per conversation (LLM + line); CAC by channel; payback | usage table, spend sheet | ≤ $0.068; ≤ $150 |

## Budget (cash, 90 days)

| Line | Month 1 | Month 2 | Month 3 | Source / note |
|---|---|---|---|---|
| Photon Business line | $250 | $250 | $250 | photon.codes/pricing |
| Google Workspace, 6 inboxes | $42 | $42 | $42 | $7/user/mo |
| Sending domains (3) | ~$36 | | | ~$12/yr each, estimate |
| Instantly Growth | $47 | $47 | $47 | instantly.ai/pricing |
| StoreCensus Professional | $99 | $99 | $99 | storecensus.com/pricing |
| Prospect pre-builds (LLM) | $50 | $450 | $450 | 30 × $1.63, then 1,000 × $0.45 |
| Free-plan builds + conversations (LLM) | $150 | $400 | $700 | 867 bots × $0.45 + live conversations × $0.068, estimate |
| Hosting (Cloudflare + Supabase) | $140 | $140 | $140 | estimate; production agent owns |
| Shopify Partner registration | $19 | | | one-time |
| Directories | | $150 | | INBOUND.md §5 |
| Keyword tool | $0 | | | 7-day free trial, cancel before billing |
| **Total** | **~$833** | **~$1,578** | **~$1,728** | **~$4,140 for 90 days** |

Against ~$2,000 MRR at day 90 the plan is cash-negative for the quarter (expected) and roughly break-even on run-rate by month 4
if paid grows ~10/month. No paid ads in this quarter: we buy data and inboxes, not clicks.

## Kill / pivot rules
- If outbound claim rate < 1% of contacted after 500 contacts (around week 6): stop pre-building for everyone; pre-build only on
  reply ("build it", Sequence B) and move budget to the Shopify app.
- If < 20% of activated bots go live by week 8: the problem is iMessage onboarding (Unknown Senders, invite flow), not demand.
  Pause acquisition and fix the share page / dedicated-number path.
- If COGS/conversation > $0.10 at week 11: ship caching and Haiku routing before adding volume.
- If Flow or Postscript ships a self-serve iMessage agent under $29: lead with tested releases and the Shopify app; do not cut price.
