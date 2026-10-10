# ICP sizing and inbound channels research

Researched 2026-10-10 using public web sources only. Nothing was signed up for, submitted or contacted.

How to read this file:
- "Accessed" means the date we looked at the page (2026-10-10). "As-of" means the date the source puts on its own data.
- **[EST]** marks our own estimate. The method is given next to it.
- **[2nd]** marks a secondary or third-party source (a vendor blog or aggregator) that we could not check against the primary source.
- Install trackers disagree because they measure different things. StoreLeads counts live domains with the technology detected now. StoreCensus counts installs among the Shopify stores it tracks. BuiltWith also counts domains seen at any point in its crawl history. **We use StoreLeads as the primary source throughout.**

---

## Part A: Sizing

### A1. Shopify store universe

| Metric | Value | Source (as-of) |
|---|---|---|
| Live Shopify stores, worldwide | **3,103,755** | https://storeleads.app/reports/shopify (updated 2026-10-02) |
| Live Shopify stores, US | **1,186,833** (38.2%) | same |
| UK / CA / AU | 231,569 / 147,180 / 138,183 | same |
| Shopify Plus stores, worldwide | ~74,777 (StoreLeads, May 2026) to 81,585 (BuiltWith; 43,764 US) **[2nd]** | https://eightx.co/blog/most-installed-shopify-plus-apps-2026 and https://www.launchtip.com/blog/shopify-plus-adoption-stats-2026-upgrading-and-why, via search snippet (2026) |
| Stores by revenue band (all of Shopify) | **Not published for free.** StoreLeads and StoreCensus only show it behind a paid filter. | — |
| Postscript users by revenue band (StoreCensus) | $10M+: 50; $1M-10M: 626; $100K-1M: 1,727; <$100K: 9,719 | https://www.storecensus.com/stats/app/postscript-sms-marketing (updated 2026-10-09) |

**[EST] US Shopify stores doing $1M+ a year: roughly 25-45k.**
- Method: Plus is the usual proxy for $1M+ GMV. BuiltWith puts US Plus at about 43.7k, and roughly 60% of Plus is US. That gives a 25-45k band.
- Treat this as a rough proxy, not a count.

### A1b. Installs of incumbent tools (the wedge ICP)

All rows are from StoreLeads technology reports, updated 2026-10-02.

| Tool | All ecommerce stores | Shopify stores | US stores | YoY change | URL |
|---|---|---|---|---|---|
| **Gorgias** | 27,466 | **25,670** (93.5%) | **12,169** (44.3%) | +10.3% | https://storeleads.app/reports/technology/Gorgias |
| **Postscript** | 22,882 | **22,860** (99.9%) | **20,087** (87.8%) | +3.7% | https://storeleads.app/reports/technology/Postscript |
| **Attentive** | 12,824 | 9,273 (72.3%) | 8,497 (66.3%) | -4.3% | https://storeleads.app/reports/technology/Attentive |
| **Klaviyo** (email and SMS combined) | 555,174 | 429,322 (77.3%) | 203,174 | +17.3% | https://storeleads.app/reports/technology/Klaviyo |
| **Tidio** | 85,102 | 27,804 (32.7%) | n/a | +16.9% | https://storeleads.app/reports/technology/Tidio |
| **Zendesk** | 169,473 | 24,191 (14.3%) | 35,847 (all platforms) | -38.3% | https://storeleads.app/reports/technology/Zendesk |
| **Rebuy** (Shopify app) | — | 15,063 | 8,551 (56.8%) | +22.6% | https://storeleads.app/reports/shopify/app/rebuy |
| Klaviyo SMS alone | Not separable. StoreLeads detects Klaviyo as one technology. | | | | |

Other counts that disagree with StoreLeads:
- **Postscript.** StoreCensus shows 16,807 installs (0.8% of 2.13M tracked Shopify stores; 8,943 US; +80% YoY; 2026-10-09). A June 2026 search snippet citing StoreCensus said 38,963. **Use StoreLeads' 22.9k.**
- **Gorgias.** Gorgias itself claims "15,000+ brands", which counts paying customers rather than installs. https://www.ringly.io/blog/gorgias-number-of-merchants-2025 **[2nd]**

**[EST] Wedge ICP: US Shopify stores paying for Gorgias or Postscript, roughly 20k-31k.**
- US Shopify stores running Gorgias are about 11.4k. Method: 12,169 US Gorgias stores × 93.5% Shopify share (assumes the US platform mix matches the global one).
- US Postscript stores are 20.1k, almost all of them on Shopify.
- The lower bound (20k) assumes every Gorgias store also uses Postscript. The upper bound (31k) assumes no overlap.
- Adding Attentive's US Shopify stores (about 6.1k = 8,497 × 72.3%) raises the ceiling to about **37k**. The Attentive stores skew larger.

### A2. What these stores pay today (the budget line we replace or augment)

**Gorgias** (https://www.gorgias.com/pricing, accessed 2026-10-10; the Shopify listing https://apps.shopify.com/helpdesk matches)

| Plan | Monthly billing | Annual billing (per month) | Tickets included | Overage |
|---|---|---|---|---|
| Starter | $10 | — | 50 | $0.40/ticket |
| Basic | $60 | $50 | 300 | $0.40 |
| Pro | $360 | $300 | 2,000 | $0.36 |
| Advanced | $900 | $750 | 5,000 | $0.36 |

- AI Agent costs **$0.90 per automated interaction on an annual contract, $1.00 monthly, and $1.50 for overage**.
- SMS and Voice are add-ons with no published price. Gorgias now markets "AI Agent on SMS": https://updates.gorgias.com/publications/ai-agent-on-sms
- The pricing page also contains a second data block showing $77 / $471 / $1,227. Treat that as an inconsistency on the page.

**Postscript** (https://postscript.io/pricing and https://apps.shopify.com/postscript-sms-marketing, accessed 2026-10-10)

| Plan | Platform fee | Per SMS | Per MMS | Notes |
|---|---|---|---|---|
| Starter | $0 | $0.009 | $0.045 | $49/month minimum spend |
| Growth | $100/month | $0.008 | $0.03 | |
| Professional | $500/month | $0.007 | $0.024 | |
| **AI Plan** (includes "Shopper", their AI sales agent) | **$699/month** | $0.003-0.30 | | |

- US carrier fees are passed through: about $0.0033 per SMS and $0.008 per MMS.
- The Shopify listing has a 4.7 rating from 1,207 reviews.

**Attentive** (no public rate card)
- Median contract is about **$37.7k-$40k a year** (range $1.8k-$72k), according to Vendr buyer data. https://eightx.co/blog/compare/how-much-does-attentive-cost and https://www.costbench.com/software/sms-marketing/attentive/ (2026) **[2nd]**, based on only 4 buyer reports.
- Vendr's own page shows an "average contract value" of $27,270: https://vendr.com/marketplace/attentive **[2nd]**
- Quarterly minimums are often $2-3k. **[2nd]**
- The Shopify listing has a 4.7 rating from 112 reviews: https://apps.shopify.com/attentive

**Klaviyo SMS**
- The free plan includes $5 of SMS a month. Paid tiers are not shown on the static page: https://www.klaviyo.com/pricing (accessed 2026-10-10).

**[EST] Combined annual spend for a typical US brand already using Gorgias Pro and Postscript Growth: about $5.5k-$15k a year.**
- Method: Gorgias Pro is $3.6k a year. The Postscript Growth fee is $1.2k a year, plus messages; 100k-1M SMS a year at about $0.011 all-in comes to roughly $1.1k-$11k.
- Attentive brands sit at about $40k a year or more.
- Our replace-or-augment line is the **Gorgias AI Agent spend at $0.90-$1.00 per resolution** and the **Postscript Shopper spend at $699 a month**.

### A3. Appointment-based local businesses

**BLS QCEW 2024 annual averages, private establishments with employees** (https://data.bls.gov/cew/data/api/2024/a/industry/{NAICS}.csv, fetched 2026-10-10; national private-ownership row)

| NAICS | Industry | Establishments | Employment |
|---|---|---|---|
| 812112 | Beauty salons | **77,881** | 366,755 |
| 812111 | Barber shops | **8,205** | 34,794 |
| 812113 | Nail salons | **33,732** | 150,671 |
| 713940 | Fitness and recreational sports centers | **44,983** | 654,500 |
| 621399 (med spas sit inside this code) | — | No national row in the file | — |

Other counts:
- **Census CBP 2023, beauty salons:** 84,176 employer establishments. https://data.mewayz.com/industry/beauty-salons/ **[2nd]** The Census API now needs a key, so we did not verify it directly.
- **Nonemployer (solo or booth-renter) salons, 2023:** about **838,264**. https://startbusinessbystate.com/salon-industry-statistics/ (published 2026, citing Census NES 2023) **[2nd]**
- **Med spas (AmSpa):** **10,488 locations in 2023**, up from 8,899 in 2022. Average revenue is about $1.40M per location, and 81% are single-location. https://americanmedspa.org/industry-report/ and https://www.americanmedspa.org/blog/2024-medical-spa-state-of-the-industry-executive-report-recap (2024 report on 2023 data)

**[EST] Reachable US appointment SMBs with employees: about 175k.**
- Method: salons, barbers, nails and fitness from QCEW, plus med spas from AmSpa.
- About half of fitness establishments are not "boutique". Excluding them gives roughly **150k**.

**Software spend** (accessed 2026-10-10)

| Vendor | Price | Source |
|---|---|---|
| Vagaro | $30/month (promotional $23.99) plus $10 per extra calendar | https://www.vagaro.com/pro/pricing |
| Vagaro text marketing | about $20/month for 1,000 credits; about $50 for 2,000 **[2nd]** | https://koalendar.com/blog/vagaro-pricing |
| Boulevard | Essentials $143, Premier $234, Prestige $328 per location per month; 250-2,500 texts included, then pay per text. Has an AI receptionist, "Beau". | https://www.joinblvd.com/pricing |
| GlossGenius | $24-$148/month (beauty); med spa plans $148-$248/month annual; **AI "Reception" add-on $50/month** (answers calls and texts 24/7) | https://glossgenius.com/pricing |
| Mindbody | Starter about $99-159, Accelerate about $259-289, Ultimate about $499+ per location per month; Messenger[ai] add-on about $75-250/month **[2nd]** | https://content.fitbudd.com/post/how-much-does-mindbody-cost |
| MedspAI (AI texting for med spas) | from $299 per month per location **[2nd]** | https://www.stork.ai/en/medspai |

**[EST] SMS and AI front-desk budget: about $20-$300 per location per month.**
- The low end is a reminder or text-credit add-on. The high end is a dedicated AI texting product.
- The incumbent booking software (GlossGenius, Boulevard, Mindbody) now bundles its own AI receptionist.

### A4. Boutique and independent hotels, and short-term rentals

**Hotels**

| Metric | Value | Source |
|---|---|---|
| Hotels and motels, NAICS 721110 (QCEW 2024, private) | **61,574** establishments; 1.54M employees | https://data.bls.gov/cew/data/api/2024/a/industry/721110.csv |
| B&Bs, NAICS 721191 (QCEW 2024) | **2,338** | https://data.bls.gov/cew/data/api/2024/a/industry/721191.csv |
| US hotel properties (AHLA, Oxford Economics, 2024 data) | **64,000+** properties; about 5.7M rooms **[2nd]** | https://hotelbusiness.com/ahla-state-of-the-industry-improved-opportunity-in-2026/ |
| Branded share of US hotels | **72% branded**, so about 28% independent | https://cloudbeds.com/articles/2025-independent-lodging-report (2025) |

**[EST] US independent hotels: about 17-18k.**
- Method: 64k × 28%.
- "Boutique" is a subset with no official count.

**Short-term rentals**

| Metric | Value | Source |
|---|---|---|
| US hosts ranked by AirDNA | **960,000** | https://enterprise-help.airdna.co/en/articles/16735577-2026-top-property-manager-awards-we-ranked-960-000-us-hosts (2026-08-28) |
| US property managers with 100+ listings | **920** | same |
| Hostaway | 100k+ properties (Dec 2024); $1B valuation (Oct 2025) | https://techcrunch.com/2024/12/17/travel-is-back-hostaway-raises-365m-at-a-925m-valuation/ |
| Guesty | about 100k+ listings; $900M valuation (Apr 2024) **[2nd]** | https://multiples.vc/private-comps/guesty |

**Guest messaging and PMS prices**

| Vendor | Price | Source |
|---|---|---|
| Canary | from $300/month | HotelTechReport comparison pages **[2nd]**: https://hoteltechreport.com/es/compare/akia-vs-canary-messages |
| Akia | from $500/month | same |
| Duve | from $900/month | https://hoteltechreport.com/es/compare/canary-messages-vs-duve-communication-hub **[2nd]** |
| HiJiffy | not public | — |
| Hostaway PMS | about $25-50 per listing per month plus a $300-1,000 onboarding fee; no public rate card **[2nd]** | https://www.roommaster.com/blog/hostaway-pricing |
| Guesty Lite | $9-29 per listing per month; Pro about $40-72 per listing per month **[2nd]** | https://www.roommaster.com/blog/guesty-pricing |

---

## Part B: Inbound

### B5. SEO: who ranks for our queries today

Two caveats on this table:
- **The rankings are not Google's.** They come from the agent's WebSearch tool (US results, 2026-10-10), which approximates organic ranking. Re-check in a Google incognito window before acting on them.
- **We found no free, authoritative search volumes.** Google Trends returned HTTP 429. The Ahrefs, Semrush and keywordtool pages need a login or JavaScript. The volume tier column is our own **[EST]**, judged from SERP composition: few vendors, dev-blog results and forum noise mean a small market. **Get real numbers from Ahrefs or Semrush (a trial) before planning content.**

| # | Query | Top 3 results today | Volume tier [EST] / notes |
|---|---|---|---|
| 1 | imessage api | linqapp.com/imessage-api; sendblue.com/blog/imessage-api; sendblue.com/glossary/imessage-api | Low-mid, dev intent. Sendblue holds two of the top three. |
| 2 | imessage for business | blooio.com/guides/imessage-for-business; sendblue.com/blog/imessage-for-business-guide; mobile-text-alerts.com | Mid. Same vendors. |
| 3 | imessage chatbot | blooio.com/guides/imessage-bot; sendblue.com/blog/ai-chatbot-imessage-integration; topai.tools | Low. Winnable. |
| 4 | ai agent for whatsapp | eloquent.chat; quickchat.ai; ycloud.com | Mid-high globally, crowded. |
| 5 | whatsapp ai agent | eloquent.chat; ycloud.com (x2) | Mid-high, crowded (AiSensy, ClickUp, Wati). |
| 6 | text customers ai | customerthink.com (Text.com launch); eesel.ai; customerexperiencedive.com | Low, ambiguous. |
| 7 | sms chatbot shopify | apps.shopify.com/shopgpt-2; magecomp.com (x2) | Low. App Store listings rank here, which is a reason to list. |
| 8 | ai customer service texting | seekahost.co.uk; eztexting.com; verse.ai | Low. Weak SERP, winnable. |
| 9 | telegram ai agent | techloy (Manus on Telegram); klink.cloud; chatbotkit.com | Mid, consumer-skewed. |
| 10 | apple messages for business | docs.bird.com; bird.com (x2) | Mid. Owned by MSPs (Bird, Infobip, CM.com). |
| 11 | imessage marketing | sendblue.com (x2); sleekflow.io | Low. Sendblue owns it. |
| 12 | shopify ai chatbot | jotform.com; chat-data.com; community.shopify.com | Mid-high, crowded. |
| 13 | conversational commerce | cequens.com; napoleoncat.com; usefini.com | Mid. Glossary-type pages. Low commercial intent. |
| 14 | ai sales agent shopify | sista.ai; apps.shopify.com/bearworks; eesel.ai | Low-mid. App Store listings rank. |
| 15 | sms ai agent | dialzara.com; sendbird.com; updates.gorgias.com (AI Agent on SMS) | Low-mid. **Gorgias is already here.** |
| 16 | ai receptionist for salons | trtc.io; myaifrontdesk.com (x2) | Mid, voice-skewed. myaifrontdesk spams it. |
| 17 | med spa ai text messaging | podium.com (x2); player.fm | Low. Podium owns it. |
| 18 | hotel ai guest messaging | canarytechnologies.com; sabeeapp.com; hoteltechreport.com | Low-mid. Canary owns it. |
| 19 | airbnb ai guest messaging automation | hospitable.com; runnr.ai; blog.fastbots.ai | Mid. |
| 20 | whatsapp chatbot shopify | magecomp.com; livechatai.com; apps.shopify.com/mercately-1 | Mid. |
| 21 | gorgias alternative | gartner.com; costbench.com (x2) | Low-mid, high intent. Good comparison-page target. |
| 22 | postscript alternative sms | yotpo.com (x2); getapp | Low, high intent. Good comparison-page target. |
| 23 | attentive alternative | emitrr.com; alternativeto.net; agilebrandguide.com | Low-mid, high intent. |
| 24 | ai shopping assistant for ecommerce | substack; constructor.com; experro.com | Mid. Enterprise vendors. |
| 25 | telegram bot for business customers | sinch.com; helpdesk.com; respond.io | Mid. |
| 26 | sendblue alternative imessage | sendblue.com/compare (x2); blooio.com/alternatives | Low. Vendor comparison pages dominate. |
| 27 | ai text message marketing ecommerce | myaifrontdesk.com; trymaverick.com; bloomreach.com | Low. |
| 28 | rcs business messaging shopify | appnavigator.io (Zammer RCS); getkanal.com (x2) | Low, emerging. |
| 29 | turn website into ai agent | kommunicate.io; aimdoc.ai; hostinger.com/web2agent | Low-mid. Matches our core promise exactly. |
| 30 | imessage ai assistant for business customers | sendblue.com; **bland.ai/product/bland-imessage**; botscrew.com | Low. **Direct competitors: Bland iMessage, Comms by Osis (Product Hunt; free up to 3k messages, then $50/month), DM Champ (beta).** |

**Takeaways**
- The iMessage queries are a two-vendor SERP (Sendblue and Blooio, plus Linq and Photon). Those are API sellers, not merchant-facing agents.
- Long-tail merchant queries have weak SERPs and are winnable with merchant-facing pages: "imessage chatbot", "ai customer service texting", "gorgias/postscript alternative", "turn website into ai agent".
- Shopify App Store listings rank on Google for "sms chatbot shopify" and "ai sales agent shopify".

### B6. Launch channels

**Product Hunt**
- Databox analysed 4,962 launches from 2026-01-01 to 2026-09-01 (published about Sep 2026): https://www.producthunt.com/p/databox/best-day-to-launch-on-product-hunt-here-s-what-4-962-launches-in-2026-actually-show-2

  | Day | Median points to reach top 5 | Launches per day |
  |---|---|---|
  | Saturday | **165** (easiest) | 10.7 |
  | Friday | 205 | — |
  | Tuesday | 210 | 30.4 |
  | Monday | 220 | — |
  | Thursday | 235 | — |

- These are points, not upvotes. Upvote benchmarks are **[2nd]**: top-of-day products average about 750-1,200 upvotes, and #1 needs about 1,200-1,800. https://screenhance.com/blog/product-hunt-launch-checklist-2026
- Launch at 12:01am PT. Self-hunting is fine. Votes from brand-new accounts are discounted. Plan about 2 weeks of prep. https://app.getlaunchlist.com/blog/how-to-launch-on-product-hunt-2026 **[2nd]**
- Listing is free.

**Show HN** (https://news.ycombinator.com/showhn.html, accessed 2026-10-10)
- It must be something people can try now, ideally "without barriers such as signups or emails".
- Landing pages, signup pages and fundraisers are not allowed.
- Don't ask friends to upvote.
- **Implication:** we need a no-signup demo, for example "text this number" or a public demo agent.

**r/shopify**
- Third-party summaries describe it as strictly no-promotion. Developers are pointed to **r/ShopifyApps**, which allows one promotional or validation post a month and requires you to disclose your relationship to the app. https://thehiveindex.com/communities/r-shopify/ and https://gummysearch.com/r/ShopifyApps **[2nd]**
- Reddit blocked our direct fetch. **Verify the sidebar by hand.**

**r/ecommerce**
- Self-promotion is banned, including DMs and referrals. Violating it means removal and a ban.
- Accounts need to be 10+ days old with 10+ comment karma.
- Source: mirror of the rules, March 2025: https://redlib.hbubli.cc/r/ecommerce **[2nd]**

**Indie Hackers**
- Free. Use a "Show IH" post with metrics and a specific ask. Avoid bare links. https://sharedcontext.ai/skills/external/sales-skills/sales-indiehackers **[2nd]**

**Directories** (prices from https://orangebot.ai/blog/where-to-submit-your-ai-tool-2026, read off each site on 2026-08-18, and https://saascity.io/directories/theresanaiforthat, Oct 2026; all **[2nd]**)

| Directory | Cost |
|---|---|
| BetaList | $129 to skip the queue. The free queue (2-3 months) is now reportedly paid-only. https://www.flowjam.com/blog/beta-list-submission-guide-2024-get-featured-fast |
| There's An AI For That | $49 basic; $347-437 with newsletter. The only free route is a monthly X thread. |
| Futurepedia | $197 (own Gumroad page, https://futurepedia.gumroad.com/l/submit-tool) to $247/$497 (Orangebot) |
| Toolify | $99 (third-party sources) or $149 (its own submit page) |
| SaaSHub | Free |
| AlternativeTo | Free, community-edited |
| G2 and Capterra | Free basic vendor profile; paid tiers for leads. Capterra charges pay-per-click. Profile submission is free. https://createandgrow.com/free-resources/ **[2nd]** |
| Uneed | $14.99-29.99 |
| Fazier | free (backlink required) to $119 |
| Microlaunch, DevHunt | Free |

### B7. Shopify App Store

**Terms and requirements**
- **Partner account:** free to join. Distributing to multiple merchants through the App Store needs a **one-time $19 registration**.
- **Revenue share:** **0% on the first $1M of lifetime gross app revenue** (counted from 2025-01-01), then **15%**. A 2.9% processing fee applies to all billing. Developers with $20M+ App Store revenue or $100M+ company revenue pay 15% on everything. https://shopify.dev/docs/apps/launch/distribution/revenue-share (accessed 2026-10-10). Older blogs citing 20% are out of date.
- **Review steps:** Draft, then Submitted, then Paused or Reviewed, then Published. Shopify publishes no SLA. https://shopify.dev/docs/apps/launch/app-store-review/review-process
- **Review timing in practice:** the long-standing guidance was 5-10 business days. **Forum reports from Mar-May 2026 say 2-6+ weeks**, a backlog Shopify staff acknowledge. A failed review goes back in the queue. https://community.shopify.dev/t/longer-app-store-review-times-what-you-need-to-know/31728 and https://www.growave.io/blog/how-long-does-shopify-app-review-take
- **Built for Shopify** requires:
  - 50+ net installs from paid-plan shops, 5+ reviews and a minimum recent rating.
  - Admin web vitals at p75: LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms.
  - Storefront Lighthouse score may not drop by more than 10 points.
  - Embedded App Bridge, theme app extensions and a Polaris-like design.
  - Source: https://shopify.dev/docs/apps/launch/built-for-shopify/requirements

**Categories to list in and top competitors** (fetched 2026-10-10; order is the default listing order)

*Store management > Support > Chat: **996 apps*** (https://apps.shopify.com/categories/store-management-support-chat/all)

| App | Rating | Reviews | Price |
|---|---|---|---|
| Shopify Inbox | 4.6 | 5,811 | free |
| Chatty AI Chatbot (Built for Shopify) | 4.9 | 1,876 | Free; $19.99 / $68.99 / $199 a month for 100 / 500 / 1,000 AI conversations; $0.40 overage |
| Dondy (WhatsApp) | 4.9 | 819 | free plan |
| Gorgias | 4.3 | 705 | $10 / $60 / $360 / $900 a month |
| Moose AI Chatbot | 5.0 | 482 | free plan |
| Commslayer AI Helpdesk | 4.9 | 234 | free plan |

*Store management > Support > Helpdesk: **258 apps*** (https://apps.shopify.com/categories/store-management-support-helpdesk/all)

| App | Rating | Reviews | Price |
|---|---|---|---|
| Tidio (Built for Shopify) | 4.8 | 1,354 | Free; $29; Lyro AI $39 a month for 200 conversations |
| Redo | 4.9 | 801 | — |
| Zipchat AI | 4.9 | 208 | — |
| Flyweight | 4.8 | 124 | — |
| Chatbase | 4.9 | 39 | — |

*Marketing and conversion > SMS marketing: **162 apps*** (https://apps.shopify.com/categories/marketing-and-conversion-marketing-sms-marketing/all)

| App | Rating | Reviews | Price |
|---|---|---|---|
| Shopify Messaging | 4.8 | 4,633 | — |
| Klaviyo | 4.7 | 3,365 | — |
| Omnisend | 4.7 | 3,188 | — |
| Brevo PushOwl | 4.8 | 2,299 | — |
| Mailchimp | 4.8 | 1,514 | — |
| Postscript | 4.7 | 1,207 | see A2 |
| TxtCart AI | 4.9 | 546 | Now marked "not currently available" on its listing |
| Yozo (Email, SMS, CX AI Agent) | 5.0 | 14 | $50/month |
| Attentive | 4.7 | 112 | — |

*Store management > Support > FAQ: 138 apps.* Buddy AI: Agentic Commerce has a 4.8 rating from 71 reviews.

*AI sales agents:*

| App | Rating | Reviews | Price | Source |
|---|---|---|---|---|
| Rep AI | 4.7 | 109 | $29-$250+ a month; sources conflict **[2nd]** | https://apps.shopify.com/rep-ai-sales-associate |
| Bearworks, Big Sur AI, Express Agent | small review counts | — | — | — |

**Positioning gap**
- No app in these categories offers **iMessage**.
- WhatsApp is crowded: Dondy, Moose, CK, Wa and DC.
- SMS AI comes bundled from incumbents: Postscript Shopper and Gorgias AI Agent on SMS.
- **We suggest listing primary in Chat and secondary in SMS marketing.**

---

## Open items worth paying for or checking by hand
1. Real keyword volumes. Use an Ahrefs or Semrush trial, or Google Keyword Planner on an Ads account.
2. Overlap between Gorgias and Postscript stores, from a StoreLeads paid filter combining both technologies with country US.
3. Official Census CBP and NES 2023 counts. The API needs a free key, which we did not request.
4. The live sidebar rules for r/shopify and r/ecommerce.
