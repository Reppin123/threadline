# Domain and name report (domain agent, 2026-10-10)

## TL;DR

- **Threadline cannot get a good home.** threadline.com (since 1999), .ai, .app, .io, .co, .dev, .net and every get/use/try/hq .com are taken. At least 8 live products and 9 iOS apps already use the name. Two US trademark filings for THREADLINE-based SaaS in class 42 predate us. We would be renting a crowded name we can never own.
- **Recommendation: rename before launch to HeyBell.** Primary domain **heybell.app**, plus **getheybell.com** as a redirect and fallback. Cost at Cloudflare: $18.66 for the first year, $24.66/yr after that. heybell.com is for sale on HugeDomains at **$3,595** (or $149.79/mo for 24 months). Buy it after first revenue, not now.
- Runners-up: **#2 Kindbubble** (kindbubble.com is free, $10.46/yr), **#3 Texthouse** (texthouse.app / .ai free).
- If Aki vetoes the rename: keep Threadline on **threadline.chat** ($35.20/yr at Cloudflare). Accept the SEO and trademark risk below.
- **Urgent, separate from the rename:** the app currently uses `hello@threadline.app` (site contact, billing "Talk to us", the wizard, the WhatsApp waitlist) and `login@threadline.app` (Resend default `EMAIL_FROM`). **threadline.app belongs to someone else**, an email-timeline startup, and it has live MX records (Cloudflare Email Routing). Customer emails to that address are delivered to a stranger right now. Flagged to production/web in COORDINATION.md.

## Method

- **Availability:** RDAP from the registry endpoints listed in IANA's bootstrap file (https://data.iana.org/rdap/dns.json). A 404 means not registered. For .so, .co, .io, .sh, .me and .us I used registry `whois`. Checked live on 2026-10-10 around 18:30 UTC. Rate-limited answers were retried until they were definitive.
- **Prices:**
  - Cloudflare Registrar at-cost prices, from https://cfdomainpricing.com (updated 2026-10-10, auto-synced from Cloudflare).
  - Porkbun's public pricing API (`POST https://api.porkbun.com/api/json/v3/pricing/get`).
  - Namecheap prices from https://domainoffer.net/tld/<tld>/namecheap. Namecheap's own pages block scripts.
  - Format below is first year / renewal.
- **Premium:** Cloudflare and GoDaddy domain search sit behind bot challenges, so I could not read registry-premium flags for unregistered names. Coined compounds like these are almost never registry-premium. Still, **Aki must confirm the checkout price equals the standard price below before paying.** Aftermarket prices come from the marketplace page where one was readable.
- **Trademarks:** the USPTO trademark search backend (tmsearch.uspto.gov, same Elasticsearch API the site uses). I checked wordmark and description matches, and focused on live marks in classes 9 (software), 35, 38 (telecom/messaging) and 42 (SaaS). This is screening, not legal clearance. The legal agent or a trademark attorney should run a full search on the final name before filing.
- **Conflicts:**
  - Fetched every taken threadline.* site.
  - App Store via the iTunes Search API. Google Play search page.
  - Web search.
- **Handles:**
  - X: `api.x.com/i/users/username_available.json`.
  - GitHub: `api.github.com/users/<h>`.
  - Instagram: profile page og:title.
  - LinkedIn: `/company/<h>`. 404 means free. I confirmed `google` returns 200 and a random slug returns 404.

## 1. Threadline: availability and price

Cloudflare prices: .com $10.46/$10.46, .ai $80/$80 (2-year minimum, so $160 up front), .app $8.20/$14.20, .chat $35.20/$35.20, .co $30/$30, .io $32/$50, .sh $45/$45.

| Domain | Available? | Registered / registrar | What's there |
|---|---|---|---|
| threadline.com | No | 1999-05-18, Network Solutions, exp 2028-05-18 | No website. NS at nameserve.net, likely a long-held portfolio name. Not listed on Sedo; Afternic and Dan did not respond. Expect a 5-figure ask if it is for sale at all (estimate based on age and dictionary-like name). |
| threadline.ai | No | 2024-10-14, GoDaddy, **expires 2026-10-14** | "ThreadLine, your personalized task manager" (live site). Could drop if not renewed. If so, it reaches public drop around late Nov to Dec 2026 after grace and redemption (estimate). A backorder is the only cheap path. |
| threadline.app | No | 2025-03-13, Cloudflare | **ThreadLine: "Turn email threads into a timeline of facts"** (HR and legal investigations). Has MX, so mail to @threadline.app reaches them. |
| threadline.io | No | 2025-11-22 | No site responding. Cloudflare NS. |
| threadline.co | No | 2020-07-05 | Redirects to threadlinebranding.com ("Narrative Psychology & Brand Strategy") |
| threadline.dev | No | 2025-06-11, GoDaddy | No site |
| threadline.net | No | 2024-08-23, Squarespace | No site |
| threadline.to | No | 2026-03-13, Namecheap | **"Threadline: Persistent Memory for AI Agents"** (threadline-sdk) |
| threadline.me / .us / .xyz | No | 2026 registrations | No sites |
| **threadline.chat** | **Yes** | | $35.20/yr Cloudflare. Porkbun $5.66 then $40.68. Namecheap $5.98 then $65.98 |
| threadline.so | Yes | | Not sold by Cloudflare or Porkbun |
| threadline.sh | Yes | | $45/yr Cloudflare |
| threadline.inc | Yes | | Porkbun $257.98, renewal $2,060.25. Not worth it |
| getthreadline.com | No | 2025-05-30 | "Threadline. Find out what AI can actually do for your firm" (AI consultancy) |
| usethreadline.com | No | 2025-08-29 | "Threadline: Mockup & Artwork Proofing Software" ($199/mo) |
| trythreadline.com | No | 2025-11-29 | **"Threadline CX: AI Customer Experience Intelligence"** (AI over support conversations) |
| threadlinehq.com | No | 2026-01-08 | "Threadline: managed authority system for expert-led B2B firms" |
| threadlineapp.com | No | **2026-10-09 (yesterday)** | "Threadline: every conversation, one clear line" (LinkedIn and mail triage) |
| threadlineai.com | No | 2025-08-02 | Same product as threadlineapp.com |
| gothreadline.com, jointhreadline.com, textthreadline.com | Yes | | $10.46/yr. All weak, prefix-heavy |

## 2. Name conflicts and trademark risk for "Threadline"

**Live products named Threadline (8 websites):**
- threadline.app: email timeline, HR and legal
- threadline.to: AI agent memory SDK
- trythreadline.com: AI customer-experience analytics over support conversations. This is closest to us and directly overlaps "customer conversations + AI".
- threadlineapp.com / threadlineai.com: conversation triage
- threadlinehq.com: B2B authority marketing
- usethreadline.com: proofing software
- getthreadline.com: AI consultancy
- threadline.ai: task manager

Also threadlinebranding.com, and Threadline Products Inc (steel).

**App Store:** 9 iOS apps named Threadline or Threadline-something:
- ThreadLine Puzzle
- Threadline Daily Puzzle
- Threadline: Quilt Planner
- Threadline: Dating Journal
- Threadline: Flow Puzzle
- Threadline: Needle Game
- Threadline: AI Stylist
- Threadline&MoodNest
- "Threadline."

Source: `itunes.apple.com/search?term=threadline`. No direct messaging-app clash. Google Play search shows no exact "Threadline" app.

**USPTO** (15 THREADLINE records, 7 live):
- **THREADLINE STUDIO**, serial 99652761: class 42, "SaaS featuring software using artificial intelligence for video analysis and editing". Filed 2026-02-13, **Notice of Allowance issued**.
- **THREADLINE SYSTEMS**, serial 99758031: class 42, SaaS for data intelligence and financial data. Filed 2026-04-11, non-final action.
- THREADLINE (reg. 2023, steel fabrication, classes 6/40), THREADLINE WEALTH and TL THREADLINE (class 36), THREADLINE HOTEL (class 43). These are unrelated classes.

**Rating: HIGH for registering, MEDIUM for using.** We would file THREADLINE in classes 9/42/38 for AI messaging software. Two earlier-filed THREADLINE-plus-generic-word marks for AI and SaaS software in class 42 make a likelihood-of-confusion refusal (Section 2(d)) probable. We could probably keep using the name; nobody holds bare THREADLINE in software. But we could not stop the next Threadline, and Threadline CX owns the "customer conversations" mindshare. Meta's **Threads** adds a second, more famous "thread" association in messaging.

**SEO:** with 8+ namesakes and Meta Threads, ranking for our own brand name would take years.

Conclusion: the good Threadline options are taken and the name is risky. A rename is cheapest now: before launch, before outbound, before the Shopify listing and Product Hunt.

## 3. Alternatives (32 names, checked live)

Brief: "your app, on iMessage / text your business like a friend". The SMB owner gets a bot customers text like a friend (iMessage, Telegram). The ICP is US Shopify and local stores (launch/gtm).

Columns: availability of name.com / .ai / .app / .chat / getname.com (Y = free, n = taken). Price is the cheapest sensible primary domain at Cloudflare (first year / renewal). Trademark screening covers live USPTO marks in classes 9/35/38/42 plus known products.

| # | Name | .com | .ai | .app | .chat | get.com | Primary domain, price/yr | Premium? | TM risk | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **HeyBell** | n (HugeDomains **$3,595**) | Y | Y | Y | Y | heybell.app $8.20 / $14.20 | Standard (confirm at checkout). .com is aftermarket | **Low** | No HEYBELL/HEY BELL marks. BELL marks found are helmets/electrical/construction; one BELL telecom application is suspended. HELLOBELL (reg., paging equipment, Korea) is a different word. No app, no company. "Hey" is how you text a friend; the bell is the shop counter bell. |
| 2 | **Kindbubble** | **Y** | Y | Y | Y | Y | kindbubble.com $10.46 / $10.46 | Standard | **Low** | Only strong candidate with the exact .com free. "Bubble" evokes the message bubble without using Apple's marks. Softer and longer to say. |
| 3 | **Texthouse** | n (parked, domainca) | Y | Y | Y | Y | texthouse.app $8.20 / $14.20 | Standard | Low-Med | No marks. Fairly descriptive, so weaker protection. LinkedIn page "Texthouse" and the GitHub org exist (both dormant-looking). |
| 4 | Heyusual | **Y** | Y | Y | Y | Y | heyusual.com $10.46 | Standard | Low | Strong idea ("the usual?" said by regulars) but reads oddly as a brand. usual.ai/.app/.com are all taken. |
| 5 | Heyfront | n (Atom marketplace, price hidden) | Y | Y | Y | Y | heyfront.app $8.20 / $14.20 | Standard | Medium | "Your storefront, in their texts." Front (frontapp.com) owns "customer communication". Too close. |
| 6 | Textstoop | **Y** | Y | Y | Y | Y | textstoop.com $10.46 | Standard | Low | Neighborly stoop chat. Awkward spelling and a double "t". |
| 7 | Textbird | n (parked at Afternic, price hidden) | Y | Y | Y | Y | textbird.app $8.20 / $14.20 | Standard | **Medium** | MESSAGEBIRD is registered in classes 9/38/42 (Bird, a business-messaging company). TEXT ≈ MESSAGE plus BIRD invites a 2(d) citation. |
| 8 | Replyfolk | n | Y | Y | Y | Y | replyfolk.app $8.20 / $14.20 | Standard | Medium | folk CRM, plus getfolk.app (an AI assistant in iMessage/Telegram), an adjacent product |
| 9 | Textfolk | n | Y | n | Y | Y | textfolk.ai $160 / 2 yrs | Standard | Medium | Same "folk" conflict. textfolk.com is parked at Porkbun |
| 10 | Storetext | n | Y | Y | Y | Y | storetext.app | Standard | Low | Descriptive, weak mark |
| 11 | Textmybiz | n | Y | Y | Y | Y | textmybiz.app | Standard | Low | Descriptive, spammy feel |
| 12 | Bizbubble | n | Y | Y | Y | Y | bizbubble.app | Standard | Low | B2B-sounding |
| 13 | Pinghouse | n | Y | Y | Y | Y | pinghouse.app | Standard | Low | "Ping" reads as dev/infra |
| 14 | Texthello | n | Y | Y | Y | Y | texthello.app | Standard | Low | Generic |
| 15 | Textkind | n | Y | Y | Y | Y | textkind.app | Standard | Low | Sounds like a font tool |
| 16 | Replykind | n | Y | Y | Y | Y | replykind.app | Standard | Low | OK. Weaker than Kindbubble |
| 17 | Kindreply | n | Y | n | Y | Y | kindreply.ai | Standard | Low | .app taken |
| 18 | Pocketfront | n | Y | n | Y | Y | pocketfront.ai | Standard | Low | .app taken |
| 19 | Sidetext | n | Y | n | Y | Y | sidetext.ai | Standard | Low | Sounds like a side-chat feature |
| 20 | Hailtext | Y | Y | Y | Y | Y | hailtext.com $10.46 | Standard | Low | "Hail" sounds like weather or Uber |
| 21 | Textchum | Y | Y | Y | Y | Y | textchum.com | Standard | Low | Dated |
| 22 | Textknock | Y | Y | Y | Y | Y | textknock.com | Standard | Low | Clunky |
| 23 | Nooktext | Y | Y | Y | Y | Y | nooktext.com | Standard | Low | Barnes & Noble NOOK association |
| 24 | Textneighbor | Y | Y | Y | Y | Y | textneighbor.com | Standard | Low | Too long (12 letters) |
| 25 | Textpatron | Y | Y | Y | Y | Y | textpatron.com | Standard | Low | Patreon association |
| 26 | Textdove | Y | Y | Y | Y | Y | textdove.com | Standard | Low | Dove (Unilever) association |
| 27 | Bubblewren | Y | Y | Y | Y | Y | bubblewren.com | Standard | Low | Pretty but meaningless for SMBs |
| 28 | Shopbell | n | n | n | Y | n | shopbell.chat $35.20 | Standard | Low | Only .chat left |
| 29 | Regulars | n | n | n | Y | n | regulars.chat $35.20 | Standard | **Med-High** | REGULARS application (class 42, Cloudbased LLC); GlossGenius "...turns clients into regulars" |
| 30 | Friendline | n | Y | n | n | Y | friendline.ai | Standard | **High** | FRIENDLINE is registered in class 9 (social networking app) |
| 31 | Dotdot | n | n | n | n | Y | getdotdot.com | Standard | **High** | DOTDOT is registered by the Zigbee Alliance in classes 9/38/42 |
| 32 | Threadline (keep) | n | n | n | Y | n | threadline.chat $35.20 | Standard | **High (registration)** | See section 2 |

Also checked and fully taken across .com/.ai/.app (no row needed):
- textly, textable, heyline, replyline, kinly, saywell, sayhey, heylo, holla, hiya, chatfront, askbubble, bluebubble (also an open-source iMessage app)
- hellodesk, tripledot, nudgely, replybird, shopchat, usual, regular, pinned, kept, stoop, corner
- over 150 hey/hi/hello/text/reply/kind/bubble/chat/ask/say + noun .com combinations. All short .com combos were taken except the compounds listed above.

### Top 8 shortlist (why)

1. **HeyBell.** Short (7 letters), friendly, says itself after one hear ("hey bell dot app"). Clean on USPTO, web and App Store. Every key TLD is free; the .com has a fixed buy-now price to grow into. Tagline fit: "Ring your favorite shop. By text."
2. **Kindbubble.** Only top-tier name with the exact .com at $10.46. Clean marks. The bubble is the iMessage visual.
3. **Texthouse.** Plain-English, instantly says "the place you text". .app/.ai free. Low risk, but weaker distinctiveness.
4. **Heyusual.** Exact .com free and a great regulars story. Odd as a noun ("download Heyusual?").
5. **Textstoop.** Exact .com free. Neighborly. Spelling friction.
6. **Heyfront.** Best storefront metaphor, but Front owns "customer messaging".
7. **Textbird.** Memorable messenger-bird. MessageBird marks make it a filing risk.
8. **Replyfolk.** Warm, but "folk" is crowded by folk CRM and getfolk.app (iMessage AI).

## 4. Top 3 recommendation

| Rank | Name | Buy now (Cloudflare) | Year-1 cost | Renewal | Later |
|---|---|---|---|---|---|
| **#1** | **HeyBell** | heybell.app (primary: site, app, email) + getheybell.com (301 redirect, protects the .com typo path) | **$18.66** | $24.66/yr | heybell.com $3,595 buy-now at HugeDomains (https://www.hugedomains.com/domain_profile.cfm?d=heybell&e=com), when revenue allows. Optional defensive: heybell.chat $35.20, heybell.ai $160/2 yrs |
| #2 | Kindbubble | kindbubble.com | $10.46 | $10.46/yr | kindbubble.app $8.20 defensive |
| #3 | Texthouse | texthouse.app + gettexthouse.com | $18.66 | $24.66/yr | texthouse.com is parked (domainca); ask price unknown |

**Why #1 over #2:** HeyBell is shorter, easier to say aloud (it will be said on demos, podcasts and to shop owners on the phone), and more distinctive as a mark. Kindbubble's only edge is the $10 .com, and the HeyBell .com is purchasable later at a known price.

**Why .app as primary rather than .ai:**
- .app costs $8.20 vs $160 up front for .ai.
- It literally says "app".
- It is HSTS-preloaded, so HTTPS-only, which we already are on Cloudflare.
- Email from @heybell.app delivers fine with SPF/DKIM/DMARC.

### Handles for the top 3 (checked 2026-10-10)

| Handle | X | Instagram | LinkedIn page | GitHub |
|---|---|---|---|---|
| heybell | taken | taken ("hey bell S10", personal) | **free** | taken (dormant user, 0 repos, created 2024) |
| **heybellapp** | **free** | **free** | **free** | **free** |
| getheybell | free | free | free | free |
| heybellhq | free | free | free | free |
| kindbubble | taken | taken (personal) | free | taken (dormant user, 0 repos, 2022) |
| kindbubbleapp / getkindbubble | free | free | free | free |
| texthouse | taken | taken | **taken** (Texthouse company page) | taken (org) |
| texthouseapp / gettexthouse | free | free | free | free |

Recommendation for #1: claim **@heybellapp** on X, Instagram and GitHub, and **linkedin.com/company/heybell** (exact, free). Handle signups are free but create accounts and accept terms, so they go to Aki.

## 5. If Aki keeps "Threadline"

- Register **threadline.chat** ($35.20/yr Cloudflare) and use it for site and email.
- Do not file a trademark until counsel reviews the THREADLINE STUDIO and THREADLINE SYSTEMS citations.
- Watch threadline.ai: it expires 2026-10-14 at GoDaddy. A backorder (DropCatch or SnapNames, typically $59 to $69, estimate) is the only cheap chance at a better TLD.
- Fix the threadline.app email addresses regardless (see TL;DR).

## Sources

- IANA RDAP bootstrap: https://data.iana.org/rdap/dns.json. Registry RDAP: rdap.verisign.com, rdap.identitydigital.services, pubapi.registry.google
- Cloudflare prices: https://cfdomainpricing.com (2026-10-10)
- Cloudflare .ai support: https://developers.cloudflare.com/changelog/post/2025-03-27-ai-domains-available/
- .ai 2-year minimum and 2026 wholesale increase: https://namefi.io/r/en/blog/ai-tld-registrars and https://hn.nuxt.dev/item/46883324
- Porkbun pricing API: https://api.porkbun.com/api/json/v3/pricing/get
- Namecheap prices: https://domainoffer.net/tld/com/namecheap (also /app, /ai, /chat, /co)
- HeyBell.com listing: https://www.hugedomains.com/domain_profile.cfm?d=heybell&e=com
- USPTO search: https://tmsearch.uspto.gov. Serials 99652761, 99758031, 97297807, 79321662 (MESSAGEBIRD), 88153977 (FRIENDLINE), 87262197 (DOTDOT), 99222522 (REGULARS), 87579879 (HELLOBELL)
- App Store: https://itunes.apple.com/search?term=threadline&entity=software
- folk iMessage assistant: https://www.getfolk.app/docs
- Bird (formerly MessageBird): https://bird.com/en-ch/about
