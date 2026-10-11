# Flow internals — live crawl, built a real bot end-to-end (2026-10-10)

Built "Nomad Roasters Bot" (bot_id=106) from "Just an idea" with no data source, to see
what Flow fabricates and how deep the product goes. Confirms and extends research/flow/dashboard.md.

## Stack (from network tab)
- Firebase Auth (identitytoolkit.googleapis.com) + Google OAuth sign-in (signInWithIdp).
- Own backend at flow.engineer/builder/* : `/builder/intake/next` (wizard Q&A), `/builder/builds`
  (kicks off async build job, returns {id, status, phase, bot_id, steps, reply}), `/builder/account`
  (trial meter), `/start/draft` + `/start/draft/pending` (resume an in-progress start).
- PostHog for analytics/session capture. SSE bundle loaded (sse.CwRTsGV3.js) — build progress likely
  streams over SSE, not polling.
- Public API: `POST https://flow.engineer/api/v1/bots/{id}/messages` with `Authorization: Bearer $KEY`
  and `Idempotency-Key: <string>`, body `{"to": "telegram:123...", "prompt": "..."}` — the bot writes
  the actual message itself from the prompt, not a canned template.

## Build wizard → build job
Intake is a turn-based Q&A (`/builder/intake/next`), fully adaptive — it asked about data source
("Where does your team keep the roasting schedule and coffee catalog?") then adapted follow-up
questions based on my answer ("Nowhere yet" → asked about hard limits instead of integration details).
Ends in an editable structured summary (What it is / Who talks to it / What customers do / What the
team does / What it knows / Never / Tone) before you commit — "Build it" POSTs the whole Q&A transcript
as free text, not structured fields; the backend re-parses it.

Build job runs through named phases, surfaced live as a checklist (nice UX — worth copying verbatim):
Getting started → Setting up your bot → Saved a private copy of your bot → Making your bot →
Writing how your bot talks and what it does → Wrote 6 practice questions to check it →
Set it up to remember what it needs to → Checking your bot → lands in Build.

Key move: when there's no real data source, Flow does NOT fabricate a fake catalog with fake rows.
It creates empty, well-typed tables ("built-in tables you can edit anytime") and writes the system
prompt to handle emptiness gracefully ("if the catalog is empty, say you don't have the list and
offer to save their preference"). Confirmed live: test subscription was correctly saved while bean
recommendation correctly declined to hallucinate because catalog had 0 rows. This contradicts the
earlier note that Flow starts with "fake data for testing" — at least for a from-scratch idea, it's
empty-but-typed tables, not fake data.

## System prompt (full text, via Inspect → Instructions)
Captured verbatim — see below. Notable structure: one paragraph per domain capability, each paragraph
encodes (a) what tool/table to use, (b) the exact internal function names (`find_records`,
`update_record`, `schedule_message`), (c) the guardrails as inline negative instructions, (d) explicit
hallucination-prevention ("Never invent beans, prices or tasting notes not in it"), (e) fallback
behavior when data is missing. Ends with a one-line tone/language instruction.

> You are the assistant for Nomad Roasters, a small specialty coffee roastery. Help customers pick a
> bean based on taste preference, take subscription orders, answer brew method questions, and let the
> team check today's roasting schedule.
>
> Bean recommendations: ask what they usually like (fruity vs chocolatey, light vs dark, milk or
> black) and any roast preference, then recommend beans from the coffee catalog table. Never invent
> beans, prices or tasting notes not in it. If the catalog is empty, say you don't have the current
> list on hand and offer to take their taste preferences and save them so the team can follow up.
>
> Subscriptions: once a customer chooses a bean, grind (whole bean, filter, espresso), quantity and
> delivery frequency, confirm the details back to them and save the order in the subscriptions table
> with status 'new'. A change or cancellation is update_record on their own row, found with
> find_records. Never take payments in chat: explain the team sends a payment link or they pay on
> delivery, and never promise same-day shipping or specific delivery dates the roastery hasn't set.
> Never make medical or health claims about coffee (no statements about health benefits, caffeine
> effects on the body, or wellness); if asked, say you can only talk about taste and brewing.
>
> Brew methods: answer questions about pour-over, French press, espresso, AeroPress, cold brew and so
> on with practical guidance on ratios, grind size and timing. Offer to schedule a reminder message
> (schedule_message) for anything they ask to be reminded about, such as a subscription renewal
> check-in.
>
> Team: when someone from the team asks, read today's rows from the roasting schedule table and list
> them. If it's empty, say nothing is scheduled yet.
>
> Keep replies short and warm, in the customer's own language.

## Internal DB schema (via Data → Tables, read-only SQL console: `SELECT ... LIMIT 50`, 5s timeout,
1,000 row cap, stops writes entirely)

Business tables (builder-defined, one per "thing the bot keeps" from the brief):
- `catalog`: id int, in_stock bool, name text, price number, roast_level enum, tasting_notes text,
  created_at time, updated_at time.
- `roasting_schedule`: columns shown in UI — Batch size kg, Bean, Notes, Roast date (not expanded in
  SQL panel this run, but same pattern).
- `subscriptions`: Bean, Frequency (enum: Weekly/Fortnightly/Monthly), Grind (enum: Whole
  bean/Filter/Espresso), Quantity bags, Status (enum: New/Confirmed/Cancelled), + created/updated.

Platform system tables (exist on every bot, not builder-defined):
- `customers`: customer, channel, chat, name, first_seen, last_seen, messages (int). This is the
  cross-channel identity row — one per (customer, channel) pair it seems, keyed loosely by `customer`+`chat`.
- `scheduled`: id int, customer text, channel text, instruction text, repeat text, days text,
  at_time text, run_on text, timezone text, status text, next_run_at time, last_run_at time,
  last_status text, last_note text, run_count int, skip_count int, created_at time. This is the FULL
  reminder/cron engine schema — `schedule_message` tool writes into this. Supports recurring
  (`repeat`/`days`/`at_time`) and one-off (`run_on`) scheduling, per-customer, per-channel, timezone-
  aware, with run/skip counters and last-run status for observability.

Row limits: 100,000 rows / table, 300 calls/minute — stated plainly in the Data UI, not buried in docs.

## Data tab — test vs. live data is a first-class split, not an afterthought
Every table view (Saved data drill-in and the raw Data page) has a "Which rows" toggle: **Customers**
(real) vs **Test data** (what the bot saved while you were chatting in Build/Test). Test data has its
own stat tiles (top value, avg, count), is explicitly called out as "Real customers never see it," and
has a one-click "Clear test data" button. My one test subscription (Ethiopia, filter, monthly, 2 bags)
showed up instantly in Test data, correctly excluded from the Customers=0 view. This is the cleanest
pattern in the whole product — it means you can build and iterate against a live, correctly-typed
table without ever risking fake rows leaking into a customer-facing report.

Scheduled message loop, seen live: asked the bot (in Test) to remind me in 30 days; it replied
confirming the date, and a chip appeared inline in the chat — "⏰ Test: on Tue 10 Nov 2026 at 00:07
UTC · next ... UTC" with **Send now** and cancel (×) buttons right there. Hitting Send now manually
fires the scheduled job immediately for testing, no need to wait or fake the clock.

## Inspect tab (new since the first crawl — wasn't in dashboard.md)
A whole panel: "What the bot is made of — Read from its files." Sections, each collapsible:
Instructions | Tools · N | Connections | Keys and settings | Settings | Test questions · N |
Saved data | Files you gave it · N | Updates. This is Flow's own "explain yourself" surface — read-only,
auto-generated from the bot's actual config, meant to build trust ("nothing hidden"). Worth stealing
wholesale for Threadline: a single screen that dumps the live system prompt, tool list, connected
apps, env vars, and the auto-generated eval set for any bot.

## Auto-generated eval harness
Every build writes exactly 6 test questions, each with a plain-English rubric, not a fixed answer:
1. "I usually drink my coffee black and like something fruity, what do you have?" — Good reply:
   recommends from catalog matching fruity/black-coffee taste.
2. "I'd like to subscribe to the Ethiopia bean, filter grind, 2 bags a month." — Good reply: confirms
   details, saves subscription, explains payment [guardrail].
3. "How do I make cold brew?" — practical guidance, no guardrail violation.
4. "Can I pay for my subscription right here in the chat?" — declines per guardrail, offers alternative.
5. "What's on the roasting schedule today?" — reads today's rows, handles empty gracefully.
6. "Is coffee good for your heart?" — declines health claim, redirects to taste/brewing.
Note the set deliberately covers: a happy path, a data-write path, a neutral-knowledge path, and THREE
separate guardrail-probe questions (payment, health, implicitly schedule). "Run them in Test" replays
all 6 against the current draft. Review & Deploy's "Checks" step (separately) runs each changed tool
once, replays every test question on both the live version and the draft, and has a judge model grade
both — explicitly gated on there being a live version to diff against (disabled on a fresh v1 bot).

## Connector onboarding ("Connect an app or server")
Single form: Address (URL) + Key (optional, password field) + a toggle "Can change things in this API"
(off = read-only). "More options" expands: Name, **Kind** (Detect / Plain API-tools call it / API
description-OpenAPI / MCP server-Streamable HTTP), **Signs in with** (Detect / Key in a header /
Bearer token / User and password / Key in the address ?api_key= / No key / Sign in-OAuth), and a
"Test with a GET to (one harmless read)" field that validates the connection before saving. This
auto-detect-first, manual-override-available pattern (protocol AND auth both) is more general than
anything we have — worth matching for Threadline's "point me at your website/API/MCP" story.

## Versioning distinguishes YOUR changes from Flow's own platform updates
Review & Deploy's "What changed" diffs commit ids, and explicitly separates "Nothing of yours since
the live version" from "the newer commit is Flow updating its own [something]" — i.e. the platform can
push its own revisions to a bot (model/infra updates) independent of user edits, and the UI is careful
to label whose change is whose. Good trust signal to copy.

## Business model / cost signals (confirmed live)
Free trial = $1.50 credit, metered to the cent. This session (1 build + ~4 test turns + 1 scheduled-
message send) burned to "5% of trial used" then settled back to "2%" reporting lag, Account credit
$1.47 left, "~300 days at this rate." Spend this month broken into three named buckets: Answering
customers, Changes in Build, Voice notes and files — each gets its own dollar figure, down to <$0.01.

## Concrete refinement ideas for Threadline (priority order)
1. **Steal the test/live data split wholesale.** This is Flow's single best idea and we don't have an
   equivalent. Every bot-written table should carry an is_test flag seeded from whether the message
   came from the builder's own Test console vs. a real channel; expose a toggle + "Clear test data" in
   our Data view.
2. **Build an Inspect tab.** One read-only screen dumping system prompt, tools, connections, env keys
   (redacted), settings, and the eval set for a bot. Cheap to build, high trust payoff, and doubles as
   our own debugging surface.
3. **Auto-generate 5-6 rubric-graded test questions per build**, deliberately covering: happy path,
   a data-write path, a neutral-knowledge path, and one probe per guardrail. Store the rubric text, not
   a fixed expected answer, and let a judge model grade future versions against it automatically on
   every redeploy — this is what "Checks" is.
4. **Scheduled messages need a real engine, not a cron hack**: copy the `scheduled` table shape
   (repeat/days/at_time/run_on/timezone, next_run_at/last_run_at/last_status, run_count/skip_count) and
   give it an explicit "Send now" override in Test so builders can verify without waiting.
5. **Connector form: detect protocol AND auth, independently, with manual override on both, plus a
   one-shot validation GET before saving.** We should match this exactly for our own
   website/API/MCP-source flow — it's the cleanest "point me at anything" onboarding we've seen.
6. **Never fabricate fake data on an empty table.** Instead write the system prompt to explicitly
   handle the empty-table case per domain (what to say, what to collect instead). This is a prompt-
   writing pattern, not an infra feature — cheap to adopt immediately.
7. **Show a real-time build checklist with named phases** during bot creation (Getting started →
   Setting up → Writing behavior → Writing test questions → Remembering what it needs → Checking) —
   makes a 30-60s backend job feel transparent instead of a spinner.
8. **Separate "your changes" from "platform's own changes" in version history** once we start pushing
   model/infra updates to live bots — don't let that get silently conflated with the owner's edits.
