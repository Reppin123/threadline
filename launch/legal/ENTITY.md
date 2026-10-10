<!--
Internal. Not legal or tax advice. Prepared by the legal launch agent, 2026-10-10.
Sources with URLs: launch/legal/research/entity-scraping.md (Part A) and research/platforms.md (Stripe India / Atlas).
INR at ~88/USD (approximate). Prices are vendor-published as of Oct 2026 and marked [est] where they are market ranges.
Sign-off needed from: an Indian CA (tax/GST/ODI), a FEMA lawyer (only if a US parent + Indian subsidiary is planned), a US CPA (1120/5472).
-->

# Entity: where to incorporate HeyBell

Aki is an Indian-resident solo founder selling a $29-$599/mo SaaS mostly to US Shopify stores (launch/gtm/ICP.md), billing through Stripe (launch/billing). Nothing can go live for money until an entity exists: Stripe live mode, Photon Order, Meta (WhatsApp) business verification, Apple Business Register and our own Terms all name it.

## Options at a glance

| | **A. Delaware C-Corp via Stripe Atlas** (founder in India) | **B. India Pvt Ltd + Merchant of Record** | **C. Delaware parent + Indian subsidiary** |
|---|---|---|---|
| Formation | **$500** Atlas (Delaware filing, EIN, founder stock, 83(b) help, year-1 registered agent) + Form ODI via Aki's Indian bank/CA ~$100-300 [est] | INR 7,000-25,000 (**$80-285**) via SPICe+ (name INR 1,000, DSC INR 800-2,000/director, stamp duty by state, CA fee) | $600-900 [est] |
| Yearly fixed cost | Delaware franchise tax **$400** (APVC method) + annual report **$50** (due Mar 1) + registered agent **~$100** + CPA for Form 1120 + **5472** $500-1,500 [est] + Indian CA for ODI APR and Schedule FA ~$100-300 [est] = **~$1,150-2,350** | Audit, AOC-4, MGT-7, DIR-3 KYC, ITR-6, GST returns: INR 25,000-70,000 (**$285-800**) minimal, or **$820-1,640** on a CA retainer | Both, plus transfer pricing / Form 3CEB = **~$2,500-5,000** [est] |
| Taking card payments | **Stripe US** directly, 2.9% + 30c (+0.7% Billing, +0.5% Tax). Our Stripe billing code works unchanged | **Stripe India is invite-only** for new accounts (support.stripe.com, undated page, still live Oct 2026). Use a Merchant of Record (Paddle, Lemon Squeezy, Dodo Payments) at ~5% + 50c [est], which also handles US sales tax/VAT, or Razorpay International (~3% + FX [est]) | Stripe US |
| Bank | Mercury (India not on its prohibited list in third-party copies; case-by-case review) or Wise Business / Payoneer | Any Indian current account; FIRA/e-FIRA for export proof | Mercury + Indian bank |
| Tax | 21% US federal on US profit. Indian risk: POEM (company managed from India = Indian tax resident) is switched off for turnover <= INR 50 crore (~$5.7M) by CBDT Circular 8/2017 [verify]; PE risk remains in principle | ~25.17% (concessional regime); exports zero-rated under GST LUT (free, annual); Indian customers pay 18% GST | Cost-plus subsidiary; cleanest for tax at scale |
| Indian founder filings | FEMA Overseas Investment: ODI form at share subscription, **Annual Performance Report by Dec 31**, Schedule FA in ITR (Black Money Act penalty INR 10 lakh for non-disclosure); within LRS $250,000/yr | None beyond normal | ODI + "individual cannot control a foreign entity with subsidiaries" question: needs a written FEMA opinion first |
| Penalty traps | **Form 5472: $25,000 per form per year** if missed. Delaware default franchise notice can show ~$85,000 (authorised-shares method); refile under APVC to land at $400 | Late ROC filings accrue daily fees | All of A and B |
| Investors / YC | Standard (SAFE, NVCA, YC) | Weak for US investors; a "flip" later costs $15k-50k+ [est] plus Indian capital-gains tax on any value | Standard |
| WhatsApp / Meta verification | Yes (US entity + matching domain) | Yes | Yes |

## Recommendation

**Option A: Delaware C-Corp via Stripe Atlas, now, while the company is worth ~$0.** Reasons, in order:

1. **Payments.** Our billing is built on Stripe Billing Meters and Checkout (launch/billing/PLANS.md). Stripe India will not take a new account, and an MoR would mean rewriting billing and paying ~5% instead of ~4.1% all-in. Atlas gives a US Stripe account on day one.
2. **Customers are American.** US Shopify merchants expect a US counterparty, US-law terms, and a W-9.
3. **Fundraising and flip cost.** If Aki ever raises from US investors or applies to YC, a Delaware parent is expected; flipping later from India is taxable at fair value and costs tens of thousands.
4. **Cost is tolerable.** ~$1.5-2.7k in year 1 versus ~$0.4-2k for India. One Starter customer per month of fixed cost covers it.

Choose **Option B instead** only if Aki decides to bootstrap indefinitely and never raise: India Pvt Ltd + Paddle or Dodo Payments is cheaper and has no 5472/ODI/POEM burden, at the price of replacing Stripe Billing.

**Do not** set up Option C (Indian subsidiary) until hiring in India requires it, and only after a written FEMA opinion.

## Steps for Option A (all for Aki; nothing here is done by agents)

1. Talk to an Indian CA first (1 hour, ~INR 3,000-5,000 [est]) to confirm ODI paperwork with Aki's bank at share issue. Founder capital can be tiny (e.g. $100), so LRS/TCS is not an issue.
2. Stripe Atlas application: company name per the rename decision ("HeyBell, Inc."; check Delaware name availability in the Atlas flow), 10,000,000 authorised shares is the Atlas default, 83(b) filed by Atlas within 30 days.
3. EIN arrives via Atlas. Open Mercury (or Wise Business if declined). Use a real US mailing address service for the principal address if Mercury requires (registered agent address is not accepted).
4. Activate Stripe live mode on the Atlas company (launch/billing/SETUP.md s.6-7); statement descriptor HEYBELL.
5. Calendar: Delaware franchise tax + annual report by **Mar 1** (file under APVC, expect $400 + $50); Form 1120 + 5472 by **Apr 15** (or Form 7004 extension to Oct 15), even with zero revenue; ODI **APR by Dec 31**; Indian ITR Schedule FA every July.
6. Engage a US CPA familiar with foreign-owned C-corps in month 1.
7. Move vendor accounts (Anthropic, Photon, Cloudflare, Supabase, Resend, Stripe, Google OAuth) to the company and company email.
8. Fill `[ENTITY]`, `[ADDRESS]`, `[GOVERNING LAW]` = State of Delaware, `[VENUE]` = state and federal courts in Delaware in TERMS.md and DPA.md.
9. Sales tax: register in US states only when economic nexus thresholds are crossed (usually $100k or 200 transactions per state); Stripe Tax monitors this.

## Risks to watch under Option A

- **POEM / PE in India.** Keep turnover under INR 50 crore, hold board decisions in writing, and get a CA view once revenue is material. If it grows, add the Indian subsidiary (with FEMA opinion) and pay Aki through it.
- **Form 5472.** The single most expensive mistake; the CPA must file it every year.
- **FEMA ODI.** Late APRs attract late submission fees and can block further remittances.
