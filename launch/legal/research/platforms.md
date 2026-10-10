# Platform and Vendor Policy Research: Threadline / HeyBell

Researched 2026-10-10 from live pages. This is not legal advice.
Legend: **[V]** means verified on the official page on 2026-10-10, quoted verbatim. **[V-sum]** means confirmed on the official page but paraphrased, because the fetch tool would not return the full verbatim text. **[UNVERIFIED]** means it comes from secondary sources or memory, or the page could not be read; confirm before relying on it.

---

## 1. Telegram

### Sources
- Bot Platform Developer Terms of Service: https://telegram.org/tos/bot-developers. No "last updated" date is shown. §14 says changes take effect when posted.
- Telegram Terms of Service: https://telegram.org/tos. No date shown.
- Standard Privacy Policy for Bots and Mini Apps: https://telegram.org/privacy-tpa (linked from the Bot ToS; URL [UNVERIFIED])

### Key clauses (verbatim [V] unless marked)

**Who is bound.** "These Terms of Service for Bot Platform Developers ... constitute a legally binding agreement between you and Telegram Messenger Inc. ... 'you' refers to you, the developer of TPA." (TPA = Third Party Apps = bots and Mini Apps.)

**Privacy policy required (§4).** "all TPA must be bound by a privacy policy that is easily accessible to their users, detailing what data they store, how they collect it, and for what purpose."
- Default fallback: "This Standard Policy applies by default to all TPA that don't provide a privacy policy of their own ... If you choose to adopt the Standard Policy by not providing one of your own, it is solely your responsibility to ensure that its stipulations are comprehensive, fit your use case in practice, and comply with all applicable laws."
- If the default does not fit: "you must provide a separate privacy policy that is easily accessible to your users. In such cases, TPAs must set up a Privacy Policy in @BotFather".
- "TPA which mishandle user data or otherwise violate their own privacy policy will be terminated from Bot Platform and legal action may be taken against their developers."
- **What this means for us.** Our bots send message content to a third-party LLM (Anthropic) and store transcripts. That is probably outside the generic Standard Policy, so each customer bot should have a privacy policy registered in @BotFather. We must tell the customer (the token owner) to do this, or supply a template or hosted URL. BotFather is controlled by the token owner, not by us.

**Data minimisation and AI (§4.3).** "You agree not to use your TPA to collect, store, aggregate or process data beyond what is essential for the operation of your services. Always prohibited uses include any form of data collection aimed at creating large datasets, machine learning models and AI products, such as scraping public group or channel contents."
"Without limiting the foregoing, you are free to use data submitted directly and voluntarily to your TPA by users, provided that you clearly inform them of the data's intended use and they give their individual, explicit, active and revocable consent."
- **What this means for us.** Answering users with an LLM at runtime is "operation of your services". Using Telegram chats to train or improve models, or to build cross-customer datasets, is prohibited. Our Terms and DPA should say we do not train on customer conversations. Anthropic does not train on API data either (see §3).

**Retention (§4.2).** The developer must delete user data "(a) ... upon their (or our ...) request", "(b) ... when retention thereof becomes unnecessary", and "(c) ... upon the cessation of your TPA's operations". On churn or disconnect we need a deletion path for Telegram transcripts.

**Security (§4.4).** At a minimum: "(a) Make sure user data is always encrypted at rest and stored separately from its encryption key; (b) Alert your users of any data breach you sustained, in accordance with applicable laws". This needs checking against our Supabase setup. Supabase encrypts at rest at the disk level. Whether that meets "stored separately from its encryption key" is [UNVERIFIED] / an internal engineering question.

**Credentials (§4.5).** "These credentials are intended solely for the operation of the products and services you offer through Telegram APIs ... you are explicitly prohibited from making them available to the public. You understand and agree that any actions taken by others who authenticate using your credentials will be deemed as taken by you".
- **What this means for us.** The customer is the "developer" and owns the token. Everything we do with the token is attributed to the customer. Our customer terms should say plainly that the customer authorises us to operate the bot on its behalf, stays the bot developer of record under Telegram's terms, and that we keep tokens secret (encrypted).

**Spam (§5.2(b)).** "Your TPA must not harass or spam users with unsolicited messages;" The Telegram ToS separately bans "Use our service to send spam or scam users."

**Impersonation (§5.2(c)).** The TPA must not "impersonate ... Telegram or any entity which did not authorize you to represent them". Customers may only connect bots for businesses they are authorised to represent.

**Operating bots for others / "proxy" (§5.2(f)), important.** "Your TPA must not attempt to circumvent or otherwise undermine Telegram rate limits and moderation. Without limiting the foregoing and by way of example, your TPA must not operate by proxy (i.e., using Bot API credentials supplied by other users) **in an attempt to circumvent bans or content moderation**."
- **Interpretation.** The ban is tied to circumventing bans and moderation. It is not a blanket ban on hosted bot builders, and many no-code bot builders take BotFather tokens. Still, our model is literally "using Bot API credentials supplied by other users". Mitigations: one token per customer bot; never rotate tokens to evade a ban; never share rate-limit budgets across tokens; suspend a customer whose bot Telegram bans; do not reconnect a banned business under a new token. There is no explicit Telegram statement endorsing third-party bot hosting ([UNVERIFIED] whether Telegram has published one).

**Divergent use (§5.2(e)).** Do not use Bot Platform to build "external services or applications that diverge significantly from the intended use cases of Bot Platform (e.g., cloud storage sites)." A customer-service chatbot is a core use case.

**Predictability.** "users must always be informed of any significant changes pertaining to the operational scope of your TPA, and should be given an option to opt out".

**Telegram Business chatbots (§5.4)**, relevant if we ever support connecting a bot to a Telegram Business account. The developer must "(iii) Never use message contents ... for any other purpose than providing your services as a business Chatbot; (iv) ... never disclose message contents ... to third parties (including third-party APIs) without the user's authorization". If we add this mode, sending content to Anthropic would require user authorisation.

**Payments (§6).**
- Physical goods: "Telegram does not process payments for physical goods and services ... you can choose a third-party payment provider".
- Digital goods: "Due to requirements from stores that host Telegram apps, transactions for digital goods and services cannot be processed through third-party payment providers. Accordingly, all transactions pertaining to digital goods and services must be executed exclusively through the exchange of Telegram Stars".
- **What this means for us.** We do not sell anything inside Telegram. HeyBell subscriptions are billed on our website through Stripe, outside Telegram, so §6 does not apply to us. It does apply to customers if their bot sells digital goods in-chat. Our product must not offer in-bot checkout links for digital goods, or must warn customers. Taxes: "You are solely responsible for all taxes".

**Liability and indemnity (§12).** "Telegram will not be liable for the manner in which its users interact and engage with the services you offer". §12.2: "You accept and agree to grant Telegram ... absolute indemnity and to hold them harmless from and against any and all claims ... arising from, related to, or in any way incurred as a result of your use of ... Bot Platform." §12: "you expressly agree to hold Telegram harmless and indemnify it against any claims ... resulting from ... your misuse of our services ... [including where] you, your associates, those acting on your behalf ... violate these Terms". We act "on behalf of" the customer, so the customer carries this indemnity for our conduct. Our customer contract should allocate that back.

**GDPR.** "you will comply with all applicable privacy laws and regulations, such as the European Union's General Data Protection Regulation (GDPR). It is your responsibility to determine whether or not such laws apply".

**Termination (§10).** "Failure to comply with these Terms or the Telegram Terms of Service may result in a temporary or a permanent ban" [V-sum/V].

**AI bots generally.** The Bot ToS has no AI-specific section other than the §4.3 training and dataset ban [V-sum]. Telegram's ToS also bans spreading "harmful misinformation (including harmful deepfakes)" [V-sum].

---

## 2. WhatsApp Business Platform (Meta)

### Sources
- WhatsApp Business Messaging Policy, which now also contains the Commerce Policy: https://whatsappbusiness.com/policy/ (business.whatsapp.com/policy and whatsapp.com/legal/commerce-policy both 301-redirect here). **Last updated: September 23, 2026** [V].
- Meta Terms for WhatsApp Business Platform, formerly "WhatsApp Business Solution Terms": https://www.facebook.com/legal/Meta-Terms-for-WhatsApp-Business-Platform (whatsapp.com/legal/business-solution-terms redirects here). Last updated September 23, 2026 [V-sum].
- Pricing: https://developers.facebook.com/docs/whatsapp/pricing
- Solution providers overview: https://developers.facebook.com/docs/whatsapp/solution-providers
- Tech Provider onboarding: https://developers.facebook.com/docs/whatsapp/solution-providers/get-started-for-tech-providers

### Opt-in (Messaging Policy §1) [V]
- "You may only contact people on WhatsApp if: (a) they have given you their mobile phone number or username ... [and] you have received opt-in permission from the recipient confirming that they wish to receive subsequent messages".
- Best practices: "Obtaining separate opt-in by specific message category." and "Provide clear instructions for how people can opt out of receiving specific categories of messages".
- "You must not impersonate another business or otherwise mislead customers as to the nature of your business."

### 24-hour customer service window and templates (§2) [V]
- "You may reply to a user message without use of a Message Template as long as it's within the 24-hour [customer service window] ... which opens and resets with each user message."
- "Outside the 24-hour customer service window, you may only send messages via approved Message Templates."
- "We have the right to review, approve, pause and reject any Message Template at any time."
- **Human escalation is required for automation:** "You may use automation when responding during the 24-hour window, but must also have available prompt, clear, and direct escalation paths. These escalation paths include: In-Chat Human Agent transfer, Phone number, Email, Web support (on the business website), In-store visits, Support form." **What this means for us:** every WhatsApp agent must expose a human handoff path (for example the business email or phone in the bot's fallback answer). This should be a required configuration field.

### Data handling (§3) [V]
- "You are responsible for and must secure all necessary notices, permissions, and consents".
- "You may not forward or otherwise share information from a customer chat with any other customer." (Relevant to multi-tenant isolation and to any shared or cross-customer memory.)
- "Don't share or ask people to share full length individual payment card numbers, financial account numbers," etc.

### Commerce Policy [V]
- Scope: "The Commerce Policy is used to govern whether businesses can sell their products and services using WhatsApp for Business". It points to the Meta Commerce Policy. Prohibited categories include weapons, tobacco and alcohol, pharmaceuticals and medical supplies, live animals, hazardous materials, currency/crypto, body parts, real-money gambling, adult content, dating, MLM, high-interest lending and debt collection [V-sum]. **What this means for us:** WhatsApp onboarding should screen out customers in these verticals (for example dispensaries, payday lenders, dating apps).

### AI Providers ban, effective January 15, 2026
Current text in the Meta Terms for WhatsApp Business Platform, **§4.7 "AI Providers"** [V-sum, with short verbatim excerpts]:
- "Providers and developers of artificial intelligence or machine learning technologies[, including but not limited to large language models, generative artificial intelligence platforms, general-purpose artificial intelligence assistants, or similar technologies ('AI Providers')] are strictly prohibited from accessing or using the WhatsApp Business [Platform], whether directly or indirectly, for the purposes of providing, delivering, offering, selling, or otherwise making available such technologies when such technologies are the primary (rather than incidental or ancillary) functionality being made available for use, as determined by Meta in its sole discretion." (Core wording verified on the Meta page and in TechCrunch's quote. The bracketed list is from the TechCrunch / press copy, [V-sum].)
- **Solution Provider carve-out:** "you may retain an AI Provider as your Solution Provider" [V], within the limits of the Terms.
- **No AI training on WhatsApp data:** "you may not directly or indirectly allow WhatsApp Business Platform Data ... to be used to create, develop, train, or improve any machine learning or artificial intelligence systems". This covers anonymised, aggregate and derived forms too. There is an exception for fine-tuning a model **for your exclusive use**, as long as the data is not used to improve other models [V-sum].
- Effective date of Jan 15, 2026: per TechCrunch (2025-10-18), https://techcrunch.com/2025/10/18/whatssapp-changes-its-terms-to-bar-general-purpose-chatbots-from-its-platform/ [V on TechCrunch; the Meta page itself shows no separate effective date].
- **Business customer-service bots remain allowed.** Meta's statement to TechCrunch: "The purpose of the WhatsApp Business API is to help businesses provide customer support and send relevant updates. Our focus is on supporting the tens of thousands of businesses who are building these experiences on WhatsApp". TechCrunch reports that Meta said a travel company's customer-service bot is not affected [V-sum].
- **Assessment.** A HeyBell agent answers questions about a specific business, so the AI is ancillary to that business's customer service. It is not a general-purpose assistant being distributed, so it should be permitted. The risks:
  1. We must not let the bot act as an open-ended general assistant. Keep scope restrictions in the system prompt, for example refusing unrelated tasks.
  2. Meta has "sole discretion".
  3. Threadline is arguably a "developer of AI technologies" acting as Solution Provider. That is expressly allowed via the carve-out.
  4. Our pipeline must not use WhatsApp conversation data to train or improve shared models, including cross-customer prompt or eval datasets built from real chats.

### Pricing [V]
- "Effective July 1, 2025, Meta charges on a per-message basis." "You are only charged when a template message is delivered." Non-template (free-form, in-window) messages are free. "Utility templates delivered within an open customer service window are free."
- Free entry point (Click-to-WhatsApp ads / FB Page CTA): "All messages are free for 72 hours, including template messages, if sent within an open free entry point window."
- 2026 changes: rate changes on July 1, 2026 (for example marketing rates in Italy, Spain and the UK); BRL billing; "Meta is sharing pricing updates launching October 1, 2026" (specific rates were due by Sep 1, 2026; not reviewed here, [UNVERIFIED] amounts).
- **What this means for us.** A pure inbound support bot, replying in-window, costs nothing in Meta fees. Only proactive or out-of-window templates cost money.

### Tech Provider / Solution Partner and Embedded Signup
- Definitions [V-sum]: **Solution Partners** are "Meta Business Partners that provide a full range of WhatsApp Business Platform services" and can extend credit lines and invoice clients. **Tech Providers** offer "a full range of WhatsApp Business Platform services to other businesses" alone or with a Solution Partner, with no credit lines. **Tech Partners** are "Tech Providers who are, or are eligible to become, Meta Business Partners."
- Requirements to become a Tech Provider [V]: "To become a tech provider you need to verify your business with Meta." Then App Review, with screencasts of sending a message and creating a template, and Advanced Access to `whatsapp_business_messaging` ("required to send messages on behalf of your clients") and `whatsapp_business_management` ("required to access your clients' WABAs").
- Billing [V-sum]: for Tech Providers, clients "must add a credit card to [their] WhatsApp Business Platform Account". Meta bills the client directly, and we bill only our SaaS fee.
- Embedded Signup [V]: "a scalable, authentication and authorization interface" that "automatically generates required WhatsApp assets" and authorises our app.
- Client verification [V-sum]: clients "must verify their business" for higher messaging limits, more phone numbers and Official Business Account status.
- **Access Verification and onboarding cap [UNVERIFIED]:** Twilio's FAQ (https://twilio.com/docs/whatsapp/tech-provider-program/faq) says tech providers can onboard "up to 200 new customers in a rolling 7-day window after completing business verification, App Review, and Access Verification". Meta's own page did not state this.
- **Blocker for us:** Business verification needs a legal entity with documents matching the business name and domain. The HeyBell entity (Atlas C-corp or Indian entity) must exist before WhatsApp can ship.

---

## 3. Anthropic (Claude API)

### Sources
- Usage Policy: https://www.anthropic.com/legal/aup. **The live page shows "Effective November 12, 2026"**, a new version posted ahead of its effective date. The "Previous Version" (https://www.anthropic.com/legal/archive/22742366-2ef0-4c7a-a833-6523f10d3944) is "Effective September 15, 2025", so that version presumably governs until Nov 12, 2026 [V].
- Commercial Terms of Service: https://www.anthropic.com/legal/commercial-terms ("Effective June 17, 2025") [V]
- Supported regions: https://www.anthropic.com/supported-countries [V]
- DPA: https://www.anthropic.com/legal/data-processing-addendum ("Effective February 24, 2025") [V]
- Subprocessors: https://www.anthropic.com/subprocessors, which redirects to https://trust.anthropic.com/subprocessors (JS-rendered; contents not readable by our tool) [partially UNVERIFIED]
- Commercial retention: https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data [V]
- API retention / ZDR: https://platform.claude.com/docs/en/manage-claude/api-and-data-retention [V]

### Building products for end users is allowed [V]
- Commercial Terms A.1: Customer may use the Services to power products it offers to "its own customers and end users." So Threadline building agents for SMBs, which serve consumers, is expressly contemplated.
- "Customer and its Users may only use the Services in compliance with these Terms." "Customer is responsible for all activity under its account."
- **Customer "must notify its Users" that Outputs may be inaccurate and should be independently checked** (D-section) [V-sum]. This is a direct flow-down: show an "AI answers may be inaccurate" notice, and our customer terms should oblige SMBs to do the same or allow us to.
- New AUP (Nov 2026): reselling or proxying Claude access "through unauthorized means" is prohibited. A value-added product is not reselling raw access, but do not expose a raw Claude passthrough or API [V-sum].
- New AUP: "Users are responsible for ensuring that agents they build or deploy" comply with the Usage Policy, including actions through tools [V].

### AI disclosure requirement (consumer-facing chatbots), required for us
- Sep 15, 2025 AUP (current until Nov 12): consumer-facing chatbots "must **disclose** to users that they are interacting with AI rather than a human. This disclosure must be provided at a minimum at the beginning of each chat session." [V]
- Nov 12, 2026 AUP: "All consumer-facing chatbots or AI agents that communicate directly with external users must disclose to users that they are interacting with AI rather than a human. This disclosure must be provided at a minimum at the beginning of each chat session" (the summary also mentions "or in the product interface") [V/V-sum].
- **What this means for us.** Every iMessage, Telegram and WhatsApp conversation must open with an AI disclosure, for example "Hi, I'm [Business]'s AI assistant". This must be a non-removable product feature, and our AUP must forbid customers from instructing the agent to claim to be human. "Each chat session" is ambiguous for persistent messaging threads. Conservative approach: disclose on the first message, and again after a long inactivity gap (for example 24h or more), and answer truthfully if asked.

### High-risk use cases
- Sep 2025 version: covers Legal, Healthcare, Insurance, Finance, Employment and housing, Academic testing/accreditation/admissions, Media/journalism. When these are consumer-facing, "a qualified professional in that field must review the content or decision prior to dissemination or finalization" and "you must disclose to them that you are using AI to help produce your advice, decisions, or recommendations ... at the beginning of each session." [V]
- Nov 2026 version: "High-risk AI Recommendations" in Legal, Medical, Finance, Credit, Insurance, Housing, Employment, Education and credentials, Healthcare access, Public benefits and services, Legal status and adjudication. "A qualified person must meaningfully review a High-risk AI Recommendation" before delivery or use, with authority to change it. The affected individual "must be clearly told that AI was used to produce it." [V]
- **What this means for us.** HeyBell cannot offer real-time human review, so our AUP must prohibit agents from giving individualised legal, medical, financial, credit, insurance, housing or employment advice or decisions. General business FAQs are fine (for example a clinic's hours or a law firm's intake process). The system prompt should deflect advice to humans for these verticals. Flag clinics, law firms, lenders, realtors and insurers at onboarding.
- Minors: the new AUP says "Products serving minors" must follow additional guidelines [V-sum]. Our terms should bar deployment aimed at under-18s unless reviewed.

### Training and retention
- **No training on API data:** Commercial Terms §B: "Anthropic may not train models on Customer Content from Services." Customer Content covers inputs and outputs [V]. Docs: "Retained data is never used for model training without your express permission." [V]
- Default retention: "we automatically delete inputs and outputs on our backend within 30 days of receipt or generation". Exceptions: Usage-Policy-flagged content kept "up to 2 years", classifier scores up to 7 years, feedback 5 years [V, privacy.claude.com]. Note that a third-party blog claims API retention was cut to 7 days from Sep 14, 2025. That conflicts with the official article, which still says 30 days [UNVERIFIED].
- ZDR: available to approved API customers via sales. Anthropic "does not store their inputs or outputs except where needed to comply with law or combat misuse", but still retains safety classifier results. Batch API (29-day retention), Files API and code execution are not ZDR-eligible [V].
- DPA: "is incorporated into and forms part of the Anthropic Commercial Terms of Service" [V]. Commercial Terms §C: "Data submitted through the Services will be processed in accordance with the Anthropic Data Processing Addendum" [V]. So **the DPA applies automatically on accepting the Commercial Terms**, with no separate signature needed. SCCs Module Two/Three, UK IDTA Addendum and Swiss Addendum are included. Subprocessor changes come with "reasonable notice" and a 15-day objection window. Deletion within 30 days after termination [V-sum].
- Subprocessors (partial, from a search snippet of anthropic.com/subprocessors): Google Cloud Platform (US, infrastructure), Cloudflare (worldwide), Stripe / Metronome / Anrok (billing). Whether AWS is listed is [UNVERIFIED]. Re-check the trust center manually.

### Supported regions [V]
India and the United States are both supported. Entities "majority-owned or controlled, directly or indirectly, by persons or entities in unsupported regions" are unsupported. End users in unsupported regions (for example people messaging a US business from an unsupported country) are a grey area. The Commercial Terms reference the Supported Regions Policy plus export law (§M.8) [V-sum].

### Obligations Threadline must flow down to customers (from the Anthropic terms)
1. Comply with Anthropic's Usage Policy (incorporate it by reference in our AUP).
2. AI disclosure at the start of each chat session. Never instruct the agent to pose as human.
3. Notify end users that outputs may be inaccurate and should be verified.
4. No high-risk individualised advice or decisions without qualified human review and AI disclosure. In practice: prohibit it.
5. No use in, or by entities controlled from, unsupported regions. Follow export controls.
6. No products directed at minors without additional safeguards.
7. Customer is responsible for its inputs (website content, knowledge base) not infringing third-party rights. This mirrors Anthropic's customer indemnity for Inputs (§K).
8. No reselling or raw access to Claude.

---

## 4. Infrastructure vendors

| Vendor | DPA | Auto-incorporated? | Subprocessors | Data location |
|---|---|---|---|---|
| **Cloudflare** | https://www.cloudflare.com/cloudflare-customer-dpa/ (Version 6.4, eff. Apr 3, 2026) [V] | **Yes.** Self-Serve Subscription Agreement §6.1 refers to the DPA, "which is hereby incorporated by reference into this Agreement" (https://www.cloudflare.com/terms/, last updated Sep 12, 2025) [V] | https://www.cloudflare.com/gdpr/subprocessors/ (30 days' notice of new ones) [V] | Global edge. DPA: Cloudflare "may process outside of the European Economic Area," CH and UK [V]. Regional restriction needs the Data Localization Suite (Enterprise) [UNVERIFIED for our plan]. SCCs Module 2/3 plus UK/Swiss [V]. |
| **Supabase** | https://supabase.com/legal/dpa [V] | **Yes.** "supplements and forms part of the Supabase Terms of Service"; "acceptance of the Agreement shall have the same effect as signing the SCCs" [V]. (A signable copy is reportedly also available in the dashboard: [UNVERIFIED].) | https://supabase.com/legal/customer-resources/subprocessor-list (PDF, updated June 1, 2026; 30 days' notice) [V] | Customer-selected project region (AWS). "Where Customer directs Supabase to Process Covered Data in a specific geographical region," it is stored there, with exceptions [V]. Check which region our project is in. SCCs under Irish law [V]. |
| **Stripe** | https://stripe.com/legal/dpa (last updated Sep 28, 2026) [V] | **Yes.** SSA §4.1: "Each party will comply with the DPA, including the Data Transfers Addendum, which is incorporated into this Agreement by this reference." (https://stripe.com/legal/ssa, last modified Sep 28, 2026) [V] | https://stripe.com/legal/service-providers [V-sum] | Transfers to "Stripe, LLC in the United States" and affiliates or subprocessors elsewhere [V]. Stripe acts as **both processor and independent controller** (fraud, KYC/AML) [V]. Disclose Stripe as an independent controller in our privacy policy. |
| **Resend** | https://resend.com/legal/dpa (updated 2025-12-31) [V] | **Yes.** It "becomes legally binding upon Customer's acceptance of the Agreement or execution of this DPA" [V] | https://resend.com/legal/subprocessors (14 days' notice) [V] | Primary processing in the "United States" [V]. EU, SA and JP sending regions exist per Resend docs [UNVERIFIED]. SCCs Modules 1-3 plus UK/Swiss [V]. |
| **Google (Sign in with Google)** | No processor DPA applies to consumer OAuth sign-in. The Cloud DPA (https://cloud.google.com/terms/data-processing-addendum) covers the Appendix 4 Cloud/Workspace services. Sign in with Google / OAuth is not named [V-sum]. Google acts as an **independent controller** of the user's Google account data [UNVERIFIED legal characterisation, standard view]. | N/A. Governed by the Google APIs Terms of Service and the API Services User Data Policy | Cloud subprocessors: https://cloud.google.com/terms/subprocessors [UNVERIFIED URL] | Google global. Obligations from the User Data Policy (https://developers.google.com/terms/api-services-user-data-policy, last updated Feb 15, 2024): "You must publish a privacy policy that fully documents how your application interacts with user data" and "list the privacy policy URL in your OAuth client configuration" [V]. "Only request access to the permissions necessary" [V]. Basic scopes (openid/email/profile) do not need a security assessment, but brand verification of the OAuth consent screen (app name, logo, domain) is needed for a public app [UNVERIFIED]. |

### Stripe: restricted businesses
https://stripe.com/legal/restricted-businesses (last updated 2026-09-22) [V]. Nothing on the list prohibits B2B AI or chatbot SaaS subscriptions. Chatbots, bulk messaging and SMS are not mentioned [V-sum]. Items to stay clear of:
- "Telemarketing"
- "Negative option marketing ... reduced price trials with unclear or hidden pricing". Our free-to-paid and overage display must be clear.
- "use high-pressure upselling"
- "Sales of online traffic or engagement"
- AI-generated adult content. Our AUP already bans adult use.

### Stripe in India / Stripe Atlas
- **India is invite-only** [V] (https://support.stripe.com/questions/stripe-accounts-are-invite-only-in-india; the page is undated): "Stripe services are invite-only in India." "Businesses from India are not able to sign up for a new Stripe account through our website." "Currently active Stripe accounts in India will continue to be supported." "For Platforms using Stripe in India, we support the addition of new connected accounts by invite only." Press (TechCrunch / The Paypers, May 2024) attributed this to India's evolving regulation and cited a goal to expand by H2 2025. I found no evidence of reopening as of Oct 2026 [UNVERIFIED that it has not reopened]. Indian accounts taking international payments may need an IEC code and RBI purpose codes (https://docs.stripe.com/india-exports) [V-sum].
- **Stripe Atlas** [V] (https://stripe.com/atlas): "US$500" one-time (includes government fees and the first year of registered agent), "US$100" annually after; "Company incorporation in Delaware", "Company tax ID", "Founder equity issuance", "83(b) election filing", "$2,500 in Stripe product credits". "Startups in over 175 countries have chosen Atlas". There is an Indian founders' guide, and no explicit eligibility bar for Indian founders on the page [V-sum]. A US entity from Atlas gets a standard US Stripe account. That avoids the India invite-only limit and also gives a legal entity for Meta business verification. For Indian resident founders, holding a foreign entity triggers FEMA/ODI (overseas direct investment) reporting [UNVERIFIED; needs an Indian CA].

---

## Open items / to verify manually
1. Anthropic subprocessor list contents (trust.anthropic.com is JS-rendered).
2. Whether Anthropic's API default retention is 30 days (official article) or 7 days (blog claim).
3. Meta's Access Verification step and the 200-per-7-day onboarding cap (from Twilio, not Meta).
4. Meta Oct 1, 2026 rate changes (amounts).
5. Telegram: whether "encrypted at rest and stored separately from its encryption key" is met by Supabase disk encryption. We may need app-level encryption of transcripts and tokens.
6. Google OAuth brand verification needs for basic scopes.
7. Resend region availability. Cloudflare data localization on our plan.
