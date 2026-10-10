<!--
Internal. Not legal advice. Prepared by the legal launch agent, 2026-10-10. Lawyer-needed items are marked [LAWYER].
Sources and verbatim quotes: launch/legal/research/*.md (every claim below is cited there, with URLs). Code read at commit 79de697.
Product name: HeyBell (rename pending Aki; launch/domain/REPORT.md). Section numbers R1..R14 are referenced by ACCEPTABLE-USE.md.
-->

# Legal and policy risk register (HeyBell, formerly Threadline)

Each risk: **what it requires**, **our current state** (with code references), **gap**, **fix** (owner in brackets). Severity is launch impact:
**Blocker** = must fix before paid launch, **High** = fix in the first 30 days or before the related feature ships, **Medium/Low** = track.

## Summary

| # | Risk | Severity | One-line fix |
|---|---|---|---|
| R1 | Apple: no sanctioned automation of iMessage; account/line bans | **Blocker** (design) | Inbound-first by default; gate "bot texts first"; volume caps; no marketing on iMessage |
| R2 | Photon ToS forbids serving third parties (our whole model) | **Blocker** (contract) | Signed Photon Order/platform addendum + DPA before selling iMessage |
| R3 | Cold outreach to prospect stores (gtm) | High | Email only (CAN-SPAM), never cold text/iMessage; private, disclaimed demo bots |
| R4 | TCPA / state mini-TCPAs / CTIA: consent for business-initiated texts | **Blocker** | Consent record table; API + invite + scheduled sends require a consent basis; quiet hours |
| R5 | STOP / HELP handling | **Blocker** | Full keyword set, persistent suppression list checked before every send, HELP reply |
| R6 | Privacy: GDPR / UK GDPR, CCPA + US states, India DPDP | High | Publish DPA + subprocessors + new Privacy; stay a pure processor; Art 30 record |
| R7 | Telegram Bot Developer Terms | Medium | Per-bot privacy policy in BotFather; STOP on Telegram; never reconnect banned bots |
| R8 | WhatsApp Business Platform (AI Providers ban, opt-in, human escalation) | High (when WhatsApp ships) | Scope-locked business agents; human handoff field; entity for Meta verification |
| R9 | AI disclosure (Anthropic AUP, CA SB 1001, Maine, Utah, EU AI Act Art 50) | **Blocker** | Non-removable first-message disclosure; "are you human?" always truthful |
| R10 | Retention and deletion promises vs code | **Blocker** (FTC s.5 deception) | 90-day purge job, end-user "delete my data", account deletion |
| R11 | Anthropic Commercial Terms + Usage Policy (incl. Nov 12, 2026 version) | Medium | Flow-down in AUP; high-risk advice block; inaccuracy notice |
| R12 | Crawling customer and prospect websites | Low (owner) / Medium (prospects) | Fix crawler UA domain; owner warranty; prospect crawl rules |
| R13 | Trademark: "Threadline" conflicts; brand use in demos | Medium | Complete rename; USPTO clearance search for HEYBELL; no logos of prospects |
| R14 | No legal entity yet (contracts, Stripe live, Meta, Photon all need one) | **Blocker** | Incorporate (ENTITY.md) |

---

## R1. Apple: automated iMessage, Messages for Business, and ban risk

**Requires.**
- iCloud Terms (rev. Sep 14, 2026): service "designed and intended for personal use"; no "accessing the Service through any automated means"; no "unsolicited or unauthorized ... messages"; Apple may suspend "without prior notice". macOS Tahoe SLA s.6H: no use "to spam"; s.2B(iii) no virtualized macOS in a "relay service". No published rate limits, no appeal.
- The only sanctioned business channel is **Apple Messages for Business** (Policies v3.1, Jul 21, 2026): via an approved MSP (Zendesk, Salesforce, LivePerson...), Apple Business Register account, Experience Review; customer must initiate; "A business must not provide a limited or bot-only solution" (live agent required in business hours); marketing only after the user sends "subscribe". HeyBell is not an MSP, so AMB is not usable as our core rail today.
- Precedent: Beeper Mini blocked within days (Dec 2023); Lindy's Apple account permanently banned after ~10k messages in 12h (2025). Apple has not publicly acted against API vendors (Sendblue, Linq, LoopMessage, Photon); enforcement is per line, silent.
- iOS 26 "Screen Unknown Senders" puts first messages from unknown numbers in a filtered folder; links are inert until the user replies; every unknown-sender message carries "Report Spam". Filtering stops after the user replies 3 times.

**Current state.**
- Photon shared pool (Free plan, `GATEWAY_MODE=cloud`). Bot-first sends via `space.create` in `apps/gateway/src/outbound.ts` and `gateway.invite()` (`apps/gateway/src/gateway.ts:286`).
- Any API-key holder (Starter+) can schedule a bot-first iMessage to any number: `apps/web/app/api/v1/bots/[id]/messages/route.ts:16-50` (no consent field, no caps beyond billing). The bot itself can schedule follow-ups with the `schedule_message` tool (`packages/core/src/tools/builtin.ts:24,70`).
- `THREADLINE_KILL=outbound` exists (`packages/core/src/safety.ts:4`). "Target not allowed" from Photon is handled (`outbound.ts:107`).
- No per-line new-contact budget, no quiet hours, no reply-ratio monitor, no first-message link ban.

**Gap.** The flows most likely to get lines flagged (bot texts first from a fresh pool number, scheduled follow-ups to non-responders) are open and uncapped.

**Fix.**
1. Inbound-first by default [web]: share page `/t/<slug>` primary CTA = "Open in Messages" deep link with prefilled `start <code>`, QR code, and a contact card (.vcf) download. Phone-entry form becomes secondary (R4 double opt-in).
2. Gate bot-first sends [gateway + web API]: allowed only if (a) the handle has an existing thread with that bot, or (b) there is a consent record (R4), and (c) on shared lines, max **20 new conversations/bot/day** and **40/line/day** (Photon hard limit 50), new contacts spaced >= 8 minutes, sends 9:00-20:00 recipient local time.
3. First bot-initiated message: text only, no links or media, names the business, includes AI disclosure (R9), ends with a question. Max 2 follow-ups to a non-responder.
4. Auto-pause outbound per bot when junk/STOP rate spikes or replies fall below 1 inbound per 2 outbound (Linq guidance); never rotate numbers to dodge a flag (Photon s.3.4(l)).
5. Never send marketing (discounts, cart recovery, announcements) over iMessage. AUP s.1 and s.6 already say this.
6. Terms s.5 disclaims Apple affiliation, delivery and number permanence (done in TERMS.md).
7. Medium term: evaluate an AMB integration through an MSP for Scale customers (requires live-agent handoff).

## R2. Photon (Something Great Inc.) Terms of Service

**Requires.** (photon.codes/terms-of-services, read 2026-10-10)
- s.3.4(b)-(c): Customer will not "provide access to, distribute, sell, lease, or sublicense any of the Services to a third party" or "use any of the Services on behalf of, or to provide any product or service to, third parties". s.15(n): we indemnify Photon for "unauthorized resale".
- s.3.8(g): no multiple accounts to evade limits (so one Photon project per merchant to multiply the 10/100-user caps is a breach unless agreed).
- s.3.6: we must hold and prove opt-in for every end user, no unsolicited/bulk messaging, AI disclosure, no deceiving users about automation. s.3.5: we warrant compliance with Platform Terms (Apple's). s.15: uncapped indemnity to Photon for consent, opt-out and AI-disclosure claims.
- s.7 / s.12.2: Photon may suspend at any time for any reason. s.18: beta liability capped at $50. No DPA published; s.5.2 lets Photon train ML on aggregated data. Governing law clause has unfilled brackets.
- Shared pool only messages handles registered as project "users" (Free 10, Pro 100). Business $250/line/mo: dedicated line, 50 new contacts/day.

**Current state.** Running on Photon Free under click-through terms. Pricing sells iMessage on Starter ($29) via shared pool (launch/billing/PLANS.md). NEEDS-AKI already lists the Business upgrade (gtm, billing).

**Gap.** Reselling Photon to merchants breaches s.3.4 on its face; no DPA; caps make shared-pool Starter impossible past ~100 end users in total.

**Fix.**
1. [Aki] Before charging anyone for iMessage, get a written Photon Order or platform addendum: permission for multi-tenant use, sub-accounts, who holds the Apple identity for managed lines, a DPA (processor, no training on our data, subprocessor list, hosting region), recovery SLA for flagged lines, filled-in governing law. Draft email: section "Photon email" below.
2. Until signed: treat iMessage as a beta on all plans; Terms s.5 already says no delivery guarantee. Do not advertise "unlimited iMessage".
3. Our Terms/AUP already flow Photon's s.3.6 duties down to merchants (TERMS.md s.3, s.9; AUP s.1-3).

## R3. Cold outreach to prospect stores (gtm plan)

**Requires.** CAN-SPAM (15 U.S.C. 7701-7713): no false headers or subject lines, identify as an ad, valid postal address, working opt-out honoured within 10 business days; penalty per email ($53,088 in 2025). Washington CEMA + *Brown v. Old Navy* (2025): $500 per email for misleading subject lines. Cold texts/iMessages to store owners' cell phones: WA flat ban without consent ("initiate or assist"), FL/OK/MD written consent for automated sales texts, TX registration, TCPA DNC (owners' cells often "residential"). Photon and Apple ban cold iMessage.

**Current state.** launch/gtm/OUTBOUND.md plans cold email with a postal address (NEEDS-AKI line exists). Plan also proposes pre-built demo bots per prospect and t.me links.

**Gap.** None in email if gtm follows its own plan; risk is any drift into texting prospects and public named-brand demo bots (R12, R13).

**Fix.** [gtm] Email only, US-only (no CASL/PECR). Never text or iMessage a prospect first. Demo bot link private and `noindex`, first message says "Unofficial demo built from <brand>'s public website, not affiliated with <brand>", no logos, delete after 30 days without reply.

## R4. TCPA, state mini-TCPAs and CTIA: consent to message

**Requires.**
- TCPA (47 U.S.C. 227): texts are "calls"; assume iMessage to a US number is too (no iMessage case found). Post-*Duguid* our list-based sender is probably not an ATDS, but DNC rules (64.1200(c)-(e)) cover texts and state laws use broader definitions. $500-$1,500 per message, no cap, class actions.
- Platform liability: FCC 2015 Glide ruling: a platform that sends to numbers a user supplied, choosing timing and content, is the "maker" of the call. Our AI writes the content and our scheduler sends it, so HeyBell is exposed directly, not only the merchant.
- Consent tiers: replies to a consumer who texted first = conversational (fine). Informational bot-first messages = prior express consent from the subscriber of that number. Promotional = prior express written consent (signed agreement naming the seller, "not a condition of purchase").
- States: WA (flat ban on commercial texts without consent, "assist" liability), FL FTSA, OK OTSA, MD (8am-8pm, 3 per 24h, written consent for automated sales texts), TX SB 140 (Sep 2025), VA (opt-outs honoured 10 years, from Jan 1, 2026).
- CTIA Principles (SMS fallback; benchmark for iMessage): consent records with timestamp, source, exact language, IP, number, identity; one opt-in per program; opt-in confirmation message.

**Current state.**
- `customers` table has no consent fields (`packages/db/migrations/0001_init.sql:16`). No consent table anywhere.
- API `POST /api/v1/bots/:id/messages` creates a customer and schedules a bot-first message to any handle (route.ts:43-50).
- Gateway `/invite` binds any phone and texts it (gateway.ts:286); localhost/admin token only, but the planned web "text me my bot" and public share page `/t/<slug>` (gtm request, COORDINATION 2026-10-10) would expose it to anyone.
- `schedule_message` tool lets the bot schedule follow-ups with no consent or quiet-hour check (builtin.ts:70).
- No quiet hours; no frequency cap per recipient.

**Gap.** No proof of consent for any bot-first message; anonymous number entry (planned) is the highest-risk TCPA pattern; scheduled follow-ups can be promotional.

**Fix.** [gateway + web + core] Concrete spec in COORDINATION.md (legal, 2026-10-10):
1. New append-only table `consents(id, bot_id, channel, handle, type['conversational'|'informational'|'marketing'], source['inbound'|'owner_self'|'share_page'|'api_attested'|'reoptin'], submitted_by, text_shown, text_version, ip, user_agent, page_url, created_at, confirmed_at, revoked_at, revoke_raw, revoke_method)`.
2. Inbound first message from a handle writes a `conversational` consent automatically.
3. Owner "text me my bot": checkbox "This is my number and I agree to receive automated messages from my HeyBell agent" (unticked), stores `owner_self`.
4. Public share page with phone entry: unticked checkbox with the informational disclosure text, Turnstile + per-IP/number rate limit, then ONE confirmation message only ("Reply YES to start chatting, STOP to opt out"); nothing else until YES (`confirmed_at`). No reply in 30 days = suppress.
5. API: require `consent: {source, captured_at, text}` (merchant attestation) for handles with no existing consent; reject otherwise with 422 `consent_required`. Log the attestation as `api_attested`.
6. Outbound worker checks consent + suppression (R5) before every send, enforces 9:00-20:00 Mon-Sat / 12:00-20:00 Sun recipient local time (area code, fallback US Eastern), no US federal holidays, max 3 bot-initiated messages per 24h per handle per bot. Replies inside an active conversation (customer wrote in the last 24h) are exempt.
7. `schedule_message` only for informational follow-ups the customer asked for; system prompt forbids promotional follow-ups unless a `marketing` consent exists.
8. Retain consent and revocation records 5 years after last message, opt-outs 10 years (VA).
9. [LAWYER] US TCPA counsel to review flows (b) share page and (c) follow-ups before launch.

## R5. STOP, HELP and opt-out handling

**Requires.** FCC 2024 order (in force Apr 11, 2025): revocation by any reasonable means; "stop, quit, end, revoke, opt out, cancel, unsubscribe" per se; honour within 10 business days; one confirmation within 5 minutes, no marketing. FCC 26-67 (adopted Sep 30, 2026, not yet in the Federal Register) keeps the 7 words and 10-day ceiling. CTIA: also natural-language opt-outs, HELP response. Apple AMB trigger words: "unsubscribe", "stop", "end", "spam"; "agent"/"help" for a human. Photon s.3.6 and Linq: stop on negative sentiment. VA: honour 10 years.

**Current state.**
- `router.ts:67`: only `stop`, `stop bot`, `unsubscribe` (exact) are recognised; the action only deletes the `line_routes` binding (`gateway.ts:178-183`). No suppression list.
- After STOP, `scheduled_messages`, the API, and `/invite` can text the same number again: nothing checks it.
- Telegram bots (`fixedBotId`) skip command parsing entirely (`gateway.ts:166`), so STOP on Telegram goes to the LLM.
- HELP: `helpText` is only sent to unbound senders (`gateway.ts:204`); a bound customer typing HELP gets an LLM answer.
- Stop confirmation copy (`router.ts:130`) is fine but tells the user how to re-join, not who stopped them.

**Gap.** Incomplete keywords, no persistence, no send-time check, Telegram not covered, no HELP.

**Fix.** [gateway] Spec in COORDINATION.md:
1. Normalise (trim, lowercase, strip punctuation/emoji). Opt-out set: `stop, stopall, stop all, unsubscribe, cancel, end, quit, revoke, opt out, optout, opt-out, stop bot`. Spanish `alto, para, basta`. Natural-language opt-out ("stop texting me", "remove me", "wrong number") via a cheap classifier (Haiku) only on short messages; when unsure, opt out.
2. On opt-out: insert `suppressions(bot_id, channel, handle, created_at, raw, method)`; `STOPALL` suppresses all bots on that line. Cancel that handle's pending `scheduled_messages`. Send one confirmation: "You're unsubscribed from <Bot> and won't get more messages. Reply START to resubscribe."
3. Check `suppressions` in `outbound.ts` deliver, in `/invite`, in the API route (return 409 `recipient_opted_out`) and before every bot reply that is not a reply to the user's own new message.
4. If a suppressed user writes again on their own, they may be answered (consumer-initiated); `START`/`UNSTOP` lifts the suppression and logs a `reoptin` consent.
5. Apply the same keyword handling to Telegram and WhatsApp bindings (before `fixedBotId` short-circuit).
6. HELP / INFO (bound or not): "<Bot>, an AI assistant for <Business>. For a person, reply HUMAN or email <owner support email>. Reply STOP to opt out." HUMAN / AGENT triggers `handoff_to_human`.
7. Never delete suppression rows (keep 10 years); account deletion keeps a hashed handle in suppressions.

## R6. Privacy law: GDPR / UK GDPR, CCPA and US state laws, India DPDP Act 2023

**Requires.**
- Roles: merchant = controller / business / Data Fiduciary for end-user chats; HeyBell = processor / service provider / Data Processor. HeyBell = controller for merchant accounts, site visitors, billing. Using conversations for cross-customer training, cross-merchant memory, or marketing to end users would make us a controller (avoid).
- GDPR (Art 3(2) once we sign EU/UK merchants): Art 28 DPA (all mandatory terms), subprocessor authorisation + notice, SCCs Module 2/3 + UK Addendum, Art 30 record (applies: processing is not occasional), breach notice to controllers without undue delay, Art 27 EU and UK representative (~EUR 500-3,000/yr each), UK ICO fee GBP 52 (Tier 1).
- CCPA: we are not a "business" (thresholds $26.625M / 100k consumers), but merchants need service-provider terms meeting Civ. Code 1798.140(ag) and 11 CCR 7051 (specific business purposes, no sale/sharing, no combining, notify if unable to comply, flow-down). Other states (VA model): processor contract terms.
- India DPDP Act 2023 + Rules 2025 (notified Nov 13, 2025): substantive duties from ~May 13, 2027 (MeitY consulted on compressing to ~Nov 13, 2026). s.8(2) processor only under contract; Rule 6 security safeguards; Rule 7 breach notice to Board (72h detailed report) and every affected person; s.17(1)(d) exemption for foreign data principals processed under contract with a foreign person (keep foreign merchants as contracting party). Penalties up to INR 250 crore. If incorporated in India, CERT-In 6-hour incident reporting. Until DPDP commences, IT Act s.43A + SPDI Rules 2011 apply to an Indian body corporate.
- Washington My Health My Data Act if a merchant's bot collects "consumer health data" (skincare, supplements).

**Current state.**
- `apps/web/app/(site)/privacy/page.tsx`: decent outline, but names no subprocessors, promises 90-day retention that is not implemented (R10), says "encrypted at rest" (true for disks; app-level only for credentials), no DPA, no controller/processor split per law, children "under 13/16" (our AUP says 18), contact email `hello@threadline.app` belongs to a stranger (COORDINATION domain note).
- No DPA, no subprocessor page, no Art 30 record, no breach runbook for customer notice.
- Memories are keyed per customer row, and customer rows are per bot (`customers UNIQUE(bot_id, channel, handle)`), so no cross-merchant memory today. Good: keep it.
- Telemetry: Cloudflare Web Analytics (cookieless), Sentry (errors may contain message text), Resend (merchant emails), Google OAuth sign-in.

**Fix.**
1. Publish PRIVACY.md, DPA.md, SUBPROCESSORS.md (drafted in this folder) at /privacy, /dpa, /subprocessors [web, after lawyer review].
2. Keep processor discipline: no training or evals on real end-user chats; no cross-bot memory; no marketing to end users. Written into DPA s.3.
3. Scrub message text and phone numbers from Sentry events [production].
4. Art 30 record + breach register: one-sheet in launch/legal (follow-up, after entity exists).
5. Before the first EU/UK merchant: EU + UK representative, ICO fee, TIA for EU to India/US [Aki, NEEDS-AKI].
6. Before DPDP commencement: Indian merchants get the DPDP schedule of the DPA; first reply to Indian end users carries the merchant's notice link (template in PRIVACY.md s.10 end-user notice).
7. Sign/accept vendor DPAs (Anthropic, Cloudflare, Supabase, Stripe, Resend auto-incorporated; Photon missing, see R2).

## R7. Telegram Bot Platform Developer Terms

**Requires.** (telegram.org/tos/bot-developers)
- s.4: every bot "must be bound by a privacy policy that is easily accessible"; Telegram's Standard Policy is the default but likely does not fit a bot that sends messages to an LLM, so set one in @BotFather.
- s.4.3: no data collection beyond what is essential; no datasets or ML training from Telegram data.
- s.4.2 delete data on request / when unneeded / on shutdown. s.4.4 encrypted at rest, stored separately from the key; notify users of breaches.
- s.4.5 the token owner is responsible for anything done with the token. s.5.2(f) no operating "by proxy (using Bot API credentials supplied by other users) in an attempt to circumvent bans or content moderation". s.5.2(b) no unsolicited messages (bots cannot message first anyway). s.6 digital goods only via Telegram Stars.

**Current state.** Customer pastes their BotFather token; stored with `encryptJson` (`channels.config_json`); long-polled per bot (`apps/gateway/src/telegram.ts`). STOP not handled on Telegram (R5). No BotFather privacy-policy guidance in the deploy flow. Revoked token → status `error`.

**Gap.** Bot privacy policy missing; STOP; end-user deletion (R10).

**Fix.** [web] On Telegram connect, show "Set your bot's privacy policy in @BotFather: /setprivacypolicy" with a hosted end-user notice URL per bot (`/p/<slug>`, template PRIVACY.md s.10). [gateway] R5 handling on Telegram. Never reconnect a business whose bot Telegram banned under a new token (AUP s.4.9 covers evasion). Terms s.3 already makes the merchant the developer of record.

## R8. WhatsApp Business Platform

**Requires.** (whatsappbusiness.com/policy, Sep 23, 2026; Meta Terms for WhatsApp Business Platform s.4.7)
- Opt-in before contacting anyone; templates outside the 24-hour window; automation must offer "prompt, clear, and direct escalation paths" to a human.
- s.4.7 "AI Providers" (from Jan 15, 2026): general-purpose AI assistants banned when AI is the primary functionality; business customer-service bots allowed; no training on WhatsApp data.
- Commerce Policy prohibited verticals; no full card numbers in chat.
- Tech Provider route: Meta business verification of a legal entity whose name and domain match.

**Current state.** WhatsApp listed as "when shipped" (Growth). Not implemented.

**Fix (before shipping).** Required "human contact" field per bot; system prompt scope lock (refuse unrelated general tasks); exclude WhatsApp data from any evals; vertical screen at onboarding; entity first (R14). AUP s.4.8 already covers the general-assistant ban.

## R9. AI disclosure

**Requires.**
- Anthropic Usage Policy (Sep 15, 2025, and the Nov 12, 2026 version): consumer-facing chatbots "must disclose to users that they are interacting with AI rather than a human ... at a minimum at the beginning of each chat session".
- California B&P 17940-17943 (SB 1001): bot used to incentivise a sale must disclose clearly; safe harbour on disclosure. Maine 10 M.R.S. 1500-DD (2025): clear and conspicuous notice when a reasonable consumer could think it is a human, any business size. Utah AI Policy Act: disclose on a clear request (sunset Jul 1, 2027). CA AB 1609 (signed Sep 28, 2026): $500M+ businesses only, human option. FTC Act s.5 deception.
- EU AI Act Art 50(1): providers (us) must design chatbots so people are informed at the latest at first interaction; applies from Aug 2, 2026 (not delayed by the Digital Omnibus). Up to EUR 15M / 3%.
- Photon s.3.6: must not deceive users about the automated nature.

**Current state.** Default greeting `Hi! I'm ${name}. How can I help?` (`packages/core/src/config.ts:32`); iMessage style rule "Write like a friendly human texting" (`packages/core/src/runtime.ts:15`). No disclosure rule in the system prompt; nothing stops the bot claiming to be human; persona is merchant-editable.

**Gap.** No AI disclosure anywhere. Clear breach of Anthropic's AUP today.

**Fix.** [core + gateway]
1. Every new conversation's first bot message (inbound or outbound) is prefixed or suffixed with a non-removable line: "(I'm <Business>'s AI assistant.)". Repeat when a conversation restarts after 24h of silence. Gateway enforces it, not the LLM, so merchants cannot edit it away.
2. System prompt rule: "You are an AI. If anyone asks whether you are a human, a bot, or real, say plainly that you are an AI assistant for <Business> and offer a human (handoff_to_human)." Keep "texting style" but delete "like a friendly human".
3. Regression check in runChecks: "are you a real person?" must answer AI.
4. Builder/wizard: block personas that present as a named human employee without "AI" (AUP s.3).

## R10. Retention and deletion: what we promise vs what the code does

**Requires.** FTC s.5 (saying one thing in a privacy policy and doing another is deception; *US v. Amazon (Alexa)* 2023, $25M for over-retention and ignored deletion). GDPR Art 5(1)(e), 17, 28(3)(g). CCPA 1798.100(a)(3), 1798.105. DPDP s.8(7). Telegram s.4.2.

**Current state.**
- Live privacy and terms pages promise conversation content is deleted after 90 days. No purge job exists (only heartbeat events are pruned: `apps/worker/src/index.ts:189`). Supabase snapshot history keeps 48h hourly + 30 days daily (`packages/db/src/snapshot.ts:11`), which matches "backups within ~30 days".
- Merchants can delete a bot (`apps/web/app/(app)/actions.ts:118`, cascades to customers, conversations, memories). No per-conversation or per-customer delete, no account deletion, no export.
- End users have no way to delete their data; STOP only unbinds.

**Gap.** The 90-day promise is false today. No end-user or account deletion.

**Fix.** [worker + web + gateway]
1. Worker daily job: delete `messages` (and LLM tool-call logs) older than 90 days; anonymise (`handle` → hash) and drop `memories` for customers silent for 12 months; keep `billed_conversations` counts (no content). Log each run.
2. End-user command "delete my data" / "forget me" (and same via email to privacy@): deletes that customer's messages and memories for that bot, keeps a hashed suppression if they also opted out, confirms by message.
3. Dashboard: delete a single conversation / customer; Settings → "Delete account" (deletes bots, keeps invoices 8 years in Stripe, not in our DB).
4. Until (1) ships, change the privacy page to say what is true ("we keep conversations until you delete them or close your account; automatic 90-day deletion is coming"). PRIVACY.md is written to the target state; WEB-DIFF.md lists the interim wording.

## R11. Anthropic Commercial Terms and Usage Policy

**Requires.** Commercial Terms (Jun 17, 2025): products for "its own customers and end users" allowed; customer must tell users outputs may be inaccurate; no training on Customer Content; DPA auto-incorporated (SCCs). Usage Policy: AI disclosure (R9); high-risk recommendations (legal, medical, finance, credit, insurance, housing, employment, education, healthcare access...) need meaningful review by a qualified person (Nov 12, 2026 version); products serving minors need extra safeguards; no raw resale/proxy of Claude. Supported regions: India and US yes; entities controlled from unsupported regions no. Default API retention 30 days (flagged content up to 2 years).

**Current state.** Anthropic key under Aki's personal account (expires 2026-11-06, COORDINATION). Public API `/api/v1` sends prompts that the bot rewrites (not raw Claude passthrough). Grounding rule against invented facts (`runtime.ts:82`). No high-risk vertical screen; no inaccuracy notice to end users.

**Fix.** AUP s.4.3, s.4.5, s.4.7 and s.7 flow these down (done). [web] Add "Answers are AI-generated and may be wrong" to the bot's hosted notice page and Terms s.3.1 (done). [core] Builder: if the site looks like a clinic, law firm, lender, insurer or broker, add a system rule "do not give individual medical/legal/financial advice; offer a human". [Aki] Move the Anthropic account to the company once incorporated (Commercial Terms are with the account holder).

## R12. Crawling customer and prospect websites

**Requires.** US: CFAA after *Van Buren* and *hiQ v. LinkedIn*: public, logged-out pages are low risk; continuing after C&D + block is the danger. Browsewrap ToS usually unenforceable (*Nguyen*); *Meta v. Bright Data* (2024) logged-out scraping not a contract breach. Copyright: facts free (*Feist*), prose/photos protected. EU DSM Art 4 TDM exception subject to machine-readable opt-out (robots.txt). India IT Act s.43/66 (access without permission).

**Current state.** `packages/core/src/ingest/website.ts:4` UA `ThreadlineBot/0.1 (+https://threadline.app/bot; ...)`; robots.txt per RFC 9309 honoured (`website.ts:20`). The UA's contact URL points to threadline.app, a domain owned by an unrelated company, so site owners who look us up reach a stranger. Owner-submitted crawls only (no prospect crawler yet; gtm plans one).

**Fix.** [core] UA → `HeyBellBot/1.0 (+https://heybell.app/bot)` once the domain is bought, and publish `/bot` (what we crawl, how to opt out, `abuse@`). Keep a global do-not-crawl list. Stop on 401/403/429/challenge; ~1 req/s; never log in or bypass CAPTCHAs. Terms s.3.6 (owner warrants rights) and AUP s.5 done. Prospect crawls: R3 rules + delete within 30 days.

## R13. Trademark and brand use

**Requires.** USPTO: THREADLINE STUDIO (class 42, allowed) and THREADLINE SYSTEMS (class 42, pending) make a THREADLINE registration likely refused and create infringement exposure (launch/domain/REPORT.md). Lanham Act s.43(a): false affiliation if demo bots speak "as" a real brand publicly; nominative fair use allows word-mark references without implied endorsement.

**Current state.** Rename to HeyBell pending Aki. Sanitea described as a public benchmark in blog posts (COORDINATION blog note).

**Fix.** [Aki] Approve rename; [LAWYER] knockout + full clearance search for HEYBELL in classes 9/38/42 before filing (USPTO base fee $350 per class from Jan 2025). [blog/gtm] Sanitea: add "Independent test on public pages, not affiliated with or endorsed by Sanitea", word mark only, or anonymise.

## R14. No legal entity

Contracts (Terms, DPA), Stripe live mode, Meta business verification, a Photon Order, Apple Business Register, EU representative, and the Anthropic org account all need a legal entity. See ENTITY.md (recommendation: Delaware C-Corp via Stripe Atlas, $500). Until then, Terms placeholders `[ENTITY]` stay and no money is taken.

---

## Photon email (draft for Aki to send to help@photon.codes; do not send from automation)

> Subject: Platform use of Photon for a multi-tenant customer-service product
>
> Hi Photon team, I run HeyBell (heybell.app), which builds AI customer-service agents for small online stores and runs them on iMessage through Spectrum. Each store is our customer; their shoppers message the agent. Before we charge stores for iMessage, we want to be sure we are inside your terms. Could you confirm, ideally in an Order or addendum:
> 1. that multi-tenant use is permitted despite ToS 3.4(b)-(c), and on which plan;
> 2. whether one project with several Business lines, or one project per store, is the right setup (3.8(g));
> 3. who holds the Apple identity for managed lines and what 3.5 means for us;
> 4. a DPA (processor role, no model training on our message content, subprocessor list, hosting region);
> 5. the sendReceiveRatioExceeded threshold and your recovery process and timing for a flagged line;
> 6. the governing law (the ToS has brackets).
> Thanks, Aki

## Open legal questions (for counsel) [LAWYER]

1. TCPA: is a merchant-attested API consent (R4.5) enough to shift "maker" liability, or must HeyBell hold the consent evidence itself?
2. Is iMessage to a US number a "call" for TCPA and state mini-TCPAs (no case found)?
3. Enforceability of our indemnity and liability cap against small merchants under Indian or Delaware law (depends on R14).
4. DPDP s.17(1)(d): which obligations survive for foreign end users processed in India.
5. Whether the Photon reseller arrangement shifts Apple-terms exposure to HeyBell.
