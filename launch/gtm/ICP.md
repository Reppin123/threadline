# Ideal customer profiles and bottom-up sizing

Checked 2026-10-10. Raw research and every source URL: [research/icp-inbound.md](research/icp-inbound.md).
[EST] = our estimate, method stated. Plan prices from [PRICING.md](PRICING.md): Starter $29/mo ($348/yr), Growth $149/mo
($1,788/yr), dedicated iMessage number +$399/mo.

## Primary wedge: US Shopify DTC brands already paying for Gorgias or Postscript

**Who.** A US Shopify brand doing roughly $1M to $20M a year, 3 to 40 employees, 1 to 15 people on CX/ops. Considered-purchase
catalog of 20 to 2,000 SKUs where shoppers ask before buying: tea and coffee, skincare and beauty, supplements, pet food,
specialty food, apparel with fit questions, home goods, outdoor gear. Already pays for Gorgias (helpdesk) or Postscript (SMS).

**Buyer.** Founder/CEO under ~$5M revenue; Head of CX or Head of Retention/Ecommerce above that. User: the CX lead who lives in Gorgias.

**Trigger moments.** BFCM prep (October to November), a Gorgias AI Agent invoice that grew with volume, a Postscript Shopper
($699/mo) quote, a CX hire they want to avoid, SMS list growth with no way to answer replies.

**Pain in their words.** "The same 10 questions all day" (which one should I get, does it ship to, when will it arrive,
is it in stock, can I change my order). Replies to SMS campaigns land in an inbox nobody staffs at night.

**What we replace or augment (the budget line).**
| Current spend | Price | Source |
|---|---|---|
| Gorgias AI Agent | $0.90 (annual) to $1.00 (monthly) per automated interaction, $1.50 over allowance | gorgias.com/pricing |
| Gorgias human tickets | Pro $360/mo for 2,000 tickets, $0.36 to $0.40 overage | gorgias.com/pricing |
| Postscript AI Plan with Shopper | $699/mo | postscript.io/pricing |
| Typical Gorgias Pro + Postscript Growth brand | ~$5.5k to $15k/yr [EST: Gorgias Pro $3.6k + Postscript $1.2k fee + 100k to 1M SMS at ~$0.011] | research A2 |

Example: a brand automating 600 shopper conversations a month on Gorgias AI Agent pays ~$570/mo ($0.95 × 600). The same
600 conversations fit inside Threadline Growth at $149/mo, in the customer's Messages app instead of a site widget. We hand
anything we can't answer to their existing Gorgias inbox, so the pitch is "add a channel and cut the AI bill", not "rip out your helpdesk".

**Why this ICP first.**
1. US + iPhone: iMessage is only a differentiator where iPhone dominates (75% of Big 3 carrier sales, Q1 2026, Counterpoint).
2. Machine-readable sites: Shopify `/products.json`, JSON-LD and policy pages let us build a correct bot with zero owner input,
   which powers the demo-first outbound ([OUTBOUND.md](OUTBOUND.md)).
3. Proven willingness to pay for texting and automation (they already do).
4. Low regulatory risk: product questions and orders, no health or financial data.
5. Countable and reachable: app-install data names every one of them (StoreLeads, StoreCensus).

### Bottom-up sizing

| Step | Count | Source |
|---|---|---|
| Live Shopify stores, US | 1,186,833 | storeleads.app/reports/shopify, updated 2026-10-02 |
| US stores with Gorgias (all platforms) | 12,169 | storeleads.app/reports/technology/Gorgias, 2026-10-02 |
| → of which Shopify [EST: × 93.5% Shopify share of Gorgias installs] | ~11,400 | same |
| US stores with Postscript (99.9% Shopify) | 20,087 | storeleads.app/reports/technology/Postscript, 2026-10-02 |
| **Wedge: US Shopify stores on Gorgias or Postscript** [EST: 20,087 if full overlap, 31,500 if none] | **~20,000 to 31,000** | |
| Add Attentive US Shopify stores [EST: 8,497 × 72.3%] | +~6,100 | storeleads.app/reports/technology/Attentive |

| Market | Stores | × price | = annual |
|---|---|---|---|
| **Wedge SAM** (Gorgias or Postscript, US Shopify) at Growth | 20,000 to 31,000 | $1,788 | **$36M to $55M** |
| Wedge incl. Attentive | up to ~37,000 | $1,788 | up to $66M |
| **Expansion:** US stores on Klaviyo (email/SMS), Starter | 203,174 | $348 | $71M |
| **Ceiling:** every live US Shopify store, Starter | 1,186,833 | $348 | $413M |

3-year obtainable target: 2% of the wedge = **400 to 620 brands × $1,788 = $0.7M to $1.1M ARR** from the wedge alone, before
Klaviyo-only stores and overage. Outbound capacity (700 contacted/month, OUTBOUND.md) touches the whole wedge in ~3 to 4 years
without re-contacting, so the wedge is big enough to learn on and small enough to finish.

Correction to the pitch deck: slide 8 used StoreCensus install counts (69,694 Gorgias + 39,954 Postscript, global) and $2,400/yr
per store for a $263M beachhead. Current live-store counts from StoreLeads are lower (12,169 US Gorgias, 20,087 US Postscript),
and our list price is now $1,788/yr. Use **$36M to $55M** for the US wedge SAM (noted in COORDINATION.md).

### Qualification checklist (used in outbound scoring)
- Shopify, ships to US, 20 to 2,000 products.
- Gorgias / Postscript / Attentive / Klaviyo SMS script on site.
- FAQ, size guide, brew/usage guide or "which one is right for me" content.
- Not: adult, firearms, cannabis/CBD, prescription products, marketplaces, Shopify Plus enterprise chains.

---

## Secondary 1: US medical spas (pre-booking questions and consult booking)

**Who.** Independent med spa, 1 to 3 locations, owner-operator or practice manager. Average revenue ~$1.4M per location;
81% are single-location (AmSpa).

**Use.** Answer the pre-booking questions that drive consults: price per unit/area, downtime, what to expect, aftercare,
membership terms, deposits; collect name + preferred time into a Leads table and hand to the front desk (or link to the
booking page). After-hours texting is the main value: a missed after-hours inquiry for a $500+ treatment is lost revenue.

**Count.** **10,488** US med spa locations in 2023, up from 8,899 in 2022 (AmSpa industry report, americanmedspa.org).

**Budget line.** AI texting/front-desk tools: MedspAI from $299/mo per location [2nd], GlossGenius AI Reception $50/mo add-on
(glossgenius.com/pricing), Boulevard $143 to $328/mo with AI receptionist (joinblvd.com/pricing), Podium (owns "med spa ai text
messaging" search). Front-desk SMS budget ~$20 to $300/location/month [EST, research A3].

**Size.** 10,488 × Growth $1,788 = **$18.8M/yr**; with a dedicated number (customers text the spa's number first) 10,488 ×
($149 + $399) × 12 = **$69M/yr**.

**Why secondary, not primary.** Booking systems (Boulevard, GlossGenius, Mindbody) are bundling AI receptionists; sites are
less machine-readable (prices often "from" or by consult); health context means we must stay out of PHI (legal review needed:
no medical advice, no treatment history, HIPAA scope). Their clients expect to text the spa's own number, so it needs the $399 dedicated-number add-on to feel native.

## Secondary 2: US independent and boutique hotels

**Who.** Independent hotel or small group (1 to 10 properties, 20 to 150 rooms), GM or owner; plus short-term-rental managers
running 100+ listings.

**Use.** Pre-arrival and in-stay questions by text (parking, check-in time, early check-in, pets, breakfast, local picks), upsells
saved to a table (late checkout, packages), handoff to the front desk. The bot texts the guest first after booking (fits our
shared-pool "bot texts you first" flow) and the guest replies.

**Count.** 64,000+ US hotel properties (AHLA/Oxford Economics, 2024 data); 72% branded (Cloudbeds 2025 Independent Lodging Report)
→ **~17,000 to 18,000 independents** [EST: 64k × 28%]. QCEW 2024: 61,574 hotel/motel establishments, 2,338 B&Bs. STR: AirDNA ranks
960,000 US hosts, of which **920** manage 100+ listings.

**Budget line.** Guest messaging: Canary from ~$300/mo, Akia from ~$500/mo, Duve from ~$900/mo (hoteltechreport.com [2nd]).

**Size.** 17,500 × Growth + dedicated number ($548/mo) × 12 = **$115M/yr**; at Growth alone $31M/yr. STR managers with 100+
listings: 920 × Scale $599 × 12 = $6.6M/yr.

**Why secondary.** Requires PMS integration (Cloudbeds, Mews, Hostaway, Guesty) to know who is arriving; Canary and Akia own the
category and the search results; longer sales cycle via GMs and management companies. Strong fit for the dedicated-number add-on later.

---

## Not now (and why)
- **Salons and barbers** (77,881 beauty salons, 8,205 barbers, 33,732 nail salons, QCEW 2024): low spend ($24 to $50/mo), booking
  software bundles AI reception, and solo operators (~838k nonemployer salons) are expensive to reach.
- **Boutique fitness** (44,983 fitness centers, QCEW 2024): Mindbody/ClassPass own the customer channel.
- **WhatsApp-first markets** (India, LatAm): Flow and dozens of BSPs, low ARPU; revisit once WhatsApp ships, with Telegram as a test.
