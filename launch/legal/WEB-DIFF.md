<!--
Internal. Prepared by the legal launch agent, 2026-10-10. legal does NOT edit apps/web (ownership rule); this is the change request for web.
Compared: apps/web/app/(site)/terms/page.tsx and apps/web/app/(site)/privacy/page.tsx at commit 79de697 against launch/legal/*.md drafts.
Publish only after lawyer review of the drafts. Customer-facing copy: no em dashes.
-->

# Website legal pages: required changes

## 1. Changes that are urgent regardless of the drafts (do now)

| # | Where | Problem | Change |
|---|---|---|---|
| U1 | privacy/page.tsx "retention", terms/page.tsx "data" | Both promise "Conversation content is kept for 90 days ... then deleted". No purge job exists (only heartbeat events are pruned, apps/worker/src/index.ts:189). A false privacy promise is FTC s.5 deception (RISKS R10) | Until the purge job ships, use the interim text in s.2 below. Restore the 90-day wording the day the job is live |
| U2 | components/site/data.ts `CONTACT_EMAIL` (used by both pages), lib/auth.ts `EMAIL_FROM` | `hello@threadline.app` / `login@threadline.app`: threadline.app belongs to an unrelated company with live MX, so privacy requests go to a stranger (COORDINATION, domain 2026-10-10) | Point to the new domain once bought (`hello@heybell.app`, `privacy@heybell.app`). Until then use an address Aki controls |
| U3 | privacy/page.tsx "sharing" | Subprocessors are described by category only. FTC and GDPR Art 13/28 expect names; Anthropic and Photon in particular | Link to a new /subprocessors page (SUBPROCESSORS.md) and name Anthropic, Cloudflare, Supabase, Photon, Sentry, Resend, Stripe inline |
| U4 | privacy/page.tsx "children" | Says not directed at under 13/16; AUP and Anthropic's minors rules use 18 | "not directed at children; businesses may not aim agents at people under 18" |
| U5 | terms/page.tsx | No pricing, no definition of a conversation, no overage, yearly hard stop or cancellation rule (billing asked legal for these, COORDINATION 2026-10-10) | Replace with TERMS.md (section 6 has all of it) |
| U6 | packages/core/src/ingest/website.ts:4 (core, not web) | Crawler UA links `https://threadline.app/bot`, the stranger's domain | `HeyBellBot/1.0 (+https://heybell.app/bot)` + a /bot page (s.3) |

## 2. Interim wording until the product fixes ship

**Privacy, Retention (replace the paragraph):**
> We keep conversation content until the business deletes the agent or closes its account. Automatic deletion after 90 days is being added, and this policy will say so when it is live. Account data is kept while the account is open and for 30 days after it closes. Backups are overwritten within 30 days.

**Terms, Data (replace the 90-day sentence):**
> Conversation content is kept until you delete the agent or close your account, as described in the Privacy Policy.

**Privacy, Your rights:** remove "End users can ... ask ... us, to delete their data" only if no one is reading privacy@; otherwise keep it and handle requests by hand (delete the customer row; it cascades to conversations and memories).

## 3. New pages and links

| Path | Source | Notes |
|---|---|---|
| /terms | launch/legal/TERMS.md | Full replacement of the current 10 sections. Keep DocPage layout. Fill [ENTITY]/[ADDRESS]/[GOVERNING LAW] after incorporation (ENTITY.md) |
| /privacy | launch/legal/PRIVACY.md | Full replacement (11 sections + end-user notice) |
| /acceptable-use | launch/legal/ACCEPTABLE-USE.md | New. Strip the internal `[R4]` style tags before publishing |
| /dpa | launch/legal/DPA.md | New. Include Annex 1 |
| /subprocessors | launch/legal/SUBPROCESSORS.md | New. Add an "email me about changes" form (store email + date; used for 30-day notices) |
| /p/[slug] | PRIVACY.md s.10 | New, per agent: hosted end-user notice filled with the bot name, business name and owner contact. Linked from the bot's first message footer where room allows, the share page and the Telegram connect screen ("set this in @BotFather /setprivacypolicy") |
| /bot | RISKS R12 | New: what HeyBellBot crawls, that it obeys robots.txt (`User-agent: HeyBellBot` / `Disallow: /`), and abuse@ contact |
| Footer | SiteFooter | Add Acceptable Use, DPA, Subprocessors next to Terms and Privacy |
| Sign up | signup / login page | Under the button: "By continuing you agree to the Terms and Acceptable Use Policy and acknowledge the Privacy Policy." (links). Store `terms_version` + `accepted_at` on the user row |
| Billing checkout | app/(app)/billing | Above the Checkout buttons: "Billed monthly (or yearly) until you cancel. Cancel any time; your plan runs to the end of the paid period. Overage $0.15 (Starter) / $0.10 (Growth) per extra conversation on monthly plans." (Stripe restricted-business rule on clear pricing; ROSCA-style auto-renew disclosure) |
| Sitemap | app/sitemap.ts | Add the four new static pages |

## 4. Claims in the drafts that depend on product work

The drafts describe the target state. Before publishing each document, check its claims against this list and soften any item that is not live yet.

| Claim (where) | Live today? | Needed from |
|---|---|---|
| 90-day automatic deletion of messages (PRIVACY s.5, DPA s.10.1, Terms s.8) | No | worker (purge job) |
| Memories deleted after 12 months idle (PRIVACY s.5, DPA s.10.1) | No | worker |
| End-user "delete my data" command (PRIVACY s.6/s.10, DPA s.7) | No | gateway |
| STOP set + HELP + suppression checked before every send (AUP s.2, DPA Annex 1, PRIVACY s.10) | Partial (stop / stop bot / unsubscribe unbind only; not Telegram) | gateway |
| AI disclosure in first message (AUP s.3, Terms s.3.4) | No | core + gateway |
| Consent record with wording, IP, time (PRIVACY s.2) | No | web + gateway + db |
| Account deletion from dashboard (PRIVACY s.6, Terms s.8) | No (bot deletion only, actions.ts:118) | web |
| 30-day export (Terms s.8, DPA s.10.2) | No self-serve export; by request only | web (or state "by request") |
| Errors sent without message text or phone numbers (SUBPROCESSORS, DPA Annex 1) | No scrubbing found | production |
| Multi-factor auth on hosting, database and code accounts (DPA Annex 1, PRIVACY s.7) | Unknown | Aki to confirm on Cloudflare, Supabase, GitHub, Anthropic, Photon, Stripe |
| Security logs kept 1 year without content (DPA Annex 1, PRIVACY s.5) | Events table keeps non-heartbeat events indefinitely; some events include handles | production (add 1-year prune, drop handles from event payloads or hash them) |
| Subprocessor change emails (SUBPROCESSORS, DPA s.6.2) | No | web (simple subscribe form) |
| Photon DPA (SUBPROCESSORS) | No | Aki (RISKS R2) |
| Supabase region (SUBPROCESSORS) | Unknown | Aki |
| Snapshots every 30 s, 48 h hourly, 30 d daily; restore tested (DPA Annex 1) | Yes (production a891c1b, 8b62d22) | n/a |
| Rate limits, LLM spend caps, kill switch (DPA Annex 1) | Yes (production d613fe0) | n/a |
| Credentials encrypted with separate key (DPA Annex 1) | Yes (encryptJson, key from AUTH_SECRET / THREADLINE_ENCRYPTION_KEY) | n/a |
