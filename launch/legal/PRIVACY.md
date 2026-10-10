<!--
DRAFT for lawyer review. Not legal advice. Prepared by the legal launch agent, 2026-10-10. Replaces apps/web/app/(site)/privacy/page.tsx.
Written to the TARGET state of the product. Until the fixes in COORDINATION.md (legal, 2026-10-10) ship, use the interim wording in WEB-DIFF.md s.2.
Sources: launch/legal/research/privacy.md (GDPR/UK/CCPA/DPDP), platforms.md (vendors, Telegram s.4), us-messaging-ai.md (consent, FTC).
Placeholders: [ENTITY], [ADDRESS], [privacy@heybell.app], [EU REP], [UK REP] (only once EU/UK customers are signed), [GRIEVANCE OFFICER] (India).
Customer-facing copy: no em dashes.
-->

# Privacy Policy

Last updated: [DATE]

HeyBell lets businesses build AI agents that answer their customers on iMessage, Telegram and WhatsApp. This policy explains what personal data we handle, why, who we share it with, how long we keep it and what you can do about it.

It covers three groups of people:

- **Customers:** businesses and the people who sign up for HeyBell and build agents.
- **End users:** people who message a business's HeyBell agent.
- **Visitors:** people who visit heybell.app.

[ENTITY], [ADDRESS] ("HeyBell", "we") is responsible for this policy. Contact: [privacy@heybell.app].

## 1. Our role

- **For end users' conversations, the business is in charge.** The business that runs the agent decides why it exists and what it does. We process those conversations on the business's behalf, as its processor or service provider, under our [Data Processing Addendum](/dpa). If you are an end user, the business's own privacy policy also applies, and you can contact the business directly.
- **For customer accounts, billing and our website, we are in charge** (the controller).

## 2. What we collect

**From customers**
- Account details: name, email address, Google profile name and picture if you sign in with Google, team members you invite.
- Agent setup: website addresses, the content we read from them, documents, answers to setup questions, API descriptions, and credentials for tools you connect (stored encrypted).
- Billing: plan, invoices, billing address and tax ID. Card details go straight to Stripe; we never see or store them.
- Usage: conversation counts, sign in times, actions in the dashboard.

**From end users** (on behalf of the business)
- Your phone number, Apple handle, or Telegram or WhatsApp user ID, and the display name the app shares.
- The messages and attachments you send and the agent's replies.
- Facts you share that help the agent help you later, such as your name, order number, delivery address or preferences ("memories").
- If you signed up on a business's HeyBell page: the time, the wording you agreed to, your IP address and browser type, kept as proof of your consent.
- Your opt-out, if you text STOP.

**From visitors**
- Page views counted by Cloudflare Web Analytics, which does not use cookies or track you across sites.
- Technical data our servers need to deliver pages and stop abuse (IP address, browser type), kept in short-lived logs.

We do not knowingly collect payment card numbers, government ID numbers or health information through agents, and businesses may not set up agents to ask for them.

## 3. How we use it, and our legal bases

| Purpose | Data | Legal basis (EU/UK) |
|---|---|---|
| Run agents: route messages, write replies with AI, deliver messages, remember what end users told the agent | End-user data | On behalf of the business (processor) |
| Provide your account, build and test agents, show conversations and analytics | Customer data | Contract |
| Billing, invoices and tax | Billing data | Contract; legal obligation |
| Sign in, service and billing emails | Name, email | Contract |
| Security, abuse prevention, rate limits, debugging | All, minimised | Legitimate interests (keeping the service safe) |
| Product news emails to customers (you can unsubscribe in one click) | Name, email | Legitimate interests, or consent where required |
| Comply with law and enforce our terms | As needed | Legal obligation; legitimate interests |

**What we never do:**
- sell or share personal data for advertising;
- use end users' conversations to train or improve AI models, ours or anyone else's (our AI providers are also contractually barred from training on them);
- use one business's end-user data for another business, or combine end-user records across businesses;
- market to end users.

**AI and automated replies.** Agent replies are written by AI. They can be wrong, so businesses should check important answers, and agents offer a way to reach a person. Agents do not make decisions with legal or similarly significant effects about anyone.

## 4. Who we share it with

- **Service providers (subprocessors)** that host, back up and run HeyBell, write AI replies, deliver iMessages, send email, report errors and process payments. They are listed with their locations at [/subprocessors](/subprocessors), and they may use the data only to provide their service to us.
- **Messaging networks.** Messages pass through Apple (iMessage), Telegram or WhatsApp, which process them under their own privacy policies.
- **The business you are talking to.** End-user conversations are visible to that business in its dashboard.
- **Stripe** also acts as an independent controller for fraud prevention and legal compliance.
- **Authorities**, when the law requires it, or to protect people's safety or our rights.
- **A buyer** of HeyBell in a merger or acquisition, who must keep honouring this policy.

## 5. How long we keep it

| Data | Kept for |
|---|---|
| Message content | 90 days from each message, then deleted. Businesses can delete sooner |
| End-user memories | Until the end user asks us to delete them, 12 months without a conversation, or the agent is deleted |
| Consent records and opt-outs | Consent proof: 5 years after the last message. Opt-outs: as long as needed to honour them (a one-way hash of the number) |
| Customer account and agent setup | While the account is open, then 30 days to export, then deleted |
| Invoices and tax records | 8 years (tax and company law) |
| Security logs (no message content) | 1 year |
| Backups | Up to 30 days, then overwritten |

## 6. Your rights

Depending on where you live, you can ask to access, correct, delete or receive a copy of your personal data, object to or restrict processing, withdraw consent, and complain to a data protection authority.

- **End users:** text **STOP** to stop messages from an agent, **HELP** for help, and **delete my data** to erase your messages and memories with that agent. For anything else, contact the business, or us at [privacy@heybell.app] and we will pass it on or handle it.
- **Customers:** delete conversations, agents and your account from the dashboard, or email us.

We reply within 30 days (45 days where California law allows, with notice). We will not treat you differently for using your rights. We may need to confirm your identity, for example by asking you to send the request from the same phone number.

**California.** We do not sell or share personal information and have not done so in the last 12 months. The categories we collect are listed in section 2, the purposes in section 3, the recipients in section 4 and the retention in section 5. You can use an authorized agent.

**India.** Our grievance contact is [GRIEVANCE OFFICER], [privacy@heybell.app]. You can also complain to the Data Protection Board of India once it accepts complaints.

**EU and UK.** Our representatives are [EU REP] and [UK REP]. You can complain to your local data protection authority.

## 7. Security

We use encryption in transit and at rest, extra encryption for credentials, separation of each business's data, limited staff access with multi-factor authentication, rate limits, logging, monitoring and tested backups. Details are in Annex 1 of the [DPA](/dpa). If a breach affects your data, we will tell the businesses involved without undue delay and, where the law requires, the people affected and the authorities.

## 8. International transfers

We and our providers process data in the United States and other countries. When personal data leaves the EU, UK or Switzerland, we use the European Commission's Standard Contractual Clauses (with the UK Addendum) or our providers' EU-US Data Privacy Framework certification.

## 9. Children

HeyBell is for businesses and is not directed at children. Businesses may not use HeyBell for agents aimed at people under 18. If an agent learns it is talking to a child, it stops saving memories. If you think a child's data is with us, email [privacy@heybell.app] and we will delete it.

## 10. Notice for end users of HeyBell agents

Businesses can link to this short notice from their own privacy policy, their HeyBell page and their Telegram bot (in @BotFather, set it as the bot's privacy policy). HeyBell hosts it for each agent at heybell.app/p/[agent].

> **[Business] uses HeyBell to answer your messages.** Replies are written by an AI assistant, and a person from [Business] can step in. We keep your number, your messages and details you share (like your order number) to help you, for 90 days for messages. We send them to HeyBell and its providers, including Anthropic for AI replies, only to answer you. They are never used to train AI or for advertising. Text STOP to stop messages, HELP for help, or "delete my data" to erase your data. Questions: [business contact]. Full policy: [business privacy URL] and heybell.app/privacy.

## 11. Changes

We will post changes here with a new date. For material changes, we will email customers at least 14 days before they take effect. We will never start using end-user conversations for a new purpose, such as AI training, without notice and, where required, consent.
