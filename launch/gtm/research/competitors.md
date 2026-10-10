# Threadline competitor and pricing research

All pages checked 2026-10-10 using web fetch and search only. Nothing was signed up for or submitted. All prices are USD unless marked otherwise.

Legend:
- **[V]**: verified on the vendor's own live page.
- **[3P]**: comes from third-party sources only and is not verified on the vendor's page.
- **[NV]**: could not be verified.

---

## A. Direct competitors: "your app/API as a chat agent" and iMessage rails

### 1. Flow (flow.engineer)
- **What it does:** Turns an app, an API/MCP server or a bare idea into an AI agent on chat apps ("Launch your app on WhatsApp, iMessage, or Telegram in minutes"). It is the closest product to Threadline.
- **Channels:** WhatsApp, iMessage and Telegram. The page also says it launches on Slack, but Slack is not in any plan.
- **Target customer:** App builders and SMBs. Its examples are couriers, travel, salons, food and services.
- **Plans [V]:**
  - **Free, $0 "forever":** Telegram only, "base usage included", a mock-data prototype and community support.
  - **"Self-serve" plan, $29/mo (marked Recommended):** WhatsApp, iMessage and Telegram, "higher usage included", "extra usage billed as you grow", and email support.
  - **Custom, "Let's talk":** Every surface, "approvals handled", custom usage limits and SLAs, a security review and priority support.
  - **All plans:** Your brand on the thread, every action logged, a mock-data preview and data export with no lock-in.
- **Limits:** No numeric usage limits are published, and overage rates are not public.
- **Notes:** The site lists two co-founders (Samyak Jain, CEO, and Prabal Singh, CTO). The live page matches the local copy at research/flow/home.txt.
- **URL:** https://flow.engineer/ (pricing section on the home page). Checked 2026-10-10.

### 2. Photon (photon.codes): the infrastructure Threadline is built on
- **What it does:** Infrastructure that brings agents to iMessage, WhatsApp, Telegram, Slack, Discord and other channels. Its core (Spectrum) is open source and can be self-hosted.
- **Plans [V]:**
  - **Open Source, free:** Self-hosted, using your own Mac and iCloud number.
  - **Free, $0:** iMessage on managed shared numbers, up to 10 users, RCS/SMS fallback, the direct-messaging API, iOS 26 features (polls, backgrounds) and Telegram. "Unlimited daily messages" requires Auto Scale.
  - **Pro, $25/mo:** Same as Free but up to 100 users, plus fast-track tickets.
  - **Business, $250/line/mo:**
    - Dedicated iMessage lines.
    - Group messaging API and bring-your-own iMessage mini apps.
    - Cold outreach of up to 50 new contacts per line per day.
    - Unlimited users (Auto Scale required).
    - Phone call, WhatsApp, SMS/RCS and Telegram.
    - Dedicated Slack/Discord support.
  - **Enterprise, custom:** Numbers you own, the lowest throttling, a contractual SLA, and custom pricing for Phone and WhatsApp.
- **Free tier:** Yes, up to 10 users on shared numbers.
- **Notable limit:** Free and Pro assign each end user a different number from a shared pool. A single brand number requires Business at $250 per line.
- **URL:** https://photon.codes/pricing. Checked 2026-10-10. Matches research/photon/pricing.txt. The FAQ answers (Auto Scale definition, payment methods) did not render [NV].

### 3. Sendblue (sendblue.com)
- **What it does:** An iMessage API and sales-messaging platform ("blue-bubble messages from dedicated numbers"). It falls back to RCS and then SMS, and also offers FaceTime Audio and calling.
- **Target customer:** Developers building AI agents and sales teams working from a CRM. HIPAA plans are available for healthcare.
- **Plans [V]:** "Flat-rate pricing per line. No per-message fees."
  - **Free Sandbox, $0:** Shared number, up to 10 verified contacts, inbound-first, rate-limited. No card required. No webhooks and no outbound.
  - **AI Agent, $100/mo per dedicated line (most popular):** Dedicated number, inbound-first, webhooks, media, typing indicators and reactions, priority support. Capped at 1,000 inbound contacts per day. Full outbound is not included.
  - **Enterprise, custom (volume-based):** Full outbound, multiple lines, SOC 2 and HIPAA, and an account manager.
  - **No extra fees for:** Per-message use, A2P registration, carrier surcharges or SMS fallback.
- **Self-reported claims:** 10M+ iMessages sent, "thousands of businesses", SOC 2 Type II. Not verified.
- **URLs:** https://sendblue.com/pricing and https://www.sendblue.com/. Checked 2026-10-10.

### 4. Linq (linqapp.com)
- **What it does:** "The infrastructure to build and scale AI agents in iMessage." It covers iMessage, RCS with SMS fallback, SMS, group chats and voice calls with transcription.
- **Target customer:** AI-native startups and agent builders. Use cases shown include fintech, fitness, dating, dining and assistants. Logos shown include Poke, Clay, Lindy and Slash.
- **Pricing: not public.**
  - Linq's AI-instructions page says: "Linq does not publish public pricing. Linq offers flat monthly pricing." It also says "Linq does not charge per message."
  - The iMessage API page says "Stop paying-per-message", and mentions a 7-day free trial and a Sandbox.
  - The pricing page (https://linqapp.com/pricing) failed to load (SSL error and an empty render) [NV].
- **Competitor estimates [3P, from rivals]:**
  - Sendblue estimates about $250/mo plus $1,000+ setup (https://www.sendblue.com/compare/sendblue-vs-linq).
  - Blooio estimates setup from $500+ and says onboarding is sales-led (https://blooio.com/compare/blooio-vs-linq-pricing).
- **Self-reported claims:** "1,000+ teams", 200M+ messages, a 99.95% uptime SLA and SOC 2 Type II.
- **URLs:** https://linqapp.com/imessage-api and https://linqapp.com/s/ai-instructions. Checked 2026-10-10.

### 5. LoopMessage (loopmessage.com)
- **What it does:** A messaging API that sends and receives iMessage, SMS/RCS and WhatsApp through one number. It has operated since 2020.
- **Target customer:** Developers building chatbots and AI assistants, sales and e-commerce teams, and schools and non-profits.
- **Dedicated-sender plans [V] ("unlimited messaging"):**
  - **Sandbox, $0/mo:** 5 contacts, for testing only.
  - **Light, from $59.99/mo:** Up to 300 unique active contacts per day.
  - **Regular, from $99.99/mo:** Up to 1,000 unique active contacts per day ("for large-scale AI assistants").
- **Shared-sender plans [V]** (pool of senders, for AI-assistant use cases only):
  - **Free, $0:** For schools and non-profits only, starting at 100 monthly contacts.
  - **Regular, $20/mo:** Starts at 50 monthly contacts, with +$50 per extra 50 contacts.
  - The page uses the name "Regular" for two different plans.
- **Dedicated-sender add-ons [V]:**
  - Phone number: +$15/mo.
  - SMS/RCS fallback and call forwarding: +$15/mo.
  - WhatsApp: +$10/mo.
  - Starting conversations ("Init conversations"): +$30/mo.
  - Sender name: $15 one-time.
  - Volume discounts start at 3 or more lines, but no percentages are published.
- **Limit:** Cold, outbound-only messaging is not supported.
- **URLs:** https://loopmessage.com/pricing and https://loopmessage.com/. Checked 2026-10-10.

### 6. Blooio (blooio.com)
- **What it does:** An iMessage, SMS and RCS API with voice and FaceTime on dedicated lines.
- **Target customer:** Developers, SMBs and AI agents.
- **Plans [V]** (monthly billing, no annual contracts, no per-message fees):
  - **Free Trial, $0:** 20 messages in total (one-time), shared number.
  - **Starter, $39/mo:** One shared number, 5 new contacts per day, 90-day history.
  - **Commercial Shared, $89/mo:** One shared number, 15 new contacts per day, CRM integrations and scheduled messages.
  - **Commercial Dedicated, $289/mo per line (most popular):**
    - Unlimited messages and new conversations per day.
    - Voice, call forwarding and FaceTime (on inquiry).
    - One-year history.
    - Custom area code for $75 one-time.
  - **Inbound, $98/mo:**
    - A dedicated, reply-only number. It cannot start new conversations.
    - Positioned for "AI agents, autoresponders, and inbound webhook bots".
    - Signed webhooks.
    - This is the closest analogue to Threadline's inbound use case.
  - **Enterprise Dedicated, per line by number of lines:**
    - 1 line: $389. 2 lines: $350. 3 lines: $311. 4 lines: $272. 5 lines: $233. 6 or more lines: $195 each.
    - Includes auto-scaling, auto-unbanning and no activation fee.
- **Caveat on "unlimited":** Still subject to new-recipient allowances, outbound limits, opt-outs and Apple's policies.
- **URL:** https://blooio.com/pricing. Checked 2026-10-10.

---

## B. Helpdesks with AI agents (incumbents a Shopify or SMB merchant already pays)

### 7. Intercom (Fin)
- **What it does:** A helpdesk plus the Fin AI agent.
- **Channels:** Chat, email, SMS, WhatsApp, phone and social.
- **Target customer:** SaaS and B2C support teams.
- **Seat plans [V]:**
  - Essential $29, Advanced $85 and Expert $132 per seat per month.
  - The page has an annual/monthly toggle, but the fetch did not show which billing option these figures reflect [NV].
  - 14-day free trial, no card required.
- **Fin [V]:**
  - "From $0.99 per Fin outcome". Charged once per conversation.
  - An outcome counts when the customer confirms the issue is resolved, does not ask for more help, or Fin completes a workflow or Procedure (including handoffs).
  - Fin on a third-party helpdesk has a "minimum monthly commitment (e.g. 50 outcomes)".
- **US SMS, per segment, tiered [V]:**
  - 1–500: $0.06.
  - 501–1,000: $0.03.
  - 1,001–4,000: $0.025.
  - 4,001–7,000: $0.02.
  - 7,001–10,000: $0.0175.
  - 10,001–100,000: $0.015.
  - Over 100,000: $0.01.
- **WhatsApp outbound, per message [V]:**
  - $0.10 for messages 1–500, falling to $0.07 above 10,000.
  - Inbound WhatsApp conversations are free.
- **Phone:** Usage-based, priced at intercom.com/phone/pricing. Not fetched.
- **URLs:** https://www.intercom.com/pricing and https://www.intercom.com/help/en/articles/9061703-usage-based-channels. Checked 2026-10-10.

### 8. Zendesk
- **Plans per agent per month [V]:**
  - Support Team: $19 annual or $25 monthly.
  - Suite Team: $55 annual or $69 monthly.
  - Suite Professional: $115 annual or $149 monthly.
  - Suite Enterprise: "Talk to Sales".
  - Add-ons (annual): Copilot $50, Workforce Engagement $50 and Contact Center $83 per agent per month.
- **AI agents, "automated resolutions" (ARs) [V]:**
  - Included: 5 per agent per month on Team plans and 10 per agent per month on Professional.
  - Committed ARs cost **$1.50** each and pay-as-you-go ARs cost **$2.00** each.
- **Messaging platform (Sunshine Conversations) [V]:**
  - Suite Professional only.
  - Includes 1,000 monthly active users (MAUs), with packs of 2,500 more MAUs for $50.
  - Includes 1,000 notifications per month, with packs of 25,000 more for $50.
- **SMS and WhatsApp:** "Additional fees apply". No per-message rate is shown on the pricing page [NV].
- **URL:** https://www.zendesk.com/pricing/. Checked 2026-10-10.

### 9. Gorgias (Shopify-native helpdesk)
- **Plans [V]:**

  | Plan | Price per month | Tickets included | Overage per ticket | AI interactions included |
  |---|---|---|---|---|
  | Starter | $10 (monthly billing only) | 50 | $0.40 | 30 |
  | Basic | $50 annual / $60 monthly | 300 | $0.40 | 30 |
  | Pro | $300 annual / $360 monthly | 2,000 | $0.36 | 190 |
  | Advanced | $750 annual / $900 monthly | 5,000 | $0.36 | 530 |
  | Enterprise | Custom | Over 5,000 | Not stated | Not stated |

- **AI Agent [V]:**
  - **$0.90 per automated interaction** on annual contracts and **$1.00** on monthly contracts.
  - Interactions above the plan's allowance cost $1.50 each.
  - The page's structured data also shows a conflicting set of prices: Basic $77, Pro $471 and Advanced $1,227 [NV].
- **SMS add-on:** The page says pricing "scales with your call and text volume", with no figures.
  - [3P] SMS is billed per SMS ticket: about $0.80 each at 0–24 tickets per month, falling to about $0.41 at 500–999 (https://www.ringly.io/blog/gorgias-sms).
  - [3P] Voice is listed at "$1.2 usage" (https://pricingsaas.com/companies/gorgias).
- **URL:** https://www.gorgias.com/pricing. Checked 2026-10-10.

---

## C. SMS marketing platforms (the e-commerce "text channel" budget)

### 10a. Postscript (Shopify SMS)
- **Plans [V], US/Canada:**

  | Plan | Price per month | SMS | MMS | Notes |
  |---|---|---|---|---|
  | Starter | $0, with a $49 monthly minimum spend | $0.009 | $0.045 | Free toll-free number, 2 keywords |
  | Growth | $100 | $0.008 | $0.03 | Unlimited keywords |
  | Professional | $500 | $0.007 | $0.024 | API access, priority support |
  | Enterprise | Custom | Custom | Custom | Option to add RCS |

- **Carrier fees on top (average) [V]:** SMS $0.0033, MMS $0.00799, text RCS $0.0047, media RCS $0.0087.
- **Postscript AI Plan [V]:**
  - **$699/mo**, with per-message rates of $0.003–$0.30 depending on product and message type.
  - Includes Brand Center, Infinity Testing and **Shopper**, an AI sales agent over SMS.
  - No separate price is listed for Shopper.
- **Other costs [V]:** New trials get a $100 credit for the first 30 days. A dedicated short code costs $750/mo through carriers.
- **URL:** https://postscript.io/pricing. Checked 2026-10-10.

### 10b. Attentive
- **Channels:** SMS, email, RCS for Business and push.
- **Target customer:** Mid-market and enterprise brands.
- **Pricing: not public [V].**
  - Every plan says "Pricing based on list size and messages sent". The Text plan says "Pay per message and subscriber count". The full package is "Custom pricing".
  - AI Pro: "Flat monthly fee". AI Grow: "Flat monthly fee". AI Journeys: "Pay per click". AI Essentials: included with all plans.
  - No per-message rates or minimums are published.
- **URL:** https://www.attentive.com/pricing. Checked 2026-10-10.

---

## D. WhatsApp and SMS providers (BSPs) and Meta's own pricing

### 11a. Meta WhatsApp Business Platform
- **Pricing model [V]:**
  - Per-message pricing took effect **July 1, 2025**, replacing conversation-based pricing.
  - Meta charges for each delivered template message, by category (marketing, utility or authentication) and by the recipient's country code.
  - Non-template messages are free inside the 24-hour customer-service window.
  - Utility templates sent inside an open window are free.
  - Click-to-WhatsApp ads and Page buttons open a 72-hour window in which all messages are free.
  - Volume tiers apply to utility and authentication only.
  - North America got lower utility and authentication rates on Jan 1, 2026. Current rate cards took effect July 1, 2026.
  - Max-price bidding for marketing messages arrived in 2026 (Marketing Messages API).
  - Sources: https://developers.facebook.com/docs/whatsapp/pricing/ and https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing.
- **North America rates, USD per message [3P]** (Meta's rate card is a CSV and the pricing site renders numbers dynamically, so the figures could not be read from Meta directly):
  - Marketing $0.0250.
  - Utility $0.0034, falling to $0.0026 above 6M messages per month.
  - Authentication $0.0034.
  - Twilio's calculator also shows utility, authentication and service at $0.0034 [V on Twilio].
  - Sources: https://www.dragapp.com/blog/whatsapp-business-api-pricing/ and https://zernio.com/whatsapp-api-pricing.
- **October 1, 2026 change [3P, conflicting]:**
  - Drag reports that in North America, service (non-template) messages and in-window utility replies are now billed at $0.0034, ending the free in-window tier.
  - Meta's consumer pricing page (https://whatsappbusiness.com/products/platform-pricing/) still says businesses are not charged for service messages in the 24-hour window.
  - Twilio mentions a monthly free tier for service messages. AiSensy (India) mentions 1,000 free service messages per number per month.
  - **Treat this as unresolved.** It matters for an inbound agent's cost of goods sold.
- **US marketing pause [3P]:**
  - Meta paused delivery of all marketing templates to +1 US numbers from April 1, 2025.
  - Vendors report it is still paused as of July–August 2026, with no end date.
  - Sources: https://www.wati.io/en/blog/whatsapp-marketing-messages-us-2026/, https://getkanal.com/blog/whatsapp-marketing-usa-2026 and https://help.zoho.com/portal/es/community/topic/pausing-whatsapp-marketing-messages-for-us-numbers-starting-april-1-2025.
  - Practical effect: US WhatsApp is inbound and service only, which suits Threadline's inbound agent.

### 11b. Twilio
- **WhatsApp [V]:** **$0.005 per message**, inbound or outbound, on top of Meta's fees. Failed messages cost $0.001. The page shows pricing "current as of September 2026". https://www.twilio.com/en-us/whatsapp/pricing
- **US SMS [V]:**
  - $0.0083 per SMS segment, in or out.
  - MMS out $0.022; MMS in $0.0165 (long code) or $0.02 (toll-free).
  - Carrier fees on top, for example AT&T $0.0035 and T-Mobile $0.0045 outbound SMS.
  - Numbers: long code $1.15/mo, toll-free $2.15/mo, short code $1,000 per quarter.
  - 10DLC registration fees exist, but the amounts are not on the page.
  - https://www.twilio.com/en-us/sms/pricing/us
- **Conversations API [3P, search snippet of Twilio's page]:**
  - First 200 monthly active users free, then $0.05 per active user (201–5,000), $0.0475 (5,001–10,000) and $0.045 (10,001–20,000).
  - Channel fees are extra.
  - https://www.twilio.com/en-us/messaging/pricing/conversations-api (direct fetch returned 404)

### 11c. Respond.io
- **Plans [V]:**
  - Starter: $79/mo billed yearly or $99/mo billed monthly. 5 users, 5,000 AI credits.
  - Growth: $159 yearly or $199 monthly. 10 users, 1,000 monthly active contacts (MACs), 10,000 AI credits.
  - Advanced: $279 yearly or $349 monthly. 10 users, 1,000 MACs, 20,000 AI credits.
  - Enterprise: custom.
  - The monthly prices come from the page's structured data.
- **Usage [V]:**
  - MAC overage: $12 per 100 on Growth and $15 per 100 on Advanced.
  - AI credit overage: $15 per 1,000.
  - WhatsApp fees are not included and Meta charges them at cost. No markup is disclosed.
  - 7-day trial.
- **URL:** https://respond.io/pricing. Checked 2026-10-10.

### 11d. WATI
- **Plans:** Growth, Pro and Business. Dollar amounts did not render in the fetch [NV].
- **[V] details:**
  - Users: Growth 3, Pro 5, Business 5.
  - AI Co-pilot credits per month: 250, 500 and 1,500.
  - Extra users: Pro $24, Business $69.
  - Annual billing saves "up to ~25%".
  - 7-day free trial.
  - Astra AI agents are an add-on, "priced separately".
  - Message fees are "charged based on WATI rate card".
- **[3P] prices:**
  - About $59 (Growth), $119 (Pro) and $279 (Business) per month billed annually.
  - About $69, $149 and $349 billed monthly.
  - About 20% markup on Meta template rates.
  - Sources: https://costbench.com/software/live-chat/wati/ and https://frontdeskreview.com/software/whatsapp-business/wati/.
- **URL:** https://www.wati.io/pricing/. Checked 2026-10-10.

### 11e. AiSensy (India)
- **Base plan prices:** The cards did not render [NV]. There is a "Free Forever" plan.
- **[V] details, INR:**
  - WhatsApp AI Agent Builder: ₹1,350/mo, or ₹1,215/mo billed annually. Includes 1,000 AI messages per month.
  - Chatbot Builder: ₹2,500/mo.
  - India WhatsApp per-message rates: marketing ₹1.09; utility, authentication and service ₹0.145.
  - 1,000 free service messages per number per month.
  - From Oct 1, 2026, in-window utility messages are charged.
- **URL:** https://aisensy.com/pricing. Checked 2026-10-10.

---

## E. Apple Messages for Business and RCS

### 12a. Apple Messages for Business
- **How a business gets it [V]:**
  - Apple says: "your company needs to select an Apple-approved Messaging Service Provider (MSP)."
  - You set up an internal test account in Apple Business Register, connected to the MSP. Apple says: "You'll start in test mode — nothing goes live yet."
  - The MSP submits a screen recording of the full customer journey for Apple's **Experience Review**.
  - "Once approved, your test account becomes a commercial account and you go live."
  - Source: https://register.apple.com/resources/messages/messaging-documentation/
- **Pricing:** Apple publishes no pricing. Costs come from the MSP.
- **Key limit:** Customers must start the conversation from Apple entry points (Maps, Safari, Siri, Search). Business chats show as a separate grey-bubble thread, not a normal iMessage. Source: https://www.apple.com/legal/privacy/data/en/messages-for-business/
- **2026 news:**
  - Twilio launched Apple Messages for Business in **private beta on May 7, 2026**, with list and time pickers, rich links and Apple Pay. https://static0.twilio.com/en-us/changelog/amb-private-beta
  - iOS 26 (announced at WWDC on June 9, 2025) added a **Screen Unknown Senders** inbox. Texts from numbers that are not in contacts or not replied to are filtered and don't notify. This hurts cold business texting; customer-initiated threads such as Threadline's are unaffected.
  - Sources: https://www.twilio.com/en-us/blog/insights/trends/potential-ios-26-update-communications-implications and https://www.bandwidth.com/blog/apple-ios26-inbox-update/
  - No Apple adoption figures for Messages for Business were found [NV].

### 12b. RCS Business Messaging in the US
- iOS 18.1 (late October 2024) brought RCS business messaging to iPhone. As of January 2025, two of the three major US carriers supported it. Twilio gives iOS about 57% of the US market. https://www.twilio.com/en-us/blog/insights/trends/rcs-business-messaging-apple-update
- Google reported more than **1 billion RCS messages per day in the US** (28-day average) on May 13, 2025. https://blog.google/products/android/billion-rcs-messages/ and https://9to5google.com/2025/05/13/google-rcs-messages-billion-daily-us/
- Claims of carrier completeness in 2026 come from vendors only (Infobip says the US is live as of early 2026) [3P]. https://www.infobip.com/blog/rcs-statistics
- RCS business messages are not end-to-end encrypted and fall back to SMS.

---

## F. Other AI agents for Shopify and messaging

### 13a. Tidio (Lyro AI agent)
- **Plans [V]:**
  - Free: $0, 50 conversations, 50 Lyro conversations (lifetime, not monthly).
  - Starter: $24.17/mo, 100 conversations.
  - Growth: from $49.17/mo, from 250 conversations.
  - Plus: from $300/mo plus usage.
  - Premium: contact sales.
  - The page doesn't say whether these are annual or monthly prices; "2 months free" is advertised for annual billing.
- **Lyro standalone [V]:**
  - From $32.50/mo for 50 Lyro conversations, which works out to about $0.65 per conversation.
  - Tiers run up to 1,000 or more conversations.
  - Premium starts at 3,000 conversations, with a "guaranteed 50% resolution rate" and pay-per-resolution billing.
- **URL:** https://www.tidio.com/pricing/. Checked 2026-10-10.

### 13b. Siena AI (AI agent for e-commerce support, shopping and social)
- **Pricing [V]:**
  - **$750/mo platform fee** plus **$0.90 per automated ticket**.
  - Onboarding is a separate item with no price listed.
  - Custom quotes: "Tell us what you need and we'll send pricing that fits."
- **URL:** https://www.siena.cx/pricing. Checked 2026-10-10.

### 13c. Zipchat (Shopify AI sales agent, including WhatsApp)
- **Plans [V, from the official pricing.md]:**
  - Starter: $64/mo annual or $80 monthly. 750 AI replies.
  - Pro: $240 annual or $300 monthly. 3,000 replies.
  - Scale: $480 annual or $600 monthly. 6,000 replies.
  - Scale Plus: $960 annual or $1,200 monthly. 14,000 replies.
  - Unlimited: from $2,100/mo.
  - Overage: $49 per 250 extra replies ($49 per 500 on Scale Plus).
  - No free plan; 7-day trial.
- **Conflict:** The pricing HTML page and Zipchat's blog show older figures ($49, $129, $249, $499) [3P conflict].
- **URL:** https://www.zipchat.ai/pricing.md. Checked 2026-10-10.

### 13d. Rep AI (hellorep.ai)
- **What it does:** Shopify AI sales and support agent.
- **Channels:** Website, email, Facebook, Instagram and WhatsApp.
- **Pricing: not public.** The page shows only "Try free for 14 days", "No credit card required" and a "5× ROI guarantee".
- **URL:** https://www.hellorep.ai/pricing. Checked 2026-10-10.

### 13e. Manychat
- **Channels:** Instagram, Messenger, WhatsApp, SMS, email and Telegram.
- **Pricing:** The page returned 403 [NV].
- **[3P]:**
  - Pro from $15/mo for up to 500 contacts.
  - The AI add-on is reported as $29/mo by Featurebase and Hackceleration, $15/mo by CostBench, and bundled by eesel. The sources disagree.
  - A March 2026 overhaul reportedly moved Manychat to five tiers.
  - Sources: https://www.featurebase.app/blog/manychat-pricing and https://hackceleration.com/labs/manychat-pricing.

---

## Why now (sourced)

1. **The US is an iPhone market.**
   - The iPhone was 75% of smartphone sales at the Big 3 US carriers in Q1 2026, up from 72% (77% at Verizon). US iPhone sales grew 1.3% year on year while the market fell 5.7%.
   - Sources: Counterpoint (https://counterpointresearch.com/cn/insights/apple-bucks-us-smartphone-sales-decline-in-q1-2026) and 9to5Mac (https://9to5mac.com/2026/05/13/apple-counters-us-smartphone-decline-as-iphone-sales-grow-report/).
   - Twilio cites iOS at about 57% of the US installed market (https://www.twilio.com/en-us/blog/insights/trends/rcs-business-messaging-apple-update).
2. **RCS lifted the floor for green bubbles.** iOS 18 RCS support helped push US RCS volume past 1B messages a day by May 2025, against about 6B SMS/MMS a day (https://blog.google/products/android/billion-rcs-messages/ and https://9to5google.com/2025/05/13/google-rcs-messages-billion-daily-us/).
3. **Texting performs.**
   - Klaviyo's 2026 SMS benchmarks: automated flows have about a 10% average click rate (top performers above 16%), roughly double campaigns.
   - Flows are 7.6% of sends but 45.2% of SMS revenue, with about 8x the revenue per recipient (RPR) of campaigns. The top 10% of flows exceed $5 RPR.
   - Source: https://www.klaviyo.com/products/sms-marketing/benchmarks
   - Postscript's average click rate is 14.8% [3P] (https://eightx.co/blog/average-ecommerce-sms-revenue-share-by-vertical-2026).
4. **Consumers want to text businesses.** These are vendor surveys:
   - 86% of consumers opt in to business texts, and 52% text businesses more often than before (EZ Texting 2025, https://www.eztexting.com/report/2025-consumer-texting-report).
   - 89% have opted in to at least one business, and texting is preferred for 90% of message types (EZ Texting 2026, https://cxm.world/customer-experience/consumers-have-made-their-choice-texting-beats-email-phone-and-social-for-almost-every-message-type/).
   - SimpleTexting (January 2026) found 86% opted in, up from 62% in 2021 (https://www.marketingprofs.com/charts/2026/55068/the-sms-marketing-preferences-of-americans).
   - Customers are texting businesses that "aren't set up to respond" (https://martech.org/new-survey-consumers-are-texting-to-businesses-that-arent-set-up-to-respond/).
5. **AI agents are going mainstream in support.**
   - Gartner predicts agentic AI will autonomously resolve 80% of common customer-service issues by 2029, cutting operating costs by 30% (press release, March 5, 2025): https://www.gartner.com/en/newsroom/press-releases/2025-03-05-gartner-predicts-agentic-ai-will-autonomously-resolve-80-percent-of-common-customer-service-issues-without-human-intervention-by-20290
   - Intercom's 2026 Customer Service Transformation Report (2,470 respondents) found 82% of leaders invested in AI in the past 12 months and 87% plan to in 2026, but only 10% describe their deployment as mature: https://intercom.com/customer-transformation-report
6. **Incumbents price per resolution at $0.90–$2.00, plus channel fees.**
   - Fin costs $0.99 per outcome, Zendesk $1.50–$2.00 per automated resolution, Gorgias $0.90–$1.00 per interaction ($1.50 over the allowance) and Siena $0.90 per ticket plus $750/mo.
   - A flat-priced, text-native agent undercuts all of them for an SMB.
7. **Rails are commoditising.**
   - iMessage APIs now sell flat per line with no per-message fees: Sendblue $100, Blooio Inbound $98, LoopMessage $59.99–$99.99 and Photon Business $250.
   - WhatsApp service messaging costs about $0.0034 or less per message in the US (marketing is paused in the US).
   - The scarce layer is the agent that knows the business, not the pipe.
