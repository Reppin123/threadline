# Market: competitors, wedge, why now

Checked 2026-10-10. Full notes with every quote and URL: [research/competitors.md](research/competitors.md).
Tags: [V] verified on the vendor's own page, [3P] third-party source only, [NV] not verifiable (not public).

## 1. The map

Four kinds of company sell into "let customers text a business". Only one kind builds the agent for you.

| Layer | Who | What the buyer still has to do |
|---|---|---|
| **A. Pipes: iMessage / SMS APIs** | Photon, Sendblue, Linq, LoopMessage, Blooio, Twilio | Write the agent, ingest the catalog, test it, host it |
| **B. Done-for-you chat agents** | Flow, Threadline | Paste a URL / API / idea |
| **C. Helpdesk AI** (widget + inbox, SMS as a ticket channel) | Gorgias, Intercom Fin, Zendesk, Siena, Tidio Lyro, Zipchat, Rep AI | Live with a widget shoppers close; SMS is a costly add-on |
| **D. SMS marketing** (one-way blasts, some AI replies) | Postscript, Attentive, Klaviyo SMS | Campaign tool, not a conversational agent; per-message billing |
| **E. WhatsApp BSPs** | Meta Cloud API, Twilio, WATI, Respond.io, AiSensy, Interakt | Template approvals, 24h window rules, build the bot; weak in the US |

## 2. Competitor pricing (from their own sites unless tagged)

### Layer B: direct competitor
| Company | Channels | Pricing | Notes |
|---|---|---|---|
| **Flow** (flow.engineer) [V] | WhatsApp, iMessage, Telegram, Slack | **Free $0** (Telegram only, base usage, mock-data prototype) · **$29/mo** (WhatsApp, iMessage, Telegram, "higher usage", extra usage billed, no published rates) · **Custom** | Two founders. Onboarding is a questionnaire, then "we come back to you by email, usually within a business day". Same pitch as ours (URL / MCP / idea, simulated users, memory, insights). Positioned at app builders in India and globally; consumer examples (courier, Lisbon hotel, salon). |

### Layer A: iMessage pipes (what a developer would build on instead of us)
| Company | Pricing | Line model |
|---|---|---|
| **Photon** (photon.codes/pricing) [V] | Free $0 up to 10 users · Pro **$25/mo** up to 100 users · Business **$250/line/mo**, unlimited users with Auto Scale, 50 new cold contacts/line/day · Enterprise custom | Free/Pro = shared pool, each user gets a different number. Business = dedicated number. Open source (MIT) SDK. **Our supplier.** |
| **Sendblue** (sendblue.com/pricing) [V] | Free sandbox (10 contacts) · **AI Agent $100/mo per dedicated line**, up to 1,000 inbound contacts/day, no per-message fees · Enterprise custom | Dedicated numbers, RCS/SMS fallback, FaceTime audio |
| **Blooio** (blooio.com/pricing) [V] | **$39 / $89 / $289 per line/mo** · **Inbound plan $98/mo** (reply-only number aimed at AI agents) · Enterprise $389 down to $195/line | Dedicated lines, iMessage + SMS/RCS + voice |
| **LoopMessage** (loopmessage.com/pricing) [V] | **$59.99/mo** (300 daily contacts) · **$99.99/mo** (1,000 daily contacts) · WhatsApp +$10/mo · SMS/RCS fallback +$15/mo | One number for iMessage, SMS/RCS, WhatsApp |
| **Linq** (linqapp.com) [NV] | "Flat monthly pricing", no per-message fees; price not public. Competitor pages estimate ~$250/mo + $500 to $1,000+ setup [3P: sendblue.com/compare/sendblue-vs-linq, blooio.com/compare/blooio-vs-linq-pricing] | Self-reported: 1,000+ teams, SOC 2 Type II (unverified) |
| **Twilio** (twilio.com/en-us/sms/pricing/us) [V] | US SMS **$0.0083/segment** + carrier fees, long code $1.15/mo; Apple Messages for Business in private beta since May 7, 2026 | Pipe only |

### Layer C: helpdesk AI (the budget we sit next to, then take share from)
| Company | AI price | Base price |
|---|---|---|
| **Gorgias** (gorgias.com/pricing) [V] | AI Agent **$0.90 to $1.00 per automated interaction**, $1.50 over allowance | Helpdesk $10 / $60 / $360 / $900 per month (monthly billing; page shows two price sets, see research). SMS ~$0.41 to $0.80 per SMS ticket [3P ringly.io] |
| **Intercom Fin** (intercom.com/pricing) [V] | **$0.99 per outcome** | Seats $29 / $85 / $132 per month; US SMS $0.01 to $0.06 per segment; outbound WhatsApp $0.07 to $0.10/msg |
| **Zendesk** (zendesk.com/pricing) [V] | **$1.50 committed / $2.00 pay-as-you-go per automated resolution** | Seats $19 to $115/mo (annual) |
| **Siena AI** (siena.cx/pricing) [V] | **$0.90 per automated ticket** | **$750/mo** platform fee |
| **Tidio Lyro** (tidio.com/pricing) [V] | from **$32.50/mo for 50 conversations** (~$0.65 each) | |
| **Zipchat** (zipchat.ai/pricing) [V] | **$80 to $1,200/mo** for 750 to 14,000 AI replies | Shopify-focused |

### Layer D: SMS marketing (where Shopify brands already spend on texting)
| Company | Pricing |
|---|---|
| **Postscript** (postscript.io/pricing) [V] | Plans $0 / $100 / $500 per month, SMS **$0.009 / $0.008 / $0.007** per message + ~$0.0033 carrier fee; **AI Plan with "Shopper" sales agent $699/mo** |
| **Attentive** [NV] | Not public (sales-led, annual contracts) |
| **Klaviyo SMS** | Bundled credits per Klaviyo plan |

### Layer E: WhatsApp
| Provider | Pricing |
|---|---|
| **Meta WhatsApp Business Platform** | Per-message pricing since July 1, 2025. US marketing ~**$0.025**, utility/authentication ~**$0.0034** [3P: zernio.com, dragapp.com; Meta's official rate card is a download]. Marketing messages to US numbers reported paused since April 1, 2025 [3P: Zoho, WATI]. Whether US service replies stay free after Oct 1, 2026 is unresolved (Meta page says free; one 3P source says $0.0034). |
| **Twilio WhatsApp** [V] | +$0.005/message on top of Meta fees |
| **Respond.io** [V] | $79 / $159 / $279 per month (yearly billing) |
| **WATI, AiSensy, Interakt** | Mostly India/LatAm/MEA focused; WATI and AiSensy plans from third parties only (see research) |

## 3. Our wedge

**Shopify DTC brands in the US that already pay for a helpdesk or SMS tool, sold a texting agent that is built and tested from
their URL before they ever talk to us, at a price that matches Flow and is 5x to 10x under helpdesk AI per conversation.**

Why this wedge and not the others:
1. **iMessage only matters in the US.** iPhone was 75% of smartphone sales at the Big 3 US carriers in Q1 2026 (Counterpoint).
   Flow's examples are India and Europe; WhatsApp BSPs are weak in the US. The US is where an iMessage-first product is a real
   edge, not a novelty.
2. **The buyer already has a texting budget and a question problem.** Postscript charges per message for one-way blasts; Gorgias
   charges ~$1 per AI interaction in a widget. A store paying either has proven it values the channel and the automation.
3. **Shopify stores are machine-readable.** `/products.json`, JSON-LD and policies pages mean our crawler builds a correct bot
   with no owner input. That is what makes the demo-first outbound in [OUTBOUND.md](OUTBOUND.md) possible at $0.45 a store.
4. **Against Flow**, we are self-serve and instant (Flow emails back within a business day), US/iMessage-first, and we show the
   test results before deploy. Against pipes (Sendblue, Blooio, LoopMessage), we are the agent, not the wire. Against
   helpdesk AI, we live in the customer's Messages app, and we hand off into their existing Gorgias/Zendesk inbox rather than replacing it.
5. **Against Postscript Shopper ($699/mo)**: same idea (an AI sales agent in texts) at $29 to $149, plus iMessage, Telegram and an
   API. This is the closest substitute a wedge buyer will compare us to.

What we must not claim: a "dedicated business number" on Starter (shared pool means each customer may see a different number;
dedicated is the $399 add-on), or Apple Messages for Business (that is Apple's separate approved-MSP program, not what we use).

## 4. Why now (sourced)

1. **The US is an iPhone market and getting more so.** iPhone 75% of Big 3 carrier smartphone sales in Q1 2026, up from 72%, while
   the overall market fell 5.7% (counterpointresearch.com, Q1 2026; 9to5mac.com 2026-05-13). Installed base ~57% iOS (Twilio).
2. **iMessage became programmable for small teams.** Photon open-sourced Spectrum (MIT) with managed lines from $0 to $250/mo;
   Sendblue, Blooio and LoopMessage sell lines at $60 to $290/mo. Two years ago this meant a Mac farm.
3. **RCS ended the green-bubble dead end.** iOS 18.1 (Oct 2024) brought RCS business messaging to iPhone; Google reported
   1B+ RCS messages/day in the US by May 2025 (blog.google). Every text channel is now rich, so the agent matters more than the pipe.
4. **Shoppers want to text.** 86% of US consumers have opted in to business texts, up from 62% in 2021 (SimpleTexting, Jan 2026,
   via marketingprofs.com); texting is the preferred channel for 90% of message types (EZ Texting 2026). Automated SMS flows
   average ~10% click rate (Klaviyo 2026 benchmarks), and flows earn 45% of SMS revenue on 7.6% of sends.
5. **AI agents can now act, not just answer.** Gartner predicts agentic AI will resolve 80% of common customer-service issues
   by 2029 (press release 2025-03-05). Intercom's 2026 report: 82% of CX leaders invested in AI in the last year but only 10% call
   their deployment mature, so the buyers are spending and still shopping.
6. **Helpdesk AI pricing set a high anchor.** $0.90 to $2.00 per resolution (Gorgias, Fin, Zendesk) leaves room for a $0.10 to
   $0.15 per-conversation product with healthy margin (see [PRICING.md](PRICING.md)).

## 5. Risks we price in

| Risk | Impact | Mitigation |
|---|---|---|
| **iOS 26 "Screen Unknown Senders"** filters texts from numbers not in contacts (bandwidth.com, twilio.com). Our shared-pool flow has the bot text first from a number the customer has never seen. | First message may land silently in the Unknown Senders list | Share page tells the customer to expect the text and offers a contact card download; the customer's first reply moves the thread to the main inbox; dedicated number add-on with Business contact card; Telegram as fallback |
| Photon is a single supplier (and shared-pool caps: 10 users Free, 100 Pro) | Outage or price change hits every bot | Telegram/WhatsApp diversify; Sendblue ($100/line) and Blooio ($98 inbound) are drop-in alternatives behind the gateway transport interface |
| Apple policy on automated iMessage | Lines banned | Legal agent owns the policy review (launch/legal/); opt-in only, no cold texting to consumers |
| Flow ships self-serve + US focus | Price war at $29 | Win on build-from-URL in minutes, tested releases, Shopify-specific features (order lookup, helpdesk handoff, app store listing) |
| Postscript/Attentive add iMessage | Incumbent distribution | They sell blasts; we sell conversations. Integrate (handoff, consent sync) rather than fight |
