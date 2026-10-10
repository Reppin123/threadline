# Outbound: demo-first, founder-led

Status: drafts only. Nothing here has been sent. Every send needs Aki (see launch/NEEDS-AKI.md).
Wedge ICP: US Shopify DTC brands, ~$1M to $20M revenue, considered-purchase catalog, already paying for a helpdesk or SMS tool
(Gorgias, Postscript, Attentive, Klaviyo SMS). Full definition and sizing: [ICP.md](ICP.md). Price points: [PRICING.md](PRICING.md).

## 1. The motion: "we built your bot already"

Most cold email asks for a call. Ours hands over a working product. Threadline can build and test a bot from a URL with no
input from the owner, so the first email links to *their* bot, already answering questions about *their* catalog.

1. **Pull** a store list filtered by installed app (Gorgias / Postscript / Attentive) and US.
2. **Qualify** automatically (section 3). Drop anything that fails.
3. **Pre-build**: run the normal wizard path headlessly with the store URL (`enqueueJob("build_bot", …)` under a house
   "prospects" account), then a short check run. Keep only bots that score at least 85% on checks and answer 3 spot questions about
   real products correctly. Measured cost (data/threadline.db `usage`, Oct 7 2026): build about $0.10, test reply about $0.011 each.
   A 30-question quick check is about $0.45 per store all in; the full check suite is about $1.63.
4. **Share page**: each bot gets a public `/t/<slug>` page ("Get <Store> assistant on iMessage": phone field + consent) plus a
   Telegram `t.me` link and a 20-second screen recording of the bot answering a real question from their site.
5. **Email** from the founder with the link and one real answer the bot gave, quoted inline.
6. **Watch**: when the prospect texts their bot, Slack/email alert to the founder; follow up within 1 hour, referencing what they asked.
7. **Hand over**: "Claim this bot" moves it from the prospects account into the brand's new account (Free plan), keeping the build.

Why it works for us specifically: the expensive part of a competitor's sales cycle (Flow says "we come back to you by email,
usually within a business day, with what we'd build", research/flow/home.txt) is the part we automate for under $2.

Product prerequisites (not built yet, checked 2026-10-10 in apps/web/app; requested in COORDINATION.md):
- Public share page `/t/<slug>` (planned in the 2026-10-07 coordination note but not in the repo). Until it ships, use the Telegram
  `t.me` link plus the owner "Text me my bot" invite run by the founder for prospects who reply.
- House "prospects" account + headless build script (worker already exposes `build_bot`; needs a CLI wrapper that takes a URL list).
- "Claim this bot" transfer from the prospects account to a new user (one SQL update of `bots.user_id` behind an admin route).
- Alert when a prospect bot gets its first inbound message (events table already records messages).

Constraints to respect:
- iMessage on Photon's shared pool means the bot texts the prospect first after they enter their number on the share page.
  On Photon Free only allowlisted handles can receive messages, so outbound cannot start before a Pro ($25/mo, 100 users) or
  Business ($250/line/mo) Photon plan is live (photon.codes/pricing). Telegram links work today with no plan change.
- Prospect bots are built from public pages only, never placed in front of the store's real customers, and are deleted
  after 30 days if not claimed. Say this in the email footer.
- Respect robots.txt (core already applies RFC 9309) and stop crawling any domain that opts out.
- Cold B2B email in the US: CAN-SPAM (accurate sender, physical postal address, working one-click unsubscribe, honor within 10 days).
  Legal agent owns the policy review; this plan assumes their sign-off before send.

## 2. Lead sources and how to pull them

| Source | What we pull | How | Cost (checked 2026-10-10) |
|---|---|---|---|
| StoreCensus | Shopify stores filtered by installed app (Gorgias, Postscript, Attentive), country US, est. revenue, product count, decision-maker contacts | Professional plan: filter, CSV export, Instantly integration | $99/mo Professional, 5,000 credits (storecensus.com/pricing) |
| Store Leads | Same, with app filters and traffic rank; backup source | Pro plan has CSV export + API | $250/mo Pro, $75 Premium has no export (third-party listing, coldiq.com/blog/storeleads-pricing; official page did not load) |
| Shopify App Store reviews | Brands that publicly reviewed Gorgias / Postscript / Attentive apps (review shows store name) | Read apps.shopify.com/<app>/reviews, filter to US, last 12 months | Free, manual, ~60 names/hour |
| Google Maps engine | Local secondary ICP (salons, med spas, boutique hotels) with website + phone | Our own crawler over Places results for "<category> in <city>" in 20 metros; keep ones with booking links | Google Places API pay-as-you-go; budget estimate $50/mo |
| LinkedIn (manual) | Founder / Head of CX / Head of Ecommerce at the shortlisted store | Sales Navigator not needed for month 1: search company page → People, record name + title only | Free (manual) |
| Apollo free tier / StoreCensus contacts | Work email for founder or CX lead | Verified emails only; skip catch-all domains | Free tier, then reassess |
| Our own site | Inbound signups who did not build | Already in DB | $0 |

Sample of 30 hand-qualified leads: [sample-leads.csv](sample-leads.csv).

## 3. Qualification signals (score 0 to 10, send at 6+)

| Signal | Points | How we detect it |
|---|---|---|
| On Shopify, US shipping | gate | `/products.json` responds; shipping page mentions US |
| Gorgias, Postscript, Attentive or Klaviyo SMS installed | +3 | Script tags on homepage / StoreCensus app filter |
| 20 to 2,000 products | +2 | `/products.json?limit=250` paging |
| Considered purchase (tea, coffee, skincare, supplements, pet, specialty food, apparel fit, outdoor) | +2 | Product types / collection names |
| FAQ, size guide or "how to choose" pages | +1 | Sitemap paths |
| Public "text us" number or SMS popup | +1 | Contact page, popup script |
| Founder reachable (named founder on About page or LinkedIn) | +1 | About page |
| Disqualify: Shopify Plus enterprise (10k+ products, retail chain), adult, firearms, cannabis/CBD, Rx | out | Category + legal AUP |

## 4. Cold email sequences (drafts, never sent)

Placeholders: `{first_name}`, `{store}`, `{hook}` (from sample-leads.csv `first_line_hook`), `{question}` and `{bot_answer}` (a
real Q&A from the prospect's pre-built bot), `{link}` (share page), `{founder}` (Aki). Plain text, no images, no tracking pixel,
one link. Every email ends with the sender's postal address and "Reply 'no' and I won't email again."

### Sequence A: "Your bot is live" (primary, demo-first; Gorgias / Postscript stores)

**Email 1, day 0.** Subject: `{store} on iMessage`
> Hi {first_name},
>
> {hook}. I built a texting assistant for {store} from your public site to see if it could handle real shopper questions.
>
> I asked it: "{question}"
> It replied: "{bot_answer}"
>
> You can text it yourself here: {link}. Put in your number and it texts you on iMessage in a few seconds.
>
> It only knows what is on your site, it isn't connected to your customers, and I delete it in 30 days unless you want it.
> If it gets something wrong, tell me what and I'll show you how fast it learns.
>
> {founder}
> Threadline

**Email 2, day 3.** Subject: `re: {store} on iMessage`
> One more test I ran: a shopper typing half in shorthand who changes their mind mid-order. It saved the order to a table you
> can export and asked for the shipping zip before confirming. Took 4 seconds.
>
> Your Gorgias inbox would only see the conversations it hands off. Worth a 2-minute look? {link}

**Email 3, day 7.** Subject: `what it costs`
> Short version of the math: Gorgias AI Agent is $0.90 to $1.00 per automated interaction (gorgias.com/pricing). Threadline
> starts free, and paid plans start at $29 a month with conversations included.
>
> The difference that matters more: it runs in the customer's texts, not a widget they closed.
> Happy to switch your bot on for your own customers this week if you want to try it on 50 real conversations.

**Email 4, day 14 (breakup).** Subject: `deleting {store}'s bot`
> I'll delete the bot I built for {store} on {date}. If you want to keep it, reply "keep" and it moves to your own free account
> with everything it learned. Either way, thanks for reading.

### Sequence B: "Questions your inbox answers twice" (no pre-built bot yet; stores with FAQ-heavy catalogs)

Used when the pre-build fails checks (thin site, heavy JS) or for the Klaviyo-only segment.

**Email 1, day 0.** Subject: `"which one should I get?"`
> Hi {first_name}, {hook}.
> Stores with catalogs like yours get the same 10 pre-purchase questions on repeat. We built Threadline to answer those in the
> customer's own texts (iMessage and Telegram), using only what is on your site, and to save orders to a table.
> If you reply "build it", I'll send you a working one for {store} tomorrow. No call, no card.

**Email 2, day 4.** Subject: `re: "which one should I get?"`
> The part most owners ask about: what happens when it doesn't know. It says so and hands the thread to you, it doesn't guess.
> Every release is tested against simulated shoppers first (typos, mind-changes, prompt injection). Want me to build {store}'s?

**Email 3, day 10.** Subject: `closing the loop`
> Last note from me. If texting isn't a channel for {store} right now, no problem. If it becomes one, threadline (link) builds a
> bot from your URL in about two minutes.

### Sequence C: "Telegram first" (international DTC, UK/EU/India brands with a Telegram audience)

**Email 1, day 0.** Subject: `{store} on Telegram today`
> Hi {first_name}, {hook}. Your shoppers on Telegram can now ask your store anything and get an answer from your own catalog.
> I built one from your site: {telegram_link}. Tap it, ask about any product.
> Setup on your side is pasting one BotFather token. Free while you try it.

**Email 2, day 4.** Subject: `re: {store} on Telegram today`
> It also takes orders into a table you can export and sends reminders you schedule. WhatsApp is next on our list; reply if
> that's the channel you actually want and I'll put {store} on the early list.

**Email 3, day 10.** Subject: `last one`
> I'll take the {store} bot down on {date} unless you want it. Reply "keep" and it's yours.

## 5. DM sequences (LinkedIn and X, drafts, never sent)

Rules: founder's personal account, connect or follow first, never pitch in the connection note, max 20 new DMs/day on LinkedIn.

### DM 1: LinkedIn (founder or Head of CX at a qualified store)
1. Connection note: `Hi {first_name}, I build texting assistants for Shopify brands and {store} came up in my research. Would like to connect.`
2. After accept, day 1: `Thanks for connecting. I built a quick iMessage assistant for {store} from your public site, mostly to see if it could handle your product questions. Want the link? It only knows your public pages.`
3. If yes: the share link plus one real Q&A it answered.
4. Day 7 if no reply: `No worries if not a priority. I'll keep it up until {date} in case you want to try it.`

### DM 2: X (build-in-public, brands that post about CX or retention)
1. Reply publicly to one of their posts with something useful (no pitch).
2. Day 2 DM: `Your post about {topic} got me curious, so I pointed Threadline at {store}. It's answering questions from your catalog over iMessage now: {link}. Free to keep if useful.`
3. Day 6: share a 20-second clip of their bot answering, tag nothing, DM only.

## 6. Funnel and volume (targets, Phase 2 measures them)

| Stage | Per month (steady state, from month 2) | Rate | Basis |
|---|---|---|---|
| Stores pulled (US, app-filtered) | 1,500 | | StoreCensus Professional credits |
| Pass qualification (score 6+) | 1,000 | 67% | estimate |
| Pre-built bot passes checks | 800 | 80% | build success on sites seen so far; estimate |
| Contacted (verified email) | 700 | 88% | estimate |
| Open the share link | 105 | 15% of contacted | target (demo link in plain-text email) |
| Text the bot / Telegram | 56 | 53% of clickers | target |
| Claim bot (Free account) | 21 | 3% of contacted | target |
| Connect real customers (Starter trial) | 12 | 57% of claims | target |
| Paid | 6 | 50% of trials | target |

Benchmarks to judge against: replies to cold B2B email typically land around 1% to 5%; we call the motion working if claims
reach 3% of contacted by week 8 (see PLAN-90D.md).

Cost per month at that volume:

| Line | Cost |
|---|---|
| StoreCensus Professional | $99 |
| Instantly Growth (unlimited inboxes + warmup, 5,000 emails, 1,000 contacts) | $47 (instantly.ai/pricing) |
| Google Workspace, 6 inboxes × Business Starter | $42 ($7/user/mo, workspace.google.com/pricing) |
| 3 secondary domains | ~$3/mo amortized (~$12/yr each, estimate) |
| Pre-builds: 1,000 × $0.45 quick check | $450 |
| **Total** | **~$641/mo** |

CAC at 6 paid/month: ~$107 in cash cost (founder time excluded). At a Growth-plan average of $149/mo (PRICING.md), payback is
about 1 month of gross profit. If the funnel underperforms, cut pre-builds to the top 300 scored stores first (saves $315/mo).

## 7. Sending infrastructure and domain warmup

- Never send cold email from the product domain. Buy 3 lookalike domains (e.g. `try<brand>.com`, `get<brand>.com`,
  `<brand>hq.com`) once the domain agent picks the name; 2 inboxes each on Google Workspace (6 total). Each domain redirects to the main site.
- SPF, DKIM, DMARC (`p=none` to start, then `quarantine`) on every sending domain; custom tracking domain off (no open tracking).
- Warmup: Instantly warmup on all 6 inboxes for 21 days before the first cold send.
- Ramp: week 1 of sending, 10 cold emails per inbox per day; week 2, 20; week 3 onward, 30 max. 6 inboxes × 30 × 21 sending days
  = 3,780 emails/month, enough for 700 contacts × 3 to 4 touches.
- Health gates: pause an inbox if bounce > 2% (our rule of thumb) or user-reported spam rate approaches 0.1% (Google asks senders to stay below 0.1% and never reach 0.3%, support.google.com/a/answer/81126);
  verify every address before upload; plain text only.
- Suppression list shared across all inboxes and the product (anyone who says no is never contacted again on any channel).

## 8. What Aki must do before the first send
Listed in launch/NEEDS-AKI.md: buy sending domains + Workspace inboxes, StoreCensus + Instantly subscriptions, move Photon to Pro or
Business so share-page invites reach unregistered phones, postal address for the footer, and personally approve the first 20 emails.
