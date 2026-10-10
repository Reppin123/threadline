# Pricing and unit economics

Decision date 2026-10-10. Posted to COORDINATION.md for the billing agent. Sources at the bottom; every number is either
measured in this build, quoted from a vendor page, or labelled as an assumption.

## 1. Recommended plans

| | **Free** | **Starter** | **Growth** | **Scale** |
|---|---|---|---|---|
| Price | $0 forever | **$29/mo** ($24/mo billed yearly) | **$149/mo** ($124/mo yearly) | from **$599/mo**, custom |
| Bots | 1 | 1 | 3 | unlimited |
| Customer conversations included / mo | 50 | 300 | 1,500 | 6,000+ (contracted) |
| Overage per conversation | hard stop (bot says it's at capacity and hands off) | $0.15 | $0.10 | $0.08 or contracted |
| Channels | Telegram live; iMessage to the owner + 5 test phones; web preview | iMessage (shared Threadline number pool) + Telegram | iMessage + Telegram + WhatsApp when it ships | all, plus dedicated iMessage number included |
| Build from website / API / MCP / idea | yes | yes | yes | yes |
| Simulated-customer checks per release | quick (30 cases) | quick | full suite | full suite + custom scenarios |
| Recrawl of source site | manual | weekly | daily | hourly / webhook |
| Data tables (orders, leads), memory, scheduling | yes | yes | yes | yes |
| Human handoff | email | email | email + helpdesk (Gorgias/Zendesk) | + SSO, custom |
| Public API + keys | no | yes | yes | yes |
| "Powered by Threadline" sign-off | yes | removable | removable | removable |
| Support | community | email | email, 1 business day | Slack channel, SLA |

Add-ons:
- **Dedicated iMessage number: $399/mo** per number (Photon Business is $250/line/mo). Customers can text the number first,
  and it carries the brand's contact card. Available on Growth; included in Scale.
- **Extra bot: $19/mo** on Starter/Growth.

Definition billing should meter: a **conversation** is one customer thread on one channel with at least one bot reply; a new
conversation starts after 6 hours of silence (same rule core uses to thread chats). Owner/test phones, playground and checks never count.

Why this shape:
- **Anchors on Flow** (flow.engineer): Free $0 (Telegram, base usage), Recommended $29/mo (WhatsApp, iMessage, Telegram, higher
  usage), Custom. Matching $29 removes price as an objection against the closest competitor; we win on "built and tested from a
  URL in minutes, no email-back step" rather than price.
- **Undercuts helpdesk AI by 5x to 10x per conversation.** Gorgias AI Agent charges $0.90 to $1.00 per automated interaction and
  Intercom Fin $0.99 per outcome. Our effective price is $0.10 (Growth: $149 / 1,500) to $0.10 to $0.15 overage. Those tools stay
  as the inbox we hand off to; we are a new channel, not a rip-and-replace.
- **Conversations, not messages or seats.** Brands budget per customer contact; SMS tools bill per message, which punishes the
  back-and-forth an agent needs.
- Replaces the pitch deck's "$0.50/conversation, $99 minimum" draft: a $99 floor loses the solo founder, and $0.50 is
  above what a store paying Postscript per-message rates expects. Margins below still hold.

## 2. Unit economics per bot

### Measured cost per reply (data/threadline.db `usage`, Oct 7 2026, claude-sonnet-5-5)

| Category | Calls | Avg input tokens | Avg output tokens | Avg cost |
|---|---|---|---|---|
| answering (live customer replies) | 10 | 3,783 | 199 | $0.0086 |
| tests (simulated-customer replies + judge) | 399 | 5,223 | 180 | $0.0114 |
| build (per build step) | 20 | 9,976 | 1,736 | $0.0373 |

Planning number: **$0.011 per bot reply** (the higher of the two measured averages, as live bots grow memory and tables).

### Cost per conversation

| Line | Value | Basis |
|---|---|---|
| Bot replies per conversation | 4 | Assumption. Measured 147 customer turns across 94 conversations (1.6 each) in mostly synthetic traffic; real shoppers ask follow-ups, so we plan for 4. |
| LLM | $0.044 | 4 × $0.011 |
| Memory extraction + topic tagging (claude-haiku-5-5) | $0.004 | Assumption: one Haiku call per conversation, ~4k in / 200 out |
| iMessage line share | $0.013 | Photon Business $250/line/mo ÷ ~20,000 conversations per line per month (assumption; Photon lists unlimited daily messages; cold-start limited to 50 new contacts/line/day, so a line onboards at most ~1,500 new customers a month) |
| Hosting (Cloudflare Containers + Supabase), payments 2.9% + 30c | ~$0.007 | Estimate at 20k conv/mo on ~$140/mo infra; Stripe fee is charged on the invoice, see plan margin below |
| **COGS per conversation** | **~$0.068** | |
| Telegram conversation | ~$0.055 | no line cost |

### One-time cost to onboard a bot (measured)
- Build: ~$0.10 (3 build calls at $0.037; see `usage` per bot: $0.10 to $0.17).
- Quick check, 30 cases: ~$0.35. Full suite (~132 test calls per bot measured): ~$1.52.
- Free-plan bot all-in: **~$0.45**. Growth bot with full suite: **~$1.63**. Re-run on each release: same again.

### Margin by plan at full included usage (worst case: every included conversation used)

| Plan | Revenue | Stripe fee | COGS (conv × $0.068) | Checks/recrawl | Gross margin |
|---|---|---|---|---|---|
| Free | $0 | $0 | 50 × 0.068 = $3.40 | $0.45 once | -$3.85 (acquisition cost) |
| Starter $29 | $29.00 | $1.14 | 300 × 0.068 = $20.40 | $0.35 | **$7.11 (25%)** |
| Growth $149 | $149.00 | $4.62 | 1,500 × 0.068 = $102.00 | $1.63 | **$40.75 (27%)** |
| Overage, Starter | $0.15 | | $0.068 | | 55% |
| Overage, Growth | $0.10 | | $0.068 | | 32% |
| Dedicated number $399 | $399.00 | $11.87 | $250 line | | **$137 (34%)** |

At typical usage (planning assumption, unmeasured: brands use 40% of included conversations):

| Plan | COGS | Gross margin |
|---|---|---|
| Starter | 120 × 0.068 = $8.16 + $1.14 fee | **$19.70 (68%)** |
| Growth | 600 × 0.068 = $40.80 + $4.62 fee | **$103.58 (70%)** |

Margin is positive in every case, including a fully used plan. The worst-case 25% to 27% is the floor we accept to price
against Flow; three levers raise it without touching price:
1. **Prompt caching** on the static part of the system prompt (persona, guardrails, catalog summary): cached input is billed
   at 10% of base input on Anthropic's API (see claude-api docs: prompt caching). Roughly 3k of the ~3.8k input tokens per reply are static, so
   this should cut LLM cost per reply by about half (estimate, to measure).
2. **Route simple turns to claude-haiku-5-5** (greetings, order status lookups, "thanks") and keep Sonnet for recommendations.
3. **More conversations per Photon line** as volume grows (fixed $250 cost).

With caching alone, worst-case COGS falls to about $0.048/conversation (estimate) and Growth worst case rises to ~47%.

### Photon cost staircase (what we pay as we grow)

| Our stage | Photon plan | Cost | Limit that bites |
|---|---|---|---|
| Now (hackathon) | Free | $0 | 10 users total across ALL our customers, allowlist only |
| First 5 paying brands | Pro | $25/mo | 100 end users total |
| Launch (outbound on) | Business, 1 line | $250/mo | 50 new contacts/line/day for cold starts |
| ~20 Growth brands | Business, 2 to 3 lines | $500 to $750/mo | |

Break-even on the first Business line ($250): 13 Starter or 3 Growth customers at typical-usage gross profit.

## 3. Plan limits for billing (machine-readable)

```json
{
  "free":    {"price_usd": 0,   "bots": 1, "included_conversations": 50,   "overage_usd": null, "channels": ["telegram", "imessage_test"], "checks": "quick", "api": false},
  "starter": {"price_usd": 29,  "price_usd_yearly_per_month": 24,  "bots": 1, "included_conversations": 300,  "overage_usd": 0.15, "channels": ["imessage_shared", "telegram"], "checks": "quick", "api": true},
  "growth":  {"price_usd": 149, "price_usd_yearly_per_month": 124, "bots": 3, "included_conversations": 1500, "overage_usd": 0.10, "channels": ["imessage_shared", "telegram", "whatsapp"], "checks": "full", "api": true},
  "scale":   {"price_usd": 599, "custom": true, "bots": null, "included_conversations": 6000, "overage_usd": 0.08, "channels": ["imessage_dedicated", "imessage_shared", "telegram", "whatsapp"], "checks": "full", "api": true},
  "addons":  {"dedicated_imessage_number_usd": 399, "extra_bot_usd": 19}
}
```

## Sources
- Measured: data/threadline.db `usage`, `messages` tables (queried read-only 2026-10-10), AGENTS/STATUS-core.md.
- Flow pricing: flow.engineer home page pricing section (research/flow/home.txt), re-check in research/competitors.md.
- Photon: photon.codes/pricing (research/photon/pricing.txt): Free 10 users, Pro $25/mo 100 users, Business $250/line/mo, 50 new contacts/line/day.
- Gorgias AI Agent $0.90 annual / $1.00 monthly per automated interaction: gorgias.com/pricing (checked Oct 2026, pitch appendix).
- Intercom Fin $0.99 per outcome: fin.ai/pricing (checked Oct 2026, pitch appendix).
- Stripe US card fee 2.9% + 30c: stripe.com/pricing.
- Competitor detail: [research/competitors.md](research/competitors.md).
