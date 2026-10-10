# STATUS: gtm (go-to-market)
Owns: launch/gtm/**

## Definition of done
- [x] launch/gtm/MARKET.md: 5-layer market map; Flow, Photon, Sendblue, Blooio, LoopMessage, Linq, Twilio, Gorgias, Intercom Fin, Zendesk, Siena, Tidio, Zipchat, Postscript, Attentive, Meta/WhatsApp BSPs priced from their sites (tagged [V]/[3P]/[NV], checked 2026-10-10); wedge; sourced why-now; risks (incl. iOS 26 Unknown Senders)
- [x] launch/gtm/ICP.md: primary = US Shopify DTC on Gorgias/Postscript (20k-31k stores from StoreLeads counts, SAM $36M-$55M at Growth); secondary = med spas (10,488, AmSpa) and independent hotels (~17-18k); budget lines replaced (Gorgias AI $0.90-1.00/interaction, Postscript Shopper $699/mo)
- [x] launch/gtm/PRICING.md: Free / Starter $29 / Growth $149 / Scale $599+, $399 dedicated number; unit economics from measured usage table ($0.011/reply, ~$0.068/conversation, $0.45-$1.63 per bot build); margin positive in every plan even at 100% usage; JSON limits for billing. Decision posted to COORDINATION.md
- [x] launch/gtm/INBOUND.md: 25-query SEO map with current top results, programmatic templates, 12-week calendar (posts 7-15 handed to blog in COORDINATION.md), launch plan (Show HN Nov 4, PH Sat Dec 5, IH, r/ShopifyApps), directories with prices, Shopify App Store plan, free tools, referral loop
- [x] launch/gtm/OUTBOUND.md: lead sources + costs, qualification score, 3 email + 2 DM sequences (drafts), demo-first motion, funnel with numbers, tooling ~$641/mo, domain warmup + ramp
- [x] launch/gtm/PLAN-90D.md: 13-week plan (Oct 12 to Jan 9), funnel targets (33 paid, ~$2k MRR), weekly metrics, budget ~$4.1k, kill rules
- [x] launch/gtm/sample-leads.csv: 30 US Shopify brands, each verified by fetching (cdn.shopify.com + Gorgias/Postscript/Attentive script); I re-checked 13 of the final rows independently with curl

## Key decisions
- Pricing replaces the deck's "$0.50/conv, $99 min": matches Flow at $29, sits far under helpdesk AI per conversation. Billing has adopted it (commit 92e0697: Free/Starter/Growth/Scale, 6h conversation meter, metered overage).
- Wedge sizing corrected: live StoreLeads counts are much lower than the deck's StoreCensus install counts (note to pitch in COORDINATION.md).
- Cold email pauses Nov 23 to Dec 1 (BFCM); Show HN moved off US election day (Nov 3).

## Gaps / needs others
- Product: public share page /t/<slug>, bulk prospect builder, claim flow, first-message alert (COORDINATION.md). Outbound and Show HN depend on them.
- Keyword volumes are estimates; real ones need a Semrush/Ahrefs trial (NEEDS-AKI).
- Reddit rules came from mirrors; check them by hand before posting.
- Aki items appended to launch/NEEDS-AKI.md (Photon Business, sending domains, Workspace, Instantly, StoreCensus, postal address, launches, Shopify Partner, directories).

## Log
- 2026-10-10: started; research by 3 helper agents into launch/gtm/research/; all 7 deliverables written, cross-checked and committed.
