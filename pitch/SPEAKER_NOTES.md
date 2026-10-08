# Threadline: speaker notes (about 2.5 minutes)

Deck: `pitch/deck.html` (arrow keys, `N` toggles notes, "Edit text" + "Copy HTML" to tweak) · PDF: `pitch/deck.pdf`.
Rebuild after editing `pitch/src/deck.src.html`: `node pitch/scripts/build.mjs`.
Placeholders marked **[AKI: ...]** need your own words (slides 1, 10, 12).

**1. Title (10 s).** Hi, I'm Aki. [AKI: one line about you.] Threadline turns a business's website into an AI agent its
customers can text on iMessage. The product and the company were built by AI agents, and every number here is either measured
from this build or sourced on the slide.

**2. Problem (15 s).** Shoppers answer texts. Klaviyo's benchmarks show SMS campaigns get about 3x the clicks of email. But a
brand that wants a real two-way agent in texts has to build five hard things: ingestion, tools, memory, testing and the iMessage
plumbing. Small brands can't.

**3. Why now (15 s).** Photon made iMessage programmable with an open-source SDK and cheap managed lines. iPhones are 69% of US
smartphone sales (Counterpoint, Q4 2025). And LLM tool use is now reliable enough to place an order, not just answer FAQs.

**4. Product (20 s).** Tell the builder what you have, here a tea shop's site. It crawls the site, pulls the catalog and policies,
writes the persona, guardrails and tables. Change it by chatting; the phone preview is the same brain customers get. Deploy to iMessage.

**5. How it works (15 s).** Four agents per bot: a builder reads the business, simulated customers attack it, a judge grades every
reply against the source pages, and only then does the runtime agent talk to customers. One chat function serves preview, tests
and iMessage, so what we test is what ships.

**6. Proof (20 s).** On a real store: 12 of 12 end-to-end checks, including saving an order and remembering the customer seven hours
later. 96% on simulated customers. Median reply under 4 seconds. An OpenAPI spec became 19 working tools. Honest status: no paying
customers yet, and real-phone delivery is one Photon allowlist setting away.

**7. Zero-human company (20 s).** An orchestrator froze a contract; seven specialist agents each owned a folder and coordinated
through an append-only log. Best moment: the gateway agent found Photon's free plan has no inbound number, the orchestrator
switched onboarding to "the bot texts you first", and the gateway shipped it five minutes later. First commit to live: 84 minutes.

**8. Wedge and market (15 s).** One customer first: Shopify brands that already pay for Gorgias or Postscript, about 110,000 store
installs. At 400 conversations a month at 50 cents, that's $263M. Every US Shopify store at our minimum plan is $1.4B.

**9. Business model (15 s).** Metered credits. Measured cost is about a cent per reply; with a shared Photon line it's about 7 cents
a conversation. At 50 cents that's 86% gross margin, half the price of Gorgias or Intercom's AI agents.

**10. GTM (20 s).** We build the bot before we email. 1,000 Gorgias and Postscript stores a month, a tested bot for each at $1.63,
and the email says "your store's bot is live, text it". At 15%, 20%, 40%: 12 customers a month, about $160 CAC, one-month payback.
Those rates are targets; Phase 2 measures them.

**11. Why we win (10 s).** iMessage first, tested before customers see it, done for you from a URL. And the company runs on agents,
so a new channel is a brief, not a hire.

**12. Ask (10 s).** Through October 11: first Shopify brands live, real-phone iMessage and Telegram, Postgres and billing, a dedicated
line. [AKI: the ask, in your own words.] Try it at threadline.akshitbansal1313.workers.dev. Thank you.

Appendix (questions only): A architecture · B data model · C how the agent org runs · D every source.
