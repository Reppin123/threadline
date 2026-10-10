# Blog: launch posts

Six publish-ready posts. Source of truth for /blog on the site (apps/web/app/blog reads these files at build time).

| # | Slug | Primary keyword | Intent | Why |
|---|------|-----------------|--------|-----|
| 1 | how-to-add-an-ai-agent-to-imessage | imessage ai agent for business | Tutorial / commercial | Core product query; people searching "add AI to iMessage" want exactly what we sell |
| 2 | imessage-vs-sms-vs-whatsapp-vs-rcs | imessage vs sms vs whatsapp vs rcs for business | Comparison / research | Top-of-funnel channel choice; ranks for each pairwise "X vs Y for business" query |
| 3 | ai-agent-for-dtc-store-sanitea | ai shopping assistant for dtc store | Use case / proof | Shopify/DTC owners; real numbers from README (11/11, p50 3.8s) and core-e2e-checks (25/26) |
| 4 | testing-ai-chatbots-with-simulated-customers | how to test an ai chatbot | Educational / builder | Differentiator (checks); attracts technical buyers and links; data from packages/core/src/checks.ts |
| 5 | telegram-ai-bot-in-2-minutes | how to make a telegram ai bot | Tutorial | High-volume no-code query; fastest path to activation |
| 6 | customers-would-rather-text-than-use-your-app | text a business instead of an app | Opinion / shareable | Brand POV, matches the landing statement; for social and newsletters |

Rules followed: 1,200-2,000 words, frontmatter (title, description ≤155 chars, slug, date, primary/secondary keywords, author Aki),
H2/H3, links to /imessage-api /telegram-ai-agent /whatsapp-ai-agent and /signup, CTA, FAQ (rendered as FAQPage JSON-LD), no em dashes,
no invented customers or stats. Sanitea is described as a public benchmark site, not a customer.

Facts sources: README.md, AGENTS/core-e2e-checks.md, packages/core/src/checks.ts, apps/gateway/src/telegram.ts, site pricing
(updated 10-10 to gtm PRICING.md + billing gates: Telegram on Free, customer iMessage from $29, dedicated number add-on). External stats are cited inline with URLs and years.

FAQ format (parsed by the site): `## Frequently asked questions` followed by `### Question` + one-paragraph answer.
