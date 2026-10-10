# Inbound: SEO, content, launches, directories, marketplaces, lead magnets, referral

Checked 2026-10-10. Raw SERP and channel research: [research/icp-inbound.md](research/icp-inbound.md) (Part B).
Inbound has one job: get a store owner to paste their URL into the builder. Every page, post and launch ends on that CTA.

## 1. SEO keyword map

Volumes: no free authoritative source was reachable (Google Trends 429, Ahrefs/Semrush need login). Tiers below are estimates
from SERP composition [EST]; get real volumes from a 7-day Semrush/Ahrefs trial in week 1 (PLAN-90D.md). Top results are from a
US web search on 2026-10-10 and must be spot-checked in Google.

| Cluster | Query | Intent | Vol. tier [EST] | Who ranks today | Our page | Priority |
|---|---|---|---|---|---|---|
| **iMessage (core)** | imessage api | dev / buyer | low-mid | Linq, Sendblue (×2) | `/imessage-api` (live) | P1 |
| | imessage for business | buyer | mid | Blooio, Sendblue, Mobile Text Alerts | `/imessage-for-business` (new) | P1 |
| | imessage chatbot | buyer | low, **winnable** | Blooio, Sendblue, topai.tools | `/imessage-chatbot` (new) | P1 |
| | imessage ai assistant for business | buyer | low | Sendblue, Bland iMessage, BotsCrew | `/imessage-api` section | P2 |
| | imessage marketing | marketer | low | Sendblue (×2), SleekFlow | blog post | P3 |
| | apple messages for business | buyer | mid | Bird (×3) | explainer post "Apple Messages for Business vs iMessage agents" | P2 |
| **Shopify / DTC (wedge)** | sms chatbot shopify | merchant | low | Shopify App Store, MageComp | `/shopify` + App Store listing | P1 |
| | ai sales agent shopify | merchant | low-mid | sista.ai, App Store, eesel | `/shopify` | P1 |
| | shopify ai chatbot | merchant | mid-high, crowded | Jotform, chat-data, Shopify Community | `/shopify` | P2 |
| | ai customer service texting | merchant | low, **winnable** | seekahost, EZ Texting, Verse | `/ai-customer-service-texting` (new) | P1 |
| | text customers ai | merchant | low | CustomerThink, eesel | same page | P2 |
| | sms ai agent | merchant | low-mid | Dialzara, Sendbird, Gorgias updates | same page | P2 |
| | conversational commerce | marketer | mid, low intent | glossaries | glossary page | P3 |
| **Alternatives (high intent)** | gorgias alternative | switcher | low-mid | Gartner, Costbench | `/compare/gorgias` | P1 |
| | postscript alternative | switcher | low | Yotpo, GetApp | `/compare/postscript` | P1 |
| | attentive alternative | switcher | low-mid | Emitrr, AlternativeTo | `/compare/attentive` | P2 |
| | sendblue alternative | dev | low | vendor pages | `/compare/sendblue` | P2 |
| | flow.engineer alternative / chatty alternative / tidio lyro alternative | switcher | low | none | `/compare/<x>` | P2 |
| **Promise** | turn website into ai agent | builder | low-mid | Kommunicate, aimdoc, Hostinger | homepage + `/website-to-ai-agent` | P1 |
| **Other channels** | telegram ai agent | builder | mid | Techloy, Klink, ChatbotKit | `/telegram-ai-agent` (live) | P2 |
| | telegram bot for business customers | buyer | mid | Sinch, HelpDesk, Respond.io | same | P3 |
| | ai agent for whatsapp / whatsapp ai agent | buyer | mid-high, crowded | Eloquent, Quickchat, YCloud | `/whatsapp-ai-agent` (live, waitlist) | P3 |
| | whatsapp chatbot shopify | merchant | mid | MageComp, LiveChatAI, App Store | `/whatsapp-ai-agent` | P3 |
| **Secondary ICPs** | med spa ai text messaging | med spa | low | Podium (×2) | `/med-spas` (after week 8) | P3 |
| | hotel ai guest messaging | hotel | low-mid | Canary, SabeeApp, HotelTechReport | `/hotels` (after week 8) | P3 |

Rules: one primary query per URL; title = query + outcome ("iMessage chatbot for your store, built from your website"); first
screen has the URL box (the builder) not a "book a demo"; FAQ block with FAQPage JSON-LD; every page links to `/imessage-api`, `/shopify` and signup.

## 2. Programmatic pages

Programmatic only where we have unique data per page, never thin doorway pages.

| Template | Pages | Unique data per page | Example |
|---|---|---|---|
| **`/for/<vertical>`** Shopify vertical pages | ~15 (tea, coffee, skincare, supplements, pet food, wine shipping states, apparel sizing, outdoor gear, candles, jewelry, baby, home goods, specialty food, bikes, cosmetics) | 10 real questions shoppers ask in that vertical, an example transcript from a bot we built on a public store in that vertical (with permission or anonymized), the tables the bot fills (e.g. Orders, Subscriptions) | `/for/tea-shops` built from the Sanitea run (11/11 checks, p50 3.8s) |
| **`/compare/<competitor>`** | 10 (Gorgias, Postscript, Attentive, Flow, Sendblue, Blooio, LoopMessage, Chatty, Tidio Lyro, Rep AI) | Their pricing pulled from MARKET.md with check date, channel table, "use both" section where we complement them | `/compare/gorgias`: "$0.90 to $1.00 per AI interaction vs $149 for 1,500 conversations" |
| **`/bots/<store>` public demo gallery** | grows with opt-in | Live bots that owners chose to make public, with a "text this bot" button | Social proof + long-tail brand queries |
| **`/integrations/<tool>`** | 6 (Shopify, Gorgias, Zendesk, Klaviyo, Telegram, OpenAPI/MCP) | What syncs, setup steps, screenshots | after each integration actually ships |

Do not ship a `/for/` or `/compare/` page whose facts we cannot back with a source or a real run.

## 3. Content calendar (12 weeks)

Posts 1 to 6 are written by the blog agent (launch/blog/, commit 37ccc3d). Topics 7 to 18 are handed to blog via COORDINATION.md.
One post a week minimum; publish Tuesday, share the same day on X and LinkedIn, repurpose into a newsletter on Thursday.

| Wk | Post | Primary query | Status |
|---|---|---|---|
| 1 | How to add an AI agent to iMessage for your business | imessage chatbot / imessage for business | written (blog) |
| 1 | iMessage vs SMS vs WhatsApp vs RCS for customer messaging | imessage vs sms for business | written (blog) |
| 2 | An AI agent for a DTC tea store: the Sanitea build | ai sales agent shopify | written (blog) |
| 2 | How we test bots on simulated customers | ai chatbot testing | written (blog) |
| 3 | A Telegram AI bot in 2 minutes | telegram ai agent | written (blog) |
| 3 | Customers would rather text you than use your app | (thought piece, social) | written (blog) |
| 4 | Gorgias AI Agent vs a texting agent: what 600 conversations cost | gorgias alternative | **handoff to blog** |
| 5 | The 10 questions every tea, coffee and skincare store answers all day (with data from our builds) | shopify customer questions | handoff |
| 6 | iOS 26 Unknown Senders: what it means for brands that text customers | ios 26 unknown senders business | handoff |
| 6 | Postscript Shopper vs Threadline: AI sales agents in texts | postscript alternative | handoff |
| 7 | Apple Messages for Business vs an iMessage agent: which one you can actually get | apple messages for business | handoff |
| 8 | How to answer SMS campaign replies at 2am without hiring | ai customer service texting | handoff |
| 9 | BFCM playbook: a texting agent for order status, shipping cutoffs and gift notes | bfcm customer service | handoff (publish before Nov 1) |
| 10 | Turn your website into an AI agent: what our crawler reads (sitemap, JSON-LD, products.json) | turn website into ai agent | handoff |
| 10 | Telegram for ecommerce outside the US | telegram bot for business customers | handoff |
| 11 | What it costs to run an AI agent per conversation (our real numbers) | ai chatbot cost per conversation | handoff |
| 12 | Med spa after-hours inquiries by text (secondary ICP test) | med spa ai text messaging | handoff |
| 12 | Monthly "build in public" metrics post (visitors, signups, bots, paid) | n/a | founder |

## 4. Launch plan

Sequenced so each launch has proof from the previous one. Nothing is posted by an agent; Aki posts.

| When | Channel | Rules that matter | Asset | Target |
|---|---|---|---|---|
| Wk 1 to 12, daily | **X build-in-public** (Aki's account) | none | 1 post/day: a real bot transcript, a metric, a failure; weekly thread with numbers | 1,000 followers by day 90 |
| Wk 4 (Tue) | **Show HN** | Must be usable now, ideally with no signup; landing pages not allowed (news.ycombinator.com/showhn.html); never ask for upvotes | "Show HN: Paste a URL, get an AI agent your customers can text on iMessage" linking to a **no-signup demo**: a public demo bot (Sanitea) on Telegram + iMessage share page, plus the builder | 2,000 visitors, 80 signups |
| Wk 5 | **Indie Hackers** | no bare links; "Show IH" with metrics + a specific ask | Post: "84 minutes from first commit to live, built by AI agents: our first 30 days of numbers" | 300 visitors |
| Wk 6 | **r/ShopifyApps** (1 promo post/month, disclosure required); r/shopify and r/ecommerce: **no promotion**, answer questions only from a 10+ day old account | verify sidebar rules by hand first | "I built a free tool that turns your store into a texting assistant, want feedback" + free tool link | 400 visitors |
| Wk 8 (Sat) | **Product Hunt** | Saturday has the lowest median score for a top-5 finish: 165 vs 235 on Thursday (Databox analysis of 4,962 launches in 2026); launch 12:01am PT; listing free; ~2 weeks prep | Gallery: build-from-URL GIF, phone screenshots, Sanitea numbers, maker comment with real metrics; free tool as the hook | Top 5 of the day, 1,500 visitors, 120 signups |
| Wk 8 to 12 | **Shopify Community forums**, **Gorgias/Postscript user groups** | value-first answers | Links to free tool and comparison pages | steady |

Show HN prerequisite: a demo that works without signup. Requested in COORDINATION.md (public share page `/t/<slug>`); fallback is
the Telegram `t.me` link of the public Sanitea bot.

## 5. Directories (one afternoon, week 3)

| Directory | Cost | Do it? |
|---|---|---|
| SaaSHub, AlternativeTo, Microlaunch, DevHunt, Indie Hackers products | free | yes, week 3 |
| G2, Capterra (free vendor profile) | free (paid tiers for leads) | yes, week 3; ask first 5 customers for reviews |
| Uneed | $14.99 to $29.99 | yes |
| Fazier | free with backlink | yes |
| Toolify | $99 to $149 | week 9 if PH lands well |
| There's An AI For That | $49 basic, $347 to $437 with newsletter | $49 basic, week 9 |
| BetaList | $129 to skip queue | no (audience is early adopters, not Shopify owners) |
| Futurepedia | $197 to $497 | no |

Directory budget: ~$80 to $230 total. Prices from orangebot.ai and saascity.io (third-party, Aug to Oct 2026).

## 6. Integrations and marketplaces

**Shopify App Store (the big one).**
- Why: App Store listings rank on Google for "sms chatbot shopify" and "ai sales agent shopify"; in the Chat category (996 apps)
  and SMS marketing (162 apps), **no listed app offers iMessage**. Top chat app Chatty (4.9, 1,876 reviews) charges $19.99 / $68.99
  / $199 for 100 / 500 / 1,000 AI conversations, so our $29 for 300 is competitive.
- Cost: Partner account free, one-time $19 registration to list publicly; revenue share 0% on first $1M lifetime, then 15%, plus
  2.9% processing on Shopify Billing (shopify.dev/docs/apps/launch/distribution/revenue-share).
- Timeline: review has run 2 to 6+ weeks in 2026 (Shopify dev community), so **submit by week 6 to be live by ~week 12**.
- Scope of v1 app: OAuth install, read products/policies via Admin API (better than crawling), order-status lookup tool,
  theme app extension with a "Text us on iMessage" button + phone capture with consent, Shopify Billing for the plans.
- List primary in Support > Chat, secondary in SMS marketing. Built for Shopify needs 50+ paid-shop installs and 5+ reviews: target month 6.

**Next integrations, in order:** Gorgias (handoff creates a ticket; listing in Gorgias app store), Klaviyo (consent + profile sync),
Zendesk (handoff), Zapier (new order/lead row → anything).

## 7. Free tools as lead magnets

| Tool | What it does | Why it converts | Effort |
|---|---|---|---|
| **"What would your customers ask?"** at `/tools/shopper-questions` | Paste a Shopify URL, get the 10 questions shoppers will ask and how well your site answers each (green/amber/red), no signup | It is the builder's first step with the result shown; CTA "Fix the reds with a bot that answers them" | low (crawler + one Haiku call, ~$0.01) |
| **Texting cost calculator** `/tools/ai-support-cost` | Inputs: monthly conversations, current tool; compares Gorgias AI, Fin, Zendesk, Postscript Shopper, Threadline | Lands on "gorgias alternative" traffic | low, static |
| **iMessage-ready check** `/tools/imessage-check` | Checks a store's FAQ/policy coverage, SMS opt-in presence, iOS share of traffic estimate | PH / HN hook | medium |
| **Public Sanitea demo bot** | Text it right now on iMessage or Telegram | Show HN requirement, proof | exists (needs share page) |

## 8. Referral loop

1. **"Powered by Threadline" sign-off** on Free-plan bots: last line of the first reply in each conversation, e.g. "(Assistant by
   Threadline, threadline link)". Every shopper conversation is an ad to other store owners who shop there.
2. **Give a month, get a month**: an owner who refers a store that goes paid gets one month of their plan free; the new store gets
   its first month free. Cost at Starter: $29 each side, against a ~$107 outbound CAC.
3. **Agency/freelancer program** (Shopify experts who build stores): 20% recurring for 12 months, a partner dashboard listing their
   clients' bots. Target 10 partners by day 90 from the Shopify Partners directory and Upwork Shopify experts.
4. **Public bot gallery** (`/bots/<store>`): opt-in, linked from the owner's dashboard ("show off your bot").

## 9. Inbound targets (feeds PLAN-90D.md)

| Metric | Day 30 | Day 60 | Day 90 |
|---|---|---|---|
| Organic + launch visitors / month | 1,500 | 6,000 | 9,000 |
| Signups / month (5% of visitors) | 75 | 300 | 450 |
| Pages indexed | 15 | 35 | 50 |
| Posts published (cumulative) | 6 | 11 | 18 |

Targets, not measurements. 5% visitor-to-signup is a planning assumption for a free tool with a URL box above the fold.
