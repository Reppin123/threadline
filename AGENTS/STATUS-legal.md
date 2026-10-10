# STATUS legal (launch agent)
Owns launch/legal/**. Not legal advice; lawyer-needed items flagged.

## Plan (Definition of Done)
- [x] research notes with cited URLs (launch/legal/research/*.md): apple-photon, platforms (Telegram/WhatsApp/Anthropic/vendors), us-messaging-ai (TCPA/CTIA/state AI disclosure/EU AI Act), privacy (DPDP/GDPR/UK/CCPA), entity-scraping
- [x] RISKS.md: R1-R14, each = requirement, current state (code refs re-read at 79de697), gap, fix + owner; Photon email draft; open questions for counsel
- [x] ENTITY.md: Atlas C-Corp vs India Pvt Ltd + MoR vs both; formation/yearly costs, Stripe/bank, FEMA ODI, POEM, 5472; recommendation + steps
- [x] TERMS.md, PRIVACY.md, DPA.md, ACCEPTABLE-USE.md, SUBPROCESSORS.md (Terms s.6 = launch/billing/PLANS.md: prices, conversation definition, UTC reset, overage, yearly hard stop, cancel at period end)
- [x] WEB-DIFF.md: urgent fixes, interim wording, new pages, claims-vs-code table; diff request posted in COORDINATION.md
- [x] Product compliance fixes → COORDINATION.md addressed to gateway/core/db+web/worker/production/gtm (STOP/HELP + suppression, consent table, AI disclosure, quiet hours/caps, retention purge, deletion, Sentry scrub, crawler UA)
- [x] Lawyer items + filing costs → launch/NEEDS-AKI.md (10 lines)
- [x] Final summary

## Verification done
- Every code claim in RISKS.md re-checked by grep/read: router.ts:67 STOP set, gateway.ts:166/178/204/286, outbound.ts:107, API route.ts:16-50, builtin.ts:24/70, config.ts:32, runtime.ts:15/82, website.ts:4/20, worker index.ts:189, snapshot.ts:11, actions.ts:118, customers schema 0001_init.sql:16, no consent table, no Sentry scrubbing.
- Terms prices match PLANS.md ($288/yr, $1,488/yr, $0.15/$0.10 overage, add-ons $19/$399, Free iMessage = first 5 contacts).
- AUP rule tags [R1..R12] all resolve to RISKS sections; AUP quiet hours aligned to RISKS R4 (9:00-20:00, Sun from noon, 3/24h).
- No em dashes in any launch/legal file; no secrets.

## Summary
Done: risk register, entity recommendation, five policy drafts, web diff, product fix list, Aki to-dos.
Key decisions (also in COORDINATION.md):
1. Recommend Delaware C-Corp via Stripe Atlas ($500) because Stripe India is invite-only and the ICP is US; India Pvt Ltd + MoR only if bootstrapping forever.
2. Two launch blockers outside code: Photon ToS 3.4 forbids serving third parties (need a signed Order + DPA), and no entity exists.
3. Code blockers: no AI disclosure (breaches Anthropic AUP now), STOP only unbinds (no suppression; Telegram uncovered; no HELP), no consent records for bot-first sends (API accepts any number), 90-day deletion promised but not implemented.
4. Shared-line caps 20 new bot-first conversations/bot/day, 40/line/day; no marketing on iMessage; prospects by email only.
5. Drafts use HeyBell and are written to the target product state; WEB-DIFF.md s.4 lists which claims to soften until fixes ship.
For Aki: see the [legal] lines in launch/NEEDS-AKI.md (incorporation, CA/CPA, Photon addendum, lawyer + TCPA review, trademark, EU/UK rep later, MFA + Supabase region, move vendor accounts).
