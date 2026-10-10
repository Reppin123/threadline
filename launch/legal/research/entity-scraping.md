# Entity structure and website-scraping research: Threadline / HeyBell

Prepared 2026-10-10. This is legal and tax research, not advice. Get a CA (India), a FEMA lawyer and a US CPA to sign off before acting. Items marked **[UNVERIFIED]** rest on a single secondary source, on memory, or could not be confirmed against a primary source in this pass. Prices are as published by vendors and may have changed. INR/USD is taken at about 88 **[approximate]**.

---

# PART A: Entity

## A1. Option 1: India Private Limited Company

### Incorporation (SPICe+ on the MCA portal)
| Item | Cost | Source |
|---|---|---|
| Name reservation (RUN / SPICe+ Part A) | INR 1,000 | [StartupGrantsIndia](https://www.startupgrantsindia.com/services/private-limited-company-registration/fees), [Setindiabiz](https://support.setindiabiz.com/portal/en/kb/articles/private-limited-company-registration-government-fee-structure) |
| MCA filing fee | **Nil for authorised capital up to INR 15 lakh** (one source shows a small slab fee instead) **[verify on MCA fee schedule]** | same |
| DSC (digital signature) | INR 800-2,000 per director | [Agile Regulatory](https://www.agileregulatory.com/blogs/private-limited-company-registration-fees-in-india-in-2026) |
| Stamp duty (state-specific) | e.g. Delhi about INR 360, Maharashtra about INR 1,300, Karnataka higher, at INR 1 lakh capital | [IncorpX](https://www.incorpx.io/blog/company-registration-cost-india) |
| DIN, PAN, TAN, EPFO/ESIC, GSTIN (via AGILE-PRO-S) | Included or nominal | |
| Professional (CA/CS) fee | INR 3,000-15,000 | [IncorpX](https://www.incorpx.io/blog/company-registration-cost-india) |
| **All-in** | **About INR 7,000-25,000 (USD 80-285)** | [IncorpX calculator](https://www.incorpx.io/tools/company-incorporation-cost-calculator) |

Two directors and two shareholders are required. A solo founder can add a family member as the second director and shareholder, or use an **OPC** (One Person Company). OPCs are less investor-friendly, though conversion is now allowed at any time.

### Annual compliance
Mandatory annual items:
- statutory audit (required regardless of turnover);
- AGM;
- **AOC-4** (financials) and **MGT-7/7A** (annual return);
- **ADT-1** (auditor appointment);
- **DIR-3 KYC** for each director;
- **ITR-6** (company income tax return);
- TDS returns if paying salaries or vendors;
- monthly or quarterly GST returns once registered;
- DPT-3, MSME-1 where applicable.

Typical cost:
- **INR 25,000-70,000/yr (USD 285-800)** minimal, per a CA-based estimate. The median for under INR 1 crore turnover is about INR 55-70k.
- **INR 6,000-12,000/month (USD 820-1,640/yr)** for a startup retainer covering bookkeeping, GST, TDS, ROC, audit and ITR.
([Echai/Virtual Auditor](https://echai.ventures/startingup/from/virtual-auditor), [IncorpX](https://www.incorpx.io/blog/annual-compliance-cost-pvt-ltd-vs-llp-vs-opc), [Treelife](https://treelife.in/startups/retainer-quote-for-a-bootstrapped-founder/))

**Tax:** Section 115BAA concessional rate of about 25.17%, or 15% under s.115BAB for new manufacturing only (not us). **Note:** The **Income-tax Act, 2025 replaced the 1961 Act from 1 April 2026**, so section numbers have changed **[verify new section mapping]**.

### GST and export of services
- **Registration:** mandatory above an INR 20 lakh aggregate turnover. Exporters of services can register voluntarily, which is usually wise in order to file an LUT and claim refunds.
- **Export of services** is **zero-rated** (IGST Act s.16) if all five conditions in **IGST Act s.2(6)** are met:
  1. the supplier is in India;
  2. the recipient is outside India;
  3. the place of supply is outside India;
  4. payment is received in convertible foreign exchange, or INR where RBI permits;
  5. the supplier and recipient are not merely establishments of the same person.
- **LUT (Form GST RFD-11):** filed annually online and free. It lets you invoice at 0% IGST without paying and then reclaiming. Accumulated ITC is refundable via RFD-01.
- **Proof of realisation:** a FIRC/FIRA or e-FIRA from the bank or payment aggregator.
([Tally](https://tallysolutions.com/gst/gst-software-saas-exports-international-clients/), [Skydo](https://cdn.skydo.com/blog/export-of-services-under-gst), [IncorpX](https://www.incorpx.io/blog/saas-company-gst-billing-place-of-supply-export))
- **Indian customers** pay 18% GST on SaaS.
- **OIDAR:** We supply from India, so we are not a foreign OIDAR provider. But US states' sales tax on SaaS (e.g. Texas, Washington, NY) can apply under economic nexus once thresholds are crossed. The usual threshold is $100k or 200 transactions per state **[confirm per state]**.

### Receiving USD
- **Stripe India:** **invite-only for new accounts since May 2024.** Existing accounts continue. Stripe said it aimed to expand capacity by H2 2025, but its support page still describes invite-only and I found no confirmation it has reopened **[check status]**. ([Stripe support](https://support.stripe.com/questions/stripe-accounts-are-invite-only-in-india), [TechCrunch](https://techcrunch.com/?p=2787172), [The Paypers](https://thepaypers.com/payments/news/stripe-moves-to-invite-only-in-india))
  - Stripe India accounts that do exist face export-documentation and purpose-code requirements, and RBI cross-border payment-aggregator rules apply.
  - Recurring card mandates (RBI e-mandate rules) complicate subscriptions for Indian cards.
- **Razorpay International:** card and international payments need separate activation and review. Typical fees are about 3% + forex markup for international cards **[UNVERIFIED current rates]**.
- **PayPal India:** commercial invoices with purpose code. Cross-border fees of about 4.4% + fixed fee, plus currency conversion spread **[UNVERIFIED current rates]**.
- **Merchant of Record (MoR):** Paddle, Lemon Squeezy (Stripe-owned) or Dodo Payments (India-based) sell to the customer themselves, handle global sales tax and VAT, and pay out to the Indian company. They cost about 5% + $0.50 per transaction **[UNVERIFIED]**. This is a strong fit for a solo Indian SaaS company that can't get Stripe India, and it also solves US sales tax.
- **Inward B2B transfers:** Skydo, Wise Business, Payoneer, Xflow.

## A2. Option 2: Delaware C-Corp

### Formation providers
| Provider | Price | Notes |
|---|---|---|
| **Stripe Atlas** | **$500 one-time.** Includes Delaware filing, EIN, founder stock docs, 83(b) filing help, and the **first year of registered agent**. The agent then renews at **about $100/yr**. | Perks include Stripe credits. A Stripe US account comes immediately, which is a major reason for Indian founders to use it. Atlas's $500 quote already absorbs the Delaware filing fee (one review says this rose to $109 on 1 Aug 2026 **[UNVERIFIED]**). ([Rho review](https://www.rho.co/blog/stripe-atlas-review), [StartupOwl](https://startupowl.com/reviews/stripe-atlas)) |
| **Clerky** | about **$427-$819** (plan dependent) | Popular with YC companies (about half of each batch, per the review). Strongest on post-incorporation legal docs (SAFEs, hires). ([Flowjam review](https://www.flowjam.com/blog/clerky-review-2026-complete-guide-pricing-alternatives)) **[UNVERIFIED current price]** |
| **Firstbase** | Varies. Historically about $399 + state fees, plus a registered agent subscription **[UNVERIFIED]** | Aimed at international founders; bundles mailroom and agent. |
| **Doola** | about **$297** + state fee; bookkeeping and tax add-ons extra **[UNVERIFIED]** | Budget option; offers 1120/5472 filing packages. |

### Delaware ongoing state costs ([Delaware Division of Corporations](https://corp.delaware.gov/paytaxes/))
- **Annual report fee:** **$50**. Due **1 March** for the prior year.
- **Franchise tax:**
  - **Minimum $175** under the Authorized Shares method;
  - **minimum $400** under the **Assumed Par Value Capital (APVC) method**;
  - maximum $200,000.
- **Late penalty:** $200 + 1.5%/month interest.
- **Trap:** Delaware's default notice computes tax on the Authorized Shares method. A typical startup with 10M authorised shares would see a bill of about **$85,000** ([Clerky help](https://help.clerky.com/article/2796-calculate-delaware-franchise-tax), [Vicente](https://vicentellp.com/insights/avoiding-massive-delaware-franchise-tax-bills)). Recompute under APVC by reporting gross assets and issued shares. Early-stage startups usually land on the **$400 minimum**.
- **Total Delaware:** about **$450/yr**, plus about **$100/yr** registered agent from year 2.

### US federal tax filings
- **Form 1120** (corporate return): due 15 April for calendar-year C-corps. An extension to 15 October is available via Form 7004. It must be filed even with zero revenue.
- **Form 5472:** attached to the 1120 when a **foreign person owns at least 25%**, which will be the case for Aki. It reports transactions with the related party, such as capital contributions, loans and payments.
  - **Penalty: $25,000 per form per year** for failure to file or keep records.
  - A further $25,000 accrues per 30 days after 90 days from an IRS notice (IRC §6038A(d)).
  ([Greenback](https://www.greenbacktaxservices.com/knowledge-center/form-5472/), [Dimov Tax](https://dimovtax.com/form-5472-foreign-owned-us-corporation/))
- **CPA cost** for 1120 + 5472 for a small startup: about **$500-1,500/yr** **[UNVERIFIED market range]**.
- **Other federal items:**
  - Federal income tax at 21% on US-taxable profits.
  - India-US DTAA treaty positions may need Form 8833.
  - **FinCEN BOI reporting:** US-formed companies have been exempt since FinCEN's March 2025 interim final rule **[verify still current]**.
- **State tax:** If we have no US employees, office or nexus, Delaware corporate income tax generally doesn't bite (no Delaware operations). Sales tax nexus (economic) can arise in states where we sell SaaS.

### US banking
- **Mercury:** The prohibited-countries list targets sanctioned and high-risk jurisdictions. **India was not on it** in third-party reproductions. Mercury reviews non-resident founders case by case and wants a real business description and US address (a registered agent address is not acceptable as the principal address). **[UNVERIFIED on Mercury's live page]** ([Mercury help](https://support.mercury.com/hc/en-us/articles/35628854440468-Prohibited-countries), [Global Solo](https://www.globalsolo.global/blog/open-us-bank-account-indian-national-guide-2026.md), [Doola guide](https://www.doola.com/mercury-guide/how-to-open-a-mercury-account-in-india/))
  - Mercury received conditional OCC approval for a national bank charter in 2026 ([Yahoo/Reuters](https://finance.yahoo.com/sectors/technology/articles/mercury-hits-5-2-billion-161349311.html)).
- **Brex:** Since 2022 it focuses on venture-backed or larger companies. Availability to non-US-resident solo founders without funding is doubtful **[UNVERIFIED]**.
- **Alternatives:** Relay, Wise Business (USD account details), Payoneer, Airwallex. Stripe Atlas companies can also hold Stripe balances.

## A3. Indian-resident founder rules (apply to Option 2)

### FEMA: Overseas Investment Rules / Regulations / Directions 2022
- Subscribing to shares of a Delaware company is **ODI** if the founder has "control" or holds 10% or more. As founder Aki will have both.
- **Limit:** within the **LRS limit of USD 250,000 per financial year**, which covers all LRS remittances combined.
- **Funds:** must be own funds, not borrowed, for startup investments. ([Bar & Bench](https://www.barandbench.com/view-point/significant-reforms-in-the-indian-overseas-investment-regime), [EY](https://ey.com/en_in/insights/tax/how-the-revised-odi-regulatory-framework-will-help-indian-companies-invest-overseas), [OI Rules text, RBI](https://rbi.org.in/scripts/bs_viewcontent.aspx?Id=5087))
- **Key restriction for individuals (OI Rules Sch. III):** A resident individual may make ODI only in an **operating foreign entity** that is **not in financial services** and that **has no subsidiary or step-down subsidiary where the individual has control**.
- **Subsidiaries:**
  - If the founder invested when the foreign entity had no subsidiary, commentators say the entity **can later set up a subsidiary, including in India, unless the individual has acquired control since**.
  - An individual **cannot** acquire control of an entity that already has subsidiaries.
  - A founder normally has control from day 1, so **how a later Indian subsidiary is permitted is a real FEMA question.** **[Get a FEMA opinion before setting up the US parent + Indian subsidiary structure; reading UNVERIFIED.]** ([Bar & Bench](https://www.barandbench.com/view-point/significant-reforms-in-the-indian-overseas-investment-regime))
- **Round-tripping:** ODI into a foreign entity that invests back into India is allowed **only if it does not create more than two layers of subsidiaries** (OI Rules r.19(3)). A US parent with one Indian subsidiary is one layer, which is fine.
- **Filings:**
  - **Form ODI** through the AD bank at the time of remittance or share issue. A UIN is allotted.
  - **Annual Performance Report (APR)** by 31 December each year, based on the foreign entity's financials.
  - Report disinvestment or restructuring.
  - Late filings attract a Late Submission Fee. Repeated failure can block further overseas investment **[confirm LSF formula]**.
- **TCS:** LRS remittances above INR 10 lakh/yr attract TCS (20% for most non-education purposes, creditable against tax) **[verify current rates after Budget 2025/2026]**. Founder capital at incorporation is usually tiny, so this is mostly a non-issue.

### Indian tax
- **POEM (place of effective management):**
  - A foreign company is **Indian tax-resident** if its POEM is in India, meaning where key management and commercial decisions are **in substance** made (1961 Act s.6(3); carried into the 2025 Act **[verify section]**).
  - A Delaware company run day to day by a solo founder in India is the classic POEM-in-India fact pattern. It would mean Indian tax on worldwide income plus US tax, with treaty tie-breaker uncertainty.
  - **Mitigant:** CBDT **Circular 8/2017** says the POEM guidelines **do not apply to foreign companies with turnover or gross receipts of INR 50 crore or less** in the year (about USD 5.7M) **[single secondary source; verify circular text]**.
  - ([Treelife](https://treelife.in/legal/place-of-effective-management-poem-in-india/), [Wolters Kluwer](https://legalblogs.wolterskluwer.com/international-tax-law-blog/place-of-effective-management-indian-perspective/), [BCAJ](https://bcajonline.org/journal/guiding-principles-for-determination-of-place-of-effective-management-poem/))
- **Permanent establishment (PE):** Separately, a US company whose only founder works from India may have a **PE in India** (fixed place or dependent agent), making profits attributable to Indian activity taxable in India. This is commonly solved by an Indian subsidiary providing services to the US parent at cost-plus, which brings transfer pricing documentation and Form 3CEB.
- **Founder personal tax:**
  - Resident individuals must report foreign assets, including Delaware shares and any foreign bank accounts where they are signatories, in **Schedule FA** of the ITR.
  - Non-disclosure risks penalties of **INR 10 lakh** under the Black Money Act 2015 s.43 **[confirm current threshold relief for small balances]**.
  - Dividends or salary from the US company are taxable in India, with DTAA credit for US withholding.
- **Treaty tie-breaker:** For a company resident in both India and the US, the India-US DTAA Art 4(3) leaves residence to competent-authority mutual agreement **[UNVERIFIED]**. That is unpredictable, so keep POEM below the radar by staying under INR 50 crore and documenting board decisions.

## A4. "Flip" structures

**Forward flip** (Indian company first, US parent later):
- Indian shareholders swap Indian shares for Delaware shares. The swap is a **transfer taxable in India** at fair market value, with no cross-border s.47 exemption. It needs FEMA ODI compliance for the swap, valuation reports, and possibly FDI filings for the US parent's holding of the Indian company.
- Cost rises with valuation. Legal and valuation fees run roughly **$15,000-$50,000+** **[UNVERIFIED market range]**, plus founders' capital gains tax on any value uplift.
- **Flipping while value is near zero is cheap; flipping after traction is expensive.**

**Reverse flip** (US parent back to India for an Indian IPO):
- Very expensive at scale. **Groww paid about $159M in US exit tax** under IRC §367 ([Treelife case study](https://treelife.in/case-studies/how-growws-160-million-delaware-tax-bill-became-indias-most-expensive-startup-lesson/)).
- MCA Rule 25A (Sept 2024) allows a fast-track inbound merger of a foreign holding company into its wholly owned Indian subsidiary ([Treelife playbook](https://treelife.in/reports/the-reverse-flip-playbook-for-indian-founders/), [Commenda](https://www.commenda.io/blog/reverse-flip-holding-company-india)).

**Accelerators and VCs:**
- YC does not strictly mandate Delaware, but its investors expect a **US (Delaware), Cayman or Singapore parent**. Canada was dropped from YC's approved list in 2025, and **India is not an approved parent jurisdiction** **[UNVERIFIED on YC's site]**. ([Wisp](https://wisp.blog/blog/do-you-need-a-delaware-c-corp-to-apply-to-yc-or-hustle), [Employment Hero](https://employmenthero.com/en-ca/news/y-combinator-drops-canada-investment-eligibility/))
- US SAFEs and NVCA documents assume a Delaware C-corp.

## A5. Cost comparison (USD; indicative)

| | **India Pvt Ltd only** (+ MoR for billing) | **Delaware C-Corp via Atlas only** (founder in India) | **Delaware parent + Indian subsidiary** |
|---|---|---|---|
| Formation | $100-300 | $500 (Atlas) + ODI filing via bank/CA about $100-300 | $600-900 |
| Year-1 statutory | India compliance $300-1,650 | DE franchise $400 + report $50; 1120/5472 CPA $500-1,500; APR + Schedule FA CA about $100-300 | Both columns + transfer pricing/3CEB about $300-900 **[UNVERIFIED]** |
| Registered agent | n/a | $0 in year 1 (Atlas), then $100/yr | $100/yr |
| **Year 1 total** | **about $400-2,000** | **about $1,550-2,650** | **about $2,800-5,500** |
| **Ongoing per year** | **about $300-1,700** | **about $1,150-2,350** | **about $2,500-5,000** |
| Payments | No Stripe India (invite-only). Use an MoR at about 5%, Razorpay or PayPal | Stripe US at about 2.9% + 30c; Mercury | Stripe US |
| Fundraising | Weak for US VCs/YC; flip needed later | Standard | Standard |
| Key risks | Flip cost later | **POEM/PE**, Form 5472 $25k penalty, FEMA ODI and APR | FEMA ODI "subsidiary" restriction for individuals; transfer pricing |

Exclusions: GST/US sales-tax compliance, payment-processing fees, D&O insurance, and the founder's own CA fees for personal ITR.

## A6. Recommendation
1. **If Aki intends to raise from US investors or apply to YC/accelerators within about 18 months (likely, given US Shopify ICP):** Incorporate a **Delaware C-Corp via Stripe Atlas now**, while value is near zero.
   - Have the AD bank file Form ODI at the time of share subscription.
   - Calendar the APR (31 Dec), Delaware (1 Mar, using APVC), 1120 + 5472 (15 Apr, or extend), and Schedule FA in the ITR.
   - Open Mercury, or Wise if Mercury declines.
   - **Do not create an Indian subsidiary until hiring requires it, and only after a written FEMA opinion** on the individual-ODI "no subsidiary" rule.
   - Keep turnover under INR 50 crore, which also keeps the POEM guidelines inapplicable, and document key decisions.
   - Get a US/India CPA engaged in month 1. The Form 5472 penalty alone justifies it.
2. **If Aki plans to bootstrap indefinitely with mostly small Shopify customers:** An **India Pvt Ltd + Merchant of Record (Paddle/Dodo/Lemon Squeezy)** is cheapest and cleanest. Zero-rated exports under LUT, no POEM/5472/ODI burden. Accept that a flip later costs money and tax.
3. **Avoid** running a Delaware company long-term from India with significant revenue and no Indian entity or transfer pricing. That is where POEM and PE risk concentrates.

Our existing Stripe billing setup would carry over cleanly to option 1 (a Stripe US account under Atlas).

---

# PART B: Scraping customer and prospect websites

## B1. Two very different activities
1. **Owner-submitted crawl (current product).**
   - The business owner submits their own site and accepts our ToS, which should include an explicit licence to crawl, copy, store and use their content to operate their bot.
   - Honour robots.txt (RFC 9309), with an identifiable user-agent and a contact URL.
   - **Legal risk: very low.** The owner licenses its own content and authorises access. Residual issues: third-party content on their site, such as supplier images and user reviews (cover with a warranty and indemnity in our ToS), and incidental personal data (staff names, reviewer names).
2. **Pre-building bots for prospects without permission (GTM plan).** The rest of this part analyses this activity.

## B2. United States

### CFAA (18 U.S.C. §1030)
- ***Van Buren v. United States*, 593 U.S. 374 (2021):** "exceeds authorized access" is a "gates-up-or-down" inquiry, meaning whether you access areas of a system you are not entitled to. Purpose-based or ToS-based restrictions are not enough.
- ***hiQ Labs v. LinkedIn*, 31 F.4th 1180 (9th Cir. 2022)** (on remand after *Van Buren*): scraping **publicly accessible** pages (no login) likely is not access "without authorization" under the CFAA.
- **Final outcome of hiQ:** LinkedIn nevertheless **won on breach of contract** (summary judgment, Nov 2022), because hiQ had logged-in accounts and used fake profiles. A **consent judgment and permanent injunction** followed on 6-8 Dec 2022, reported at **$500,000** **[amount reported by one source]**. hiQ had to delete scraped data and code. ([Proskauer](https://newmedialaw.proskauer.com/2022/12/08/hiq-and-linkedin-reach-proposed-settlement-in-landmark-scraping-case/), [Privacy World](https://www.privacyworld.blog/2022/12/linkedins-data-scraping-battle-with-hiq-labs-ends-with-proposed-judgment/), [NatLawReview](https://www.natlawreview.com/article/linkedin-s-data-scraping-battle-hiq-labs-ends-proposed-judgment))
- **Application:** Crawling public storefront pages and `/products.json` without a login is very low CFAA risk.
  - **Do not** bypass passwords (password-protected stores), CAPTCHAs, IP blocks or bot-protection.
  - After a **cease-and-desist plus technical block**, continued access is the fact pattern that historically led to liability (*Craigslist v. 3Taps*, N.D. Cal. 2013, pre-*Van Buren*). It could also implicate California Penal Code §502 and state analogues. **Stop on request.**

### Contract / Terms of Service
- ***Meta v. Bright Data*, No. 3:23-cv-00077-EMC (N.D. Cal. 23 Jan 2024):** Judge Chen granted summary judgment to Bright Data on breach of contract. Meta's terms did not prohibit **logged-out scraping of public data**, and a "survival clause" could not bind Bright Data after it closed its accounts. Meta later dropped the case **[UNVERIFIED that no appeal followed]**. ([FBM](https://www.fbm.com/post/102kqw7/), [Lowenstein](https://www.lowenstein.com/news-insights/publications/client-alerts/meta-v-bright-data-ruling-has-important-implications-for-webscraping-activities-by-investment-advisers-im), [Quinn Emanuel](https://www.quinnemanuel.com/the-firm/news-events/client-alert-meta-v-bright-data-significant-decision-for-web-scraping-industry/))
- ***X Corp. v. Bright Data* (N.D. Cal. May 2024):** contract claims against public-data scraping were dismissed, partly on Copyright Act preemption grounds **[from memory; verify]**.
- **Browsewrap** ToS (a link in the footer, with no assent) is generally unenforceable without actual or constructive notice: *Nguyen v. Barnes & Noble*, 763 F.3d 1171 (9th Cir. 2014).
- **Takeaway:** Don't create accounts or log into prospects' stores. Don't click "I agree" on anything. Keep crawling logged-out.

### Shopify specifics
- **`/products.json`, `/products/<handle>.js` and `.json`** are unauthenticated storefront endpoints Shopify generates for every store. Merchants cannot disable them, per Shopify community threads ([Shopify Community](https://community.shopify.com/t/why-how-is-my-internal-product-information-public-facing/395568), [Shopify.dev forum](https://community.shopify.dev/t/why-are-all-products-public/10069), [DEV](https://dev.to/scrapemint/every-shopify-store-ships-a-public-product-api-almost-nobody-uses-it-4m22)).
- `products.json` is **not** part of Shopify's documented, licensed API. The official public product API is the Storefront API (GraphQL), which requires an access token issued by the merchant or app ([shopify.dev](https://shopify.dev/docs/storefront-api/getting-started)).
- **Shopify's API License and Terms** bind **app developers and Partners** who use Shopify APIs under a token. Shopify's merchant ToS binds merchants. Neither obviously binds an anonymous visitor reading a public storefront.
  - **[UNVERIFIED: I did not locate an explicit Shopify clause prohibiting storefront scraping by third parties. Review shopify.com/legal/terms and the API terms before scaling.]**
  - If we become a **Shopify Partner or app** (likely, to integrate order lookup), **our Partner/API terms will bind us**. Scraping non-customer stores in a way Shopify dislikes could put the app listing at risk. Keep prospect crawling modest.
- Rate-limit hard, for example 1 request/second per store with a page cap. Shopify storefronts throttle bots and may 429/403. **Treat a 403 or bot challenge as "no".**

### Trespass to chattels
- Requires actual impairment of the servers' condition or function: *Intel v. Hamidi*, 30 Cal. 4th 1342 (2003). Compare *eBay v. Bidder's Edge*, 100 F. Supp. 2d 1058 (N.D. Cal. 2000), where a preliminary injunction was granted against high-volume crawling.
- A one-off, polite crawl of a few hundred pages per prospect is **very low risk.**

### Copyright and fair use
- **Facts** (prices, SKUs, sizes, ingredients, shipping policy terms as facts) are not copyrightable: *Feist v. Rural*, 499 U.S. 340 (1991). **Expression** (marketing copy, blog posts, FAQ prose, product photos) is.
- **Storing full page text to power a private demo bot** is reproduction. Fair use (17 U.S.C. §107) arguments are mixed:
  - **For:** transformative functional use (a Q&A interface), no market substitution for the copy, small audience (the prospect only).
  - **Against:** commercial purpose, copying whole works, and outputs may reproduce passages verbatim.
- **Relevant AI rulings:**
  - *Thomson Reuters v. Ross Intelligence* (D. Del. Feb 2025): rejected fair use for copying headnotes to build a competing non-generative AI tool. Now on interlocutory appeal to the 3d Cir **[status UNVERIFIED]**.
  - *Bartz v. Anthropic* (N.D. Cal. June 2025): training on lawfully acquired books was fair use, but pirated library copies were not. A class settlement of about $1.5B followed in Sept 2025.
  - *Kadrey v. Meta* (N.D. Cal. June 2025): fair use on that record.
- **DMCA §1202:** removing copyright management information is a separate claim theory raised in AI cases. Low risk for product text.
- **Mitigation:**
  - Store facts and structured product data plus short excerpts.
  - **Do not store or display images.**
  - Instruct the bot to paraphrase rather than reproduce long passages.
  - Delete prospect data if there is no conversion within 30 days.
  - Honour takedown requests immediately.

### Trademark, passing off and false affiliation: the biggest practical risk
- **Lanham Act §43(a) (15 U.S.C. §1125(a))** covers false designation of origin and false endorsement or affiliation. A bot that answers **as "Sanitea's assistant"**, branded with Sanitea's name and logo, could confuse consumers about sponsorship if anyone other than the prospect can see it. Logo use adds copyright exposure.
- **Nominative fair use** (*New Kids on the Block v. News America*, 971 F.2d 302 (9th Cir. 1992); *Toyota v. Tabari*, 610 F.3d 1171 (9th Cir. 2010)) protects truthful references to a brand. For example, "We tested our bot on Sanitea's public website" is fine if:
  - the mark is needed to identify the brand;
  - only as much as necessary is used (the word mark, not logo or trade dress);
  - nothing suggests sponsorship or endorsement.
- **False advertising and product disparagement:** A public benchmark in which our bot **misstates** Sanitea's prices, ingredients, health claims or return policy could support false advertising (§43(a)(1)(B)) or trade libel claims. It could also create FTC Act §5 issues if published as marketing. *Moffatt v. Air Canada* (BC CRT, 2024) shows a business is held to what its chatbot says. A hallucinated policy attributed to a real brand is reputationally toxic.
- **Right of publicity:** not relevant unless founders' names or likenesses are used.
- **India:** Trade Marks Act 1999 s.29 (infringement) and common-law **passing off** (goodwill, misrepresentation, damage). Indian courts readily grant interim injunctions for brand misuse, especially for domain-like and online uses.

**Guardrails for "Sanitea" as a public benchmark:**
1. **Preferred:** get written permission, or anonymise ("a US DTC tea brand") or use a fictional store.
2. If named: word mark only, no logo or trade dress.
3. Add a clear disclaimer: "Independent test by HeyBell on publicly available pages. Not affiliated with or endorsed by Sanitea."
4. Report results accurately, keep transcripts, and do not publish hallucinated answers attributed to the brand.
5. Do not let the public message the bot "as Sanitea". Put demo bots behind an unguessable link, `noindex`, shown only to the prospect, with an "unofficial demo" banner in the bot's first message.
6. **Never message the prospect's customers.**

## B3. European Union
- **DSM Directive (EU) 2019/790, Art 4:** a commercial text-and-data-mining exception for reproductions of lawfully accessible works, retained "as long as necessary" for TDM.
  - It is **subject to the rightsholder's opt-out "in an appropriate manner, such as machine-readable means"** for online content (Art 4(3)).
  - Honouring robots.txt (and ai.txt/TDMRep where present) is the safest compliance signal.
  - *Kneschke v. LAION*: Hamburg Regional Court 2024; the Higher Regional Court Hamburg in 2025 upheld the dismissal. The appeal court suggested natural-language reservations in ToS may count as machine-readable depending on date and technology, so **also check ToS for "no scraping/TDM" language for EU sites.** ([Bird & Bird](https://cm.twobirds.com/en/insights/2025/germany/higher-regional-court-hamburg-confirms-ai-training-was-permitted-(kneschke-v,-d-,-laion)), [Kluwer Copyright Blog](https://legalblogs.wolterskluwer.com/copyright-blog/kneschke-vs-laion-landmark-ruling-on-tdm-exceptions-for-ai-training-data-part-2/))
  - **Caveat:** Using stored text to **generate answers to the public** goes beyond "mining" (analysis). Reproducing expression in outputs needs its own basis. Art 4 likely covers the crawl copy, not verbatim outputs **[interpretation]**.
- **Database right (Directive 96/9/EC):** A merchant's product catalogue may be a protected database. Extracting a substantial part infringes only if it harms the maker's investment: *CV-Online Latvia v. Melons*, C-762/19 (2021). If no database right exists, ToS restrictions can bite contractually: *Ryanair v. PR Aviation*, C-30/14 (2015).
- **EU AI Act (Reg. 2024/1689):**
  - **Art 53(1)(c)-(d)** requires a copyright policy honouring Art 4(3) opt-outs and a training-content summary. It applies to **providers of general-purpose AI models** (Anthropic), not to us as a downstream system builder, from 2 Aug 2025. The GPAI Code of Practice (July 2025) commits signatories to respect robots.txt. We would only become a GPAI provider if we substantially modified or fine-tuned a model (Commission guidelines use a compute-based threshold) **[verify]**.
  - **Art 50** (transparency for chatbots, from 2 Aug 2026) **does** apply to us. Disclose that the user is talking to an AI.
- **GDPR** applies to any personal data scraped (staff names, review author names). Exclude it from prospect crawls.

## B4. India: IT Act 2000
- **s.43(a)-(b):** a person who, **without permission of the owner or person in charge**, accesses a computer or system, or **downloads, copies or extracts any data**, is liable to pay **compensation**. Adjudicating officers can award up to INR 5 crore; above that, civil courts decide.
- **s.66:** makes the same acts **criminal** if done "dishonestly or fraudulently" (up to 3 years and/or INR 5 lakh).
- **Application:** On its face s.43 is broad. Public websites arguably give implied permission for ordinary browsing, and there is little case law on public-page scraping. Honouring robots.txt and any C&D supports the "permission" position.
- **Risk:** low for one-off polite crawls of foreign sites, since the targets are US merchants unlikely to sue in India.
- **Copyright Act 1957:** fair dealing (s.52) is narrower than US fair use and has no TDM exception **[note]**.

## B5. Operating rules for prospect pre-builds
1. Crawl only **public, logged-out** pages and `products.json`. **Obey robots.txt** (RFC 9309), including `Disallow` for our UA and `*`. Respect `noai`/TDM signals.
2. Use an identifiable UA (e.g. `HeyBellBot/1.0 (+https://heybell.app/bot)`) with an opt-out page. Keep a global **do-not-crawl list**.
3. Rate limit to about 1 req/s and cap pages (e.g. 300). Stop on 403/429 or a challenge. **Never** bypass passwords, CAPTCHAs or bot protection.
4. Store structured facts and short text. **No images, no personal data.** Delete within **30 days** if no conversion. Delete immediately on request.
5. Keep demo bots **private**: unguessable URL, noindex, prospect-only, "Unofficial demo, not affiliated with <Brand>" disclosure, no logo.
6. Outreach: one email with the private link. **Do not** contact the prospect's customers. **Comply with CAN-SPAM** for cold email; GDPR/PECR if targeting EU/UK businesses.
7. Never publish named-brand benchmarks without permission or the disclaimers above. Prefer anonymised or fictional examples for "Sanitea"-style marketing.
8. On a C&D, stop crawling, delete the data and confirm in writing.

**Overall risk:**
- **Crawling (CFAA/contract/trespass):** low.
- **Copyright:** low to moderate, depending on how much expressive text is stored and output.
- **Trademark/false affiliation:** **moderate if demo bots or benchmarks are public; low if private and disclaimed.**
- **Reputational and platform risk** (Shopify Partner terms): moderate. It is the real constraint on scale.
