<!--
DRAFT for lawyer review. Not legal advice. Prepared by the legal launch agent, 2026-10-10.
Replaces apps/web/app/(site)/terms/page.tsx once reviewed (change list: launch/legal/WEB-DIFF.md).
Placeholders: [ENTITY] legal name, [ADDRESS], [GOVERNING LAW] and [VENUE] (depend on launch/legal/ENTITY.md: Delaware C-Corp → Delaware law,
courts of Delaware; India Pvt Ltd → laws of India, courts of [city], or arbitration). Product name HeyBell pending the rename decision.
Pricing source: launch/billing/PLANS.md (enforced in packages/core/src/billing.ts). If PLANS.md changes, update section 6.
Customer-facing copy: no em dashes.
-->

# Terms of Service

Last updated: [DATE]

These terms are an agreement between you and [ENTITY], [ADDRESS] ("HeyBell", "we", "us"). They cover your use of the HeyBell website, dashboard, APIs, agents and messaging lines (the "service"). By creating an account or using the service you agree to them. If you use HeyBell for an organization, you confirm you can accept these terms for it, and "you" means that organization.

The service is for businesses. It is not for personal, family or household use, and you must be at least 18.

Three other documents are part of these terms: the [Acceptable Use Policy](/acceptable-use), the [Data Processing Addendum](/dpa) and the [Privacy Policy](/privacy) (which explains how we handle personal data as a controller). If they conflict, the order of priority is: DPA (for personal data you give us), these terms, the Acceptable Use Policy, then the pricing page.

## 1. What HeyBell does

HeyBell builds an AI agent from information you provide (your website, documents, API descriptions and answers to our setup questions) and runs it on messaging channels such as iMessage, Telegram and, when available, WhatsApp. The agent answers the people who message it ("end users") on your behalf, and can take actions you connect, such as saving an order or calling your API.

## 2. Your account

You must give accurate information and keep your login secure. You are responsible for everything done under your account, including by team members you invite and by anyone using your API keys. Tell us at once at [hello@heybell.app] if you think your account has been accessed without permission.

## 3. Your agents, your end users and your responsibilities

You are the business your agent speaks for. That means:

1. **What the agent says is your communication.** You decide what the agent is for, what information it uses and what tools it can use. You must review it before you launch it and keep an eye on it after. AI output can be wrong, incomplete or out of date, and you are responsible for decisions you or your end users make based on it.
2. **Consent to message.** You must have every consent the law and the channel require before your agent messages anyone first, including through invites, the share page, scheduled messages or the API. You must keep a record of that consent and give it to us if we ask. HeyBell records consent collected through its own share page; consent you collect elsewhere is your responsibility.
3. **Notices to end users.** You must tell your end users, in your own privacy policy, that you use HeyBell to answer messages and that an AI writes the replies. On Telegram, your bot must link to a privacy policy.
4. **AI disclosure.** You must not switch off or hide the statement that your agent is an AI, or instruct it to claim to be human.
5. **Opt outs.** You must not interfere with the STOP and HELP handling HeyBell provides.
6. **Your content.** You must have the right to use everything you give us, including the websites you ask us to read.
7. **The rules.** You must follow the Acceptable Use Policy and the rules of each channel you use.

## 4. Content and ownership

You keep ownership of your content: what you give us, your agent's configuration and the conversations your agent has. You give us a worldwide, non-exclusive licence to host, copy, process, transmit and display your content only to provide, secure and support the service for you, and as described in the DPA.

We keep ownership of the service, including our software, prompts, models of how agents are built and checked, and anything we create to improve the service. If you send us feedback or ideas, we may use them without owing you anything.

We do not use your content or your end users' conversations to train AI models, and our AI providers do not either under our agreements with them. We may use aggregated, de-identified statistics (for example, average reply time) to run and improve the service.

## 5. AI providers and channels

Replies are written by third-party AI models, currently from Anthropic. Messages travel over third-party networks: Apple's iMessage (through our provider Photon), Telegram and Meta's WhatsApp. HeyBell is not affiliated with or endorsed by Apple, Telegram, Meta or Anthropic.

These providers can change features, limit volume, filter messages (for example iPhone's "Unknown Senders" filter) or block numbers and accounts, sometimes without notice. We will try to keep your agent reachable, including by moving it to another line, but we do not promise that any message will be delivered or that any channel will stay available. If a channel stops working for reasons we do not control, that is not a breach of these terms.

**Shared lines.** On Free, Starter and Growth, your agent shares HeyBell's iMessage lines with other businesses, so the number your end users see may change and its reputation is shared. We may pause your agent's outgoing first messages, or the agent itself, to protect a shared line (Acceptable Use Policy section 6).

## 6. Plans, conversations and payment

**Plans.** Our current plans are shown on the pricing page. At the date of these terms they are:

| Plan | Price | Conversations included each month | After that |
|---|---|---|---|
| Free | $0 | 50 | No new conversations until the next month |
| Starter | $29 a month, or $288 a year | 300 | $0.15 each on monthly billing; yearly plans stop at 300 |
| Growth | $149 a month, or $1,488 a year | 1,500 | $0.10 each on monthly billing; yearly plans stop at 1,500 |
| Scale | From $599 a month, by order form | As agreed (from 6,000) | As agreed (from $0.08 each) |

Add-ons: extra bot $19 a month; dedicated iMessage number $399 a month (included in Scale). Each plan's bots, channels and features are listed on the pricing page.

**What a conversation is.** A conversation is one end user's thread with one of your agents on one channel in which the agent sent at least one reply. If the end user and the agent are both silent for 6 hours, the next message starts a new conversation. Messages your agent sends first (invites, scheduled messages, API messages) start or continue a conversation in the same way. These never count: the dashboard playground and preview, simulated customer checks, and on Free, iMessage with the first 5 iMessage contacts of each agent (you and your test phones).

**Monthly reset.** Included conversations reset at 00:00 UTC on the 1st of each calendar month, whatever your billing date. Unused conversations do not roll over.

**Reaching your limit.** When your included conversations run out on Free or on a yearly plan, conversations already open keep going until they go quiet for 6 hours, and new end users get a short reply saying the agent is at capacity. On monthly Starter and Growth, extra conversations are billed at the rate above, in arrears with your next invoice.

**Billing.** Paid plans are billed in advance, monthly or yearly, through our payment processor Stripe, until cancelled. You authorize us to charge your payment method for the subscription, add-ons and usage. Prices are in US dollars and exclude taxes; we add sales tax, VAT or GST where the law requires. If a payment fails we will retry and email you; if it is still unpaid 14 days later we may move you to Free or suspend the service.

**Changing plans.** You can upgrade or downgrade between Starter and Growth at any time; Stripe prorates the difference. Scale changes need a new order form.

**Cancelling.** You can cancel at any time from the billing page. Cancellation takes effect at the end of the current paid period; you keep your plan until then and then move to Free. We do not refund partial months or years, or unused conversations, except where the law requires or where we end the service without cause (section 10).

**Price changes.** We may change prices with at least 30 days' notice by email. The new price applies from your next billing period after the notice ends. Yearly plans keep their price until renewal.

**Free plan.** We can change or end the Free plan, or its limits, at any time.

## 7. Confidentiality and security

Each of us will keep the other's non-public information confidential and use it only for this agreement. We protect your content with the safeguards described in the DPA, including encryption in transit and encryption of the credentials you give your agent's tools.

## 8. Your data when you leave

You can delete agents and their conversations at any time, and ask us to delete your account. When your account ends, you have 30 days to export your conversations (from the dashboard or by asking us); after that we delete your content as described in the DPA, except where the law requires us to keep it.

## 9. Indemnity

You will defend and indemnify HeyBell against claims, fines and costs brought by third parties (including end users, regulators and channel providers) that arise from: your content; messages your agent sends to people you did not have consent to message; your breach of the Acceptable Use Policy; or your agent's tools and the systems they connect to.

We will defend and indemnify you against third-party claims that the HeyBell software, as we provide it, infringes their intellectual property, except to the extent the claim comes from your content or from combining HeyBell with something we did not provide.

## 10. Suspension and termination

You can stop using HeyBell and close your account at any time.

We may suspend or end your access if you breach these terms, do not pay, put a shared line or another customer at risk, or if the law or a channel provider requires it. Where it is practical and lawful we will tell you first and give you a chance to fix the problem. We may also end the service for any reason with 30 days' notice; if we do, we refund any prepaid fees for the time after it ends.

Sections 3.1, 4, 8, 9, 11, 12 and 13 survive termination.

## 11. Disclaimers

The service is provided "as is" and "as available". To the extent the law allows, we disclaim all implied warranties, including merchantability, fitness for a particular purpose and non-infringement. We do not promise that the service or any agent will be uninterrupted, error free or accurate, or that any message will be delivered.

## 12. Limits of liability

To the extent the law allows:

1. neither of us is liable for indirect, incidental, special, consequential or punitive damages, or for lost profits, revenue, goodwill or data;
2. each party's total liability for all claims under these terms is limited to the amount you paid us in the 12 months before the event giving rise to the claim (or $100 if you are on Free).

These limits do not apply to your payment obligations, your indemnity in section 9, or liability that cannot be limited by law.

## 13. General

**Governing law and disputes.** These terms are governed by [GOVERNING LAW], without regard to its conflict of laws rules. The courts of [VENUE] have exclusive jurisdiction, except that either of us may seek urgent relief in any court.

**Changes to these terms.** We may update these terms. For material changes we will email account owners at least 14 days before they take effect. If you keep using the service after that, the new terms apply; if you do not agree, you can cancel before they take effect.

**Other terms.** You may not assign these terms without our consent; we may assign them to a successor in a merger or sale. If any part is unenforceable, the rest stays in force. Not enforcing a right is not a waiver. Neither of us is liable for delays caused by events beyond reasonable control, including outages or policy changes at channel and AI providers. You may not use the service in, or for anyone in, a country or list subject to US or Indian sanctions. These terms, with the documents in the introduction, are the whole agreement about the service.

**Contact.** [ENTITY], [ADDRESS]. Email [hello@heybell.app]. Legal notices: [legal@heybell.app].
