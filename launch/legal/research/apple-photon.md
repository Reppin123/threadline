# Apple and Photon: Policy and Account-Ban Research for Threadline / HeyBell

Researched 2026-10-10 from live pages, plus Photon docs mirrored in `research/photon/`. This is not legal advice.

**Legend**
- **[V]**: verified on the official page on 2026-10-10 and quoted verbatim.
- **[V-sum]**: confirmed on the official page, but paraphrased.
- **[2nd]**: from secondary or vendor-competitor sources.
- **[UNVERIFIED]**: from memory, or the page could not be read. Confirm before relying on it.

---

## 0. Bottom line (read this first)

1. **Photon's own ToS is the biggest problem, more than Apple.** Photon ToS §3.4(b) and §3.4(c) forbid using the Services "on behalf of, or to provide any product or service to, third parties" and forbid sublicensing to third parties. Threadline is a multi-tenant SaaS, and each Shopify merchant is a third party, so on its face the business model breaches Photon's standard terms. **We need a written Order or reseller/platform addendum from Photon before launch.** (§3 below.)
2. **On Free and Pro, the shared pool cannot "text first" to arbitrary shoppers.**
   - A shared line "will only message recipients you've registered as **users** of your project".
   - Free allows 10 users and Pro allows 100. The pricing table shows "Cold Outreach: 50 per lines/day" only on Business and Enterprise.
   - Shared-pool users are given "a fresh [number] they have never received a message from before", so every bot-first message comes from an unknown number. That message lands in Unknown Senders (if the user has screening on) and always shows a "Report Spam" link.
3. **Apple has no sanctioned way to automate iMessage from Apple Accounts.**
   - The iCloud Terms forbid "accessing the Service through any automated means" and "unsolicited or unauthorized ... messages". They also say the service is "designed and intended for personal use".
   - The macOS license forbids using "the Apple Software and Services in any manner to spam". It also forbids using virtualized macOS in a "relay service".
   - Apple can "terminate or suspend" accounts "without prior notice".
   - Apple publishes no rate limits and no appeals process. Enforcement is behavioural and silent: the line is flagged or deactivated.
4. **The only sanctioned Apple channel is Apple Messages for Business (AMB).** It needs an Apple-approved MSP (Zendesk, Salesforce, LivePerson, etc.). The customer must initiate. Bot-only service is banned ("A business must not provide a limited or bot-only solution"). Marketing requires an explicit "subscribe". AMB is not usable as Threadline's core rail today.
5. **Ban risk, overall:**
   - **High** for a shared-pool, bot-texts-first design.
   - **Moderate-low** for an inbound-first design: the shopper texts first via a link or QR code, the bot replies within an active conversation, there are three or more user replies, a contact card is shared, there are no links in the first message, and STOP is honoured.
   - The ban consequence lands on the Photon line. For shared lines, that may affect other Photon tenants too, which is why Photon restricts shared-pool targets.

---

## 1. Apple Messages for Business (official channel)

**Sources**
- Policies, version 3.1, "Last updated: July 21, 2026": https://register.apple.com/resources/messages/messaging-documentation/policies [V]
- MSP onboarding, v3.0.3: https://register.apple.com/resources/messages/msp-onboarding/
- Privacy: https://www.apple.com/legal/privacy/data/en/messages-for-business/

### How you get on it
- **You must go through an approved Messaging Service Provider (MSP).** Businesses cannot connect directly to Apple. Apple's MSP onboarding says an organization must "first create an account for your organization through Apple Business Register" [2nd: getkanal.com, bird.com; Apple MSP page title seen].
  - Registration needs a corporate Apple Account (personal accounts are not accepted), a chosen MSP, and technical contacts [2nd].
  - Approved MSPs as of 2026-10-07 include Zendesk, Salesforce, Freshworks, Genesys, LivePerson, Infobip, Sprinklr, Microsoft Dynamics, AWS, LiveChat, Khoros, NICE, and Webex [2nd]. Threadline is not an MSP. Becoming one is a separate Apple program and approval [UNVERIFIED how long that takes].
- **There is an Experience Review before go-live.** "most accounts need one to three rounds of review" [2nd: https://getkanal.com/blog/apple-messages-for-business].
- **Entry points:** Maps, Safari, Spotlight, Siri, a website button, an app, QR codes, a registered phone number, and Wallet [2nd].
- **Apple Business Connect:** this is Apple's place-card/Maps listing product. It is distinct from Apple Business Register, which is the AMB registration portal. I found no 2026 source showing AMB registration merged into Business Connect [UNVERIFIED].
- **iOS 26 asset change:** "iOS 26 and macOS 26 removed wide logo support" [2nd].

### Key policy text [V], from the Policies page
- **No bot-only service.** "The business must provide access to a live agent in this channel during its regular business hours. A business must not provide a limited or bot-only solution."
- **Customer initiates.** "Your business is prohibited from sending unsolicited messages. Your business may only send a message in response to an active conversation unless you comply with the restrictions below."
- **Transactional notifications** require this disclosure: "We will send important notifications related to your account status or transactions. Send 'Unsubscribe' to manage your message preferences."
- **Marketing.** "At no time may your business send marketing information, promotional offers, or information related to products or services that the customer has not purchased unless the customer has expressly sent "subscribe" and provided their permission."
- **Deleted conversations.** "Businesses and MSPs must not send messages to customers when they expressly delete a conversation ... should not send any further messages to the customer unless the customer initiates conversation again with the business."
- **Trigger words.**
  - "To reach a live agent, the primary term is "agent". Alternatives are "support" or "help"."
  - "To manage message preferences, the primary term is "unsubscribe". Alternatives are "spam", "stop", or "end"."
- **PII.** "Businesses must not request PII from the user until the point in the conversation where it is necessary". It must be preceded by a Yes/No Quick Reply.
- **Disclosures.** Privacy and terms should be sent as a rich link on first engagement, not shown inline. "Statements such as "data rates may apply" ... are not appropriate for Apple Messages for Business."
- **Prohibited categories** include tobacco, vaping, firearms, gambling, illegal drugs, pornography, political organizations, "Allows an end-user to purchase currency or establish a pre-paid account", and "Constitutes a staged digital wallet".
- "Apple reserves the right at any time to disable Apple Messages for Business for any reason it deems prudent."
- "At this time, Apple is not onboarding businesses that primarily offer medical or health-related services or products."
- **Bot disclosure:** automated agents must disclose that they are automated and send a welcome message within 5 s [2nd: getkanal; not on the Policies page itself].
- **Commerce:** Apple Pay, List Picker, Time Picker, Forms, Authentication, and Quick Replies are available through the MSP [2nd].

### How AMB differs from "unofficial" iMessage automation (Photon, Sendblue, Linq, LoopMessage, BlueBubbles)

| | AMB | Unofficial (Apple Account + Mac or phone number) |
|---|---|---|
| Apple sanction | Contracted, reviewed, branded business identity (logo, verified name) | None. Runs on consumer Apple Accounts whose terms say "personal use" |
| Who starts the conversation | Customer only (plus opted-in notifications and marketing) | Either side technically; vendors cap new contacts at about 50/line/day |
| Identity | Business chat ID, not a phone number | An ordinary phone number or email; looks like a person |
| Automation | Allowed, but live agent required | Against iCloud Terms §V.B(10); tolerated only in the sense that Apple has not acted publicly against these vendors |
| Spam controls | Apple policy; Apple can disable | Apple's behavioural filters, "Report Spam", silent line deactivation, no appeal |
| Requirements | MSP, Business Register, review | Vendor account only |

---

## 2. Apple terms that apply to automated iMessage on real Apple Accounts and Macs

### 2.1 iCloud Terms and Conditions
Source: https://www.apple.com/legal/internet-services/icloud/, "Last revised: September 14, 2026" [V-sum; quotes are verbatim fragments]. iMessage in iCloud and Apple Account services sit under these terms. The macOS license points iCloud features to them.
- **§IV.A (Your Account):** "the Service is designed and intended for personal use on an individual basis". Account credentials are not to be shared.
- **§IV.E (No Resale of Service):** you may not "reproduce, copy, duplicate, sell, resell, rent or trade the Service".
- **§V.B(7) (Your Conduct):** you may not "post, send, transmit or otherwise make available" any "unsolicited or unauthorized email, messages, advertising, promotional materials, junk mail, spam, or chain letters".
- **§V.B(10):** no interfering with the Service, including "accessing the Service through any automated means, like scripts or web crawlers".
- **§VII.B (Termination by Apple):** "Apple may at any time, under certain circumstances and without prior notice, immediately terminate or suspend" your Account or access.
- The account is now called "Account", "previously referred to as 'Apple ID.'"

**Assessment.** Every unofficial iMessage gateway operates in tension with §IV.A, §IV.E and §V.B(10). Apple has not sued any of these vendors publicly. Its demonstrated remedy is technical: blocking registrations and deactivating accounts or lines. Threadline is not the Apple Account holder (Photon is, for managed lines; see §3). However, Photon passes Platform Terms compliance and the ban consequences to us contractually.

### 2.2 macOS Tahoe 26 Software License Agreement
Source: https://www.apple.com/legal/sla/docs/macOSTahoe.pdf [V, verbatim from the PDF]
- **§2B(i):** personal use grant "for personal, non-commercial use". §2B(ii) covers a commercial enterprise "by a single individual on each of the Mac Computer(s) that you own or control, or (b) by multiple individuals on a single shared Mac Computer".
- **§2B(iii), virtualization:** "does not permit you to use the virtualized copies or instances of the Apple Software in connection with service bureau, time-sharing, terminal sharing, relay service or other similar types of services."
  - This is relevant to how Photon runs its infrastructure. It is unknown whether Photon uses VMs [UNVERIFIED].
- **§6H:** "You further agree not to use the Apple Software and Services in any manner to spam, defraud, harass, abuse, stalk, threaten, defame or otherwise infringe or violate the rights of any other party".
  - Also: "you represent that you own all rights in, or have authorization ... to transmit, such content and that such content does not violate any terms of service applicable to the Apple Software and Services."
- **Australian supplement**, the only place iMessage suspension is spelled out: "Apple reserves the right to prevent your use of FaceTime and iMessage if you send ... such content (including by suspending or terminating you from FaceTime and iMessage, imposing restrictions on your use of these services ...)" and "you are responsible for ensuring that all use of FaceTime and iMessage through your account or on your Device does not breach the terms of this License."

The Apple Media Services Terms (https://www.apple.com/legal/internet-services/itunes/) govern App Store and media content. They are referenced by the macOS license for "Usage Rules", but they are not the primary iMessage terms [V-sum, macOS license §2].

### 2.3 "Report Spam" / "Report Junk" and its effect on senders
Source: Apple iPhone User Guide, "Report spam and block senders in Messages on iPhone" (the iOS 27 version is now the default on the site), https://support.apple.com/guide/iphone/report-spam-and-block-senders-iph3f94d910d/ios [V]
- "A Report Spam link appears at the bottom of any message from any unknown sender."
- "You can't report a message after you've replied to it."
- "If you received the message with iMessage, it's sent to Apple with the sender's information, and the message is permanently deleted from your iPhone."
- "Reporting spam doesn't prevent the sender from sending messages."
- "Spam filtering is on by default."
- On blocking: "The person sending the message doesn't know that their messages are blocked."

**Effect on the sender account.** Apple does not publish what happens. Industry evidence is consistent that reports feed behavioural scoring and lead to the line being flagged:
- **Photon** [V, docs]: "Outbound-first integrations [surface the 'Report Junk' banner], and after a couple of unanswered messages it tends to get tapped."
- **Linq** [V-sum, https://help.linqapp.com/flagged-number]: a flagged number is "temporarily blocked from sending iMessages". Triggers include "Recipients marking messages as junk", "Starting too many conversations too quickly", "Robotic or repetitive wording", "Links, attachments, or sales-heavy first messages", and cold outreach. Once flagged, outbound iMessages fail, and the page says "Outbound SMS's also fail to send."
- **Lindy.ai**, a public case study [2nd, https://www.lindy.ai/blog/imessage-api-three-rewrites-one-apple-ban-and-what-actually-works]: self-hosted on a Mac (BlueBubbles), "The account was permanently banned" after launch-day volume of about 10k messages in 12 hours. Contributing factors were a new account, high volume, low recipient diversity, and a lopsided send-to-receive ratio. Apple has "no published rate limits ... no appeals process". They moved to Linq afterwards.

### 2.4 Known Apple enforcement against unofficial iMessage gateways
- **Beeper Mini (December 2023).** Apple blocked it within days of launch. Apple's statement to press [V-sum via 9to5Google, https://9to5google.com/2023/12/09/apple-beeper-mini-imessage/; AppleInsider, https://appleinsider.com/articles/23/12/10/apple-confirms-it-blocked-beeper-mini-citing-security-risks]:
  - "we took steps to protect our users by blocking techniques that exploit fake credentials in order to gain access to iMessage."
  - These techniques "posed significant risks to user security and privacy, including the potential for metadata exposure and enabling unwanted messages, spam, and phishing attacks."
  - Apple "will continue to make updates in the future to protect our users."
  - Beeper briefly restored service using real Apple Account logins, then was blocked again [V-sum, https://blog.beeper.com/p/beeper-mini-is-back].
  - Beeper ultimately stopped iMessage support in early 2024. Some users reported their Macs/Apple Accounts being blocked from iMessage [UNVERIFIED, from memory].
- **Sunbird / Nothing Chats (November 2023).** These were pulled by the vendors themselves after researchers found messages and Apple credentials handled unencrypted (Firebase/Sentry, plain HTTP). This was not an Apple action, but it is the reason Apple and the press treat third-party iMessage relays as a security risk [2nd, https://9to5google.com/2023/11/18/nothing-chats-sunbird-unencrypted-data-privacy-nightmare/].
- **Commercial API vendors (Sendblue, LoopMessage, Linq, Blooio, Photon, BlueBubbles).** As of 2026-10-10 I found no public Apple statement, lawsuit, or mass block targeting them [searched; none found]. Enforcement shows up as per-line flags and bans that vendors absorb, for example Blooio: "banned numbers are automatically swapped" [2nd, Linq blog].
  - **Platform risk:** Apple could change APNs/registration at any time, as it did with Beeper. There is no contractual protection.
- **Context:** the DOJ antitrust suit, *United States v. Apple* (2024), cites iMessage interoperability [UNVERIFIED as to current status]. That creates some political cost for Apple in cracking down on interop, but no legal protection for gateways.

### 2.5 How competitors describe compliance, bans, and limits

**Sendblue**
- ToS (https://sendblue.com/terms-of-service) [V-sum]:
  - "Customer agrees not to use the Services for bulk SMS marketing, spam, unsolicited messaging".
  - "Customers must secure explicit consent ("opt-in") from end users prior to initiating any engagements". Messaging non-consenting users is "a significant breach".
  - Liability is capped at fees paid in the prior 6 months.
- Limits (https://support.sendblue.com/articles/4256420350-daily-limits-rate-limits-capacity-sendblue) [V-sum]:
  - "Keep new contacts per line to about 50 or fewer per day".
  - "total daily conversations per line around 150 or fewer".
  - "average gap of about 8 minutes or more between new contacts on the same line".
  - Its 2025 article warned that frequently hitting the 50 limit means "your phone number may be at higher risk of being blocked by Apple".
  - Lower tiers "share phone numbers across customers" [2nd, Linq blog].

**Linq**
- AUP (https://linqapp.com/policies/acceptable-use-policy) [V-sum]:
  - no "unsolicited bulk messages ("spam")".
  - "You must obtain and maintain valid consent from recipients before sending any messages".
  - "opt-out requests must be honored promptly".
  - Linq may "suspend or terminate access ... without notice".
- Best practices (https://docs.linqapp.com/getting-started/best-practices/index.md) [V-sum]:
  - "1 inbound for every 2 outbound".
  - Don't "Exceed 7,000 messages/day per line".
  - Don't "Use iMessage for cold outreach".
  - Don't "Include links or media in your first message".
  - "Design for inbound-first messaging".
  - "immediately stop messaging any user who sends stop, unsubscribe, or expresses negative sentiment".
  - "aim to get at least three replies from a new user".
- Flagged-number guide: 50 new conversations/day/line, and 2 to 3 follow-ups maximum.

**LoopMessage**
- Website terms only (https://loopmessage.com/terms): liability "limited to a maximum of fifty U.S. dollars". API terms not retrieved.
- "cold messaging prohibited outright"; caps of 300 and 1,000 daily contacts by tier [2nd, Linq competitor blog; UNVERIFIED].

**Blooio**
- "outbound is capped at 20 to 50 new conversations per day per number"; "banned numbers are automatically swapped" [2nd].
- Blooio documents per-chat and per-number "safety limits" to protect numbers from patterns "Apple may treat as automated or unwanted" [2nd, https://docs.blooio.com/guides/messaging-safety].

**BlueBubbles / self-hosted**
- Runs on your own Mac and Apple Account. Full ToS exposure sits with you, and the Lindy ban shows the result.

**Industry consensus:** about 50 new contacts per line per day, inbound-first, opt-in only, no cold outreach, no links in the first message, 2 to 3 follow-ups maximum, STOP honoured, and a healthy inbound/outbound ratio.

---

## 3. Photon (Something Great Inc.): ToS, Privacy, Docs, Pricing

**Sources**
- ToS: https://photon.codes/terms-of-services [V]. No date shown. Entity: "Something Great Inc.", 1111B S Governors Ave STE 29373, Dover, DE 19904.
- Privacy: https://photon.codes/privacy-policy [V], "Last updated: September 25, 2026".
- Pricing: https://photon.codes/pricing [V, local copy `research/photon/pricing.txt`].
- Docs: `research/photon/docs-full.txt`, mirroring https://photon.codes/docs/... [V].

The ToS contains unfilled drafting brackets: "[AND ACCEPTABLE USE POLICY]", "[California]", "[San Francisco, California]", and "AUPPhoto's". The AUP is defined as the deliverability docs page: "available https://photon.codes/docs/best-practices/imessage-deliverability[at link]". The governing law is therefore literally bracketed and uncertain.

### 3.1 Show-stoppers for Threadline's model
- **§3.4 Restrictions** [V]: "Customer will not ... (b) provide access to, distribute, sell, lease, or sublicense any of the Services to a third party (other than Authorized Users); (c) use any of the Services on behalf of, or to provide any product or service to, third parties".
  - Threadline provides a bot service to merchants (third parties) using Photon lines. **That is a facial breach.**
  - §15(n) also indemnifies Photon for "any unauthorized resale, subletting, or redistribution of the Services".
  - **Action:** get Photon's written consent in an executed Order. "an executed Order controls over an online Order" (§3.1), and "Customer may not modify this Agreement unless such modification is expressly agreed to by Photon in writing" (§20.6).
- **§3.8(g)** [V]: no "creat[ing] multiple accounts or otherwise act[ing] to evade the Services' limits, quotas, filters, or other restrictions".
  - One Photon project per merchant to multiply the 10/100-user caps likely breaches this unless Photon agrees.
- **§3.4(l)** [V]: no attempt to "evade or circumvent any safeguard, filter, compliance check, sender-ID vetting, throughput restriction, or rate limit, or attempt to route around any carrier or platform block".
  - Rotating lines to dodge Apple flags is risky under this clause.

### 3.2 Messaging compliance (all on the customer)
- **Header notice** [V]: "Customer is solely responsible for the content of those communications and for compliance with applicable messaging, telemarketing, privacy, and AI-disclosure Laws, including the Telephone Consumer Protection Act (TCPA) and CAN-SPAM".
- **§3.6** [V]:
  - "Customer must obtain and maintain all consents, permissions, and opt-ins required by Laws and Carrier Requirements for each End User before communications are transmitted, and must be able to demonstrate consent and provide opt-in records on request."
  - "Customer will not use the Services to send spam, unsolicited messaging, bulk SMS marketing, or other high-volume or abusive outreach".
  - "[Customer] will not use the Services to deceive or mislead End Users as to the automated nature or source of communications."
  - Customer must make "any required indication that an End User is interacting with an artificial-intelligence or automated agent".
- **"Laws" includes Carrier Requirements; Platform Terms means the Third-Party Providers' terms.** Third-Party Providers are defined to include "operating systems", meaning Apple. Customer warrants "that Customer's use of the Services complies with the applicable Platform Terms" (§3.5). So Photon contractually puts Apple-terms compliance on us, even though Apple's terms forbid automation.
- **§3.7:** Photon may audit, and Customer must produce compliance documentation.
- **§3.8(b):** no automated "critical advice in legal, health, or financial matters without supervision".

### 3.3 Who holds the Apple accounts / numbers
- **Pricing** [V]:
  - "Managed Shared (Free / Pro): Photon maintains a large pool of numbers and assigns each of your users a fresh one they have never received a message from before."
  - "Dedicated Number (Business): Numbers allocated just for your project ... Nothing is shared with other tenants".
  - Enterprise: "Dedicated iMessage lines - you own the numbers".
  - Open source: "uses your iCloud account".
- **ToS §3.5** [V]: "as between the parties, Customer owns and is responsible for each of its Messaging Accounts and all activity conducted through such Messaging Accounts ... Photon does not control and is not responsible for any Third-Party Platform's Provider's decision to suspend, restrict, rate-limit, deregister, or terminate any Messaging Account".
  - **Ambiguity:** for managed lines, Photon operates the Apple identity, but the ToS assigns responsibility for "activity" to us. Ask Photon to clarify. Below Enterprise, we do not own the numbers and cannot port them.
- **Dormancy** [V, docs]: "Apple deactivates lines with no traffic for ~2 months."

### 3.4 Limits (quoted)
- **Pricing, Free** [V]: "Unlimited daily messages with Auto Scale • RCS and SMS fallback • Full direct messaging iMessage API access ... • Up to 10 users".
- **Pricing, Pro ($25/mo)** [V]: "... • Up to 100 users".
- **Pricing, Business ($250/line/mo)** [V]: "Dedicated iMessage lines • Unlimited daily messages ... • Cold outreach supported - up to 50 new contacts per day • Full group messaging iMessage API access ... • Unlimited users* * Auto Scale Required for unlimited users".
- **Pricing, comparison row** [V]: "Cold Outreach 50 per lines/day" appears only in the Business/Enterprise columns. Column alignment was inferred from the text scrape [V-sum].
- **Docs, shared-pool allowlist** [V]: "a shared line will only message recipients you've registered as **users** of your project. Any other target is rejected with `Target not allowed for this project`. This limit applies to shared-pool plans only."
  - Threadline's gateway already handles this error: `apps/gateway/src/outbound.ts:106`.
- **Docs, quotas** [V]:
  - "**5,000 messages per server per day.** ... Additional sends are rejected until the window resets."
  - "**50 new conversations initiated per line per day.** A "new conversation" is the first message your line sends to a recipient it has never messaged before. Replies within existing conversations don't count."
  - "5,000 outbound messages per server per day is a hard limit. If you go past it, Apple has a significantly higher risk of banning the line."
  - Recommended users per line: "Moderate conversational usage 400-500"; "Intensive usage 200-400".
- **Docs, API** [V]: "The default maximum rate limit is **5 requests per second per project**." Rate-limit error codes include `dailyLimitExceeded`, `recipientLimitExceeded`, `contentDuplicateExceeded`, `recipientCoolingDown`, `recipientLocked`, and `sendReceiveRatioExceeded`. The last implies Photon enforces a send/receive ratio; its threshold is undocumented [UNVERIFIED].
- **Shared pool:** no group creation ("passing multiple users to `space.create()` throws an `UnsupportedError`").

### 3.5 Photon's own deliverability rules (the AUP by reference)
Source: https://photon.codes/docs/best-practices/imessage-deliverability [V]. The ToS defines the AUP as this page, so these rules are arguably contractual.
- "Apple can't read message content: they filter on behavior. Patterns that look automated, cold, or burst-y will get a line flagged regardless of what the messages actually say."
- "no provider can remove Apple or carrier limits. You remain responsible for maintaining line health."
- "Inbound-first integrations never surface the "Report Junk" banner that Apple shows on every message from an unknown number."
- "After the user sends at least three messages, Apple marks the conversation as trusted." Apple's own wording is that filtering "doesn't apply to any sender you've replied to three times or more"; see §4.
- **Flag causes:**
  1. "Burst sending: 100+ messages from one line in a tight window"
  2. "No conversation"
  3. "Hammering non-responders: more than 2–3 follow-ups"
  4. "Cold outreach: texting people who never opted in"
  5. "Off-hours sending: 3am messages signal automation"
- **Don't:** "Include links or media in the first message. Apple suppresses link-clicking until a reply lands."
- **Don't:** "Use iMessage for cold outreach. Cold belongs on A2P channels (Twilio etc.). iMessage is for warm conversations."
- **Do:** "Share a contact card after the first exchange. Once saved, the "Report Junk" surface is gone."
- **Fallback:** "When a message falls back from iMessage to SMS or RCS, the carrier monitors that traffic and applies its own filtering". SMS fallback brings in A2P 10DLC and TCPA exposure; see `us-messaging-ai.md`.
- **Recovery:** "If Apple flags a line, Photon escalates it into the recovery process." There is no SLA on recovery.

**Conflict with pricing:** the Business tier advertises "Cold outreach supported", while the docs and AUP say not to use iMessage for cold outreach and ToS §3.6 bans "unsolicited messaging". Treat "cold outreach" as meaning business-initiated messages to opted-in contacts, never truly cold contacts.

### 3.6 Liability, suspension, indemnity
- **§14** [V]: no liability for lost profits etc. Cap: "amounts paid or payable by Customer to Photon ... during the 12 months prior". **§18 Trials and Betas:** liability "will not exceed US$50", and there is "no warranty, indemnity, or support".
- **§7** [V]: Photon may immediately suspend if "Customer's messaging or use creates carrier, legal, or regulatory risk ... causes or is likely to cause abuse, fraud, security risk, or material complaint rates, or if a Third-Party Provider requires suspension". Also "may suspend or terminate immediately and without prior notice where ... Third-Party Provider ... requires".
- **§12.2:** Photon "may suspend or terminate Customer's access to the Services at any time and for any reason".
- **§9** [V]: "Photon does not guarantee message delivery ... and has no liability for any communication that is delayed, blocked, filtered, misrouted, classified as spam".
- **§11:** "AS IS"; no warranty that "Customer's use of the Services will comply with any Laws or Carrier Requirements".
- **§15:** uncapped customer indemnity. It covers Customer's use, Message Content, breach of Platform Terms, End User claims "relating to unwanted messaging, privacy, consent, opt-out failures, misrepresentation, harassment, AI disclosure", carrier penalties, and regulatory actions.
- **§10.2:** "All Fees are non-refundable." Monthly auto-renewal.
- **§21:** AAA arbitration, class waiver, 30-day opt-out by letter to the Dover, DE address.

### 3.7 Data handling, processor role, hosting
- **No DPA is published, and the ToS has no controller/processor language.** The Privacy Policy covers Photon's account holders ("Account Information ... Usage Data ... Log Data. API call logs"). It does not address our End Users' message content.
  - ToS §5.1 licenses Customer Data (defined to include "Message Content" and "End User contact information") "only as necessary to: (a) provide Services; (b) derive or generate Usage Data; (c) create and compile Aggregated Data".
  - **§5.2:** Photon may use Usage Data and Aggregated Data to "develop, train, fine-tune, evaluate, and improve Photon's machine-learning models". Usage Data excludes "identifiable Customer Data", but Aggregated (de-identified) Customer Data is in scope.
  - **Action:** request a DPA naming Photon as processor/service provider (CCPA "service provider", GDPR Art. 28), with an AI-training opt-out.
- **§5.3** [V]: communications "may not be encrypted end-to-end at every stage, may be accessible to the applicable Third-Party Provider". In practice Photon's Macs/servers see plaintext.
- **Hosting:** marketing says "Photon's edge network with 99.9% uptime" and "Photon is SOC 2 Type II Compliant" [V, homepage]. The privacy policy says data "may be transferred to and processed in countries other than your country of residence, including the United States", with SCCs [V]. Server/region location is not disclosed [UNVERIFIED].
- **Retention:** deletion "within 30 days" of account deletion (Privacy). Under ToS §12.3, there is a 30-day export window after termination, then deletion "at any time", with backups retained under confidentiality.
- **Prohibited Data (§3.4):** no GDPR Art. 9 data, HIPAA PHI, PCI card data, or government IDs. "Photon is not a Business Associate", which contradicts the homepage claim of "HIPAA-compliant support for healthcare teams".
  - **For us:** the bot must never solicit card numbers in chat.
- **Subcontractors (§20.9):** permitted. No list is published.

---

## 4. iOS 26 "Screen Unknown Senders" and first-message filtering

Sources:
- https://support.apple.com/en-us/125068 ("Published Date: April 08, 2026") [V]
- https://support.apple.com/guide/iphone/screen-and-filter-texts-iph203ab0be4/ios [V]

iOS 27 is now the default version of Apple's guide. I did not find iOS 27 changes to these rules [UNVERIFIED].

- **Default state:** "Screen Unknown Senders is off by default in iOS 26. If you had the Filter Unknown Senders setting turned on in iOS 18, Screen Unknown Senders is on when you upgrade to iOS 26." Per Twilio [2nd], it is on by default in Brazil, India, and China.
- **Who counts as unknown:** "An unknown sender can be anyone you haven't previously interacted with in Messages or someone who isn't in your contacts."
- **What happens:**
  - "When you receive a message from an unknown sender, a badge notes that you have new messages in the Unknown Senders filter."
  - "Their messages are filtered into another folder, and you don't get notified about them unless you want to be."
- **Notifications:**
  - "Notifications are on by default for Time Sensitive messages, like verification codes, alerts, or urgent requests." Users can allow "Time Sensitive, Personal, Transactions, or Promotions".
  - "If you allow notifications ... those messages will show notifications and appear in your conversation list for eight hours. After that, those messages appear in the Unknown Senders area."
  - "In the United States, Brazil, and India, you can adjust your Messages settings to choose which messages from unknown senders send notifications."
- **Escape hatches:**
  - "Message filtering doesn't apply to any sender you've replied to three times or more."
  - "If you respond to a message from an unknown sender, that does not automatically mark the sender as known".
  - "Until you mark a sender as known or add them as a contact, any future messages are filtered to Unknown Senders."
  - Marking as known or adding to Contacts "lets you open links and view any blurred images they've sent". So links and images from unknown senders are disabled or blurred.
- **Report Spam:** the link appears on every unknown-sender message (§2.3).

**Implications for Threadline:**
- A bot-first message from a Photon shared-pool number is, by design, from a number the shopper has never seen.
- If the shopper has screening on, the message goes to the Unknown Senders folder, probably silently. It is classified as Time Sensitive/Personal only if Apple's on-device classifier decides so; classifier criteria are unpublished.
- Links in that first message are inert.
- If the shopper texts first (inbound-first), the business is no longer an unknown sender for that thread. After three replies by the user, filtering stops applying. This matches Photon's "three messages" guidance.
- A dedicated number (Business) lets the merchant publish one number on site, receipts, and QR codes. Shoppers can then save it as a contact, which makes the bot a known sender permanently.

---

## 5. Account-ban risk assessment for Threadline

### 5.1 Threadline's flows
1. **Inbound support.** A shopper texts the merchant's bot (Photon line or Telegram) and the bot replies.
2. **Bot texts first.** `POST /api/v1/bots/:id/messages` leads to `composeOutbound`, then the gateway outbound worker, then `space.create(user)` and a send (order-ready, reminders, check-ins). Code paths: `apps/web/app/api/v1/bots/[id]/messages/route.ts`, `packages/core/src/runtime.ts:211`, `apps/gateway/src/outbound.ts`.
3. **Plans.** Free/Pro run on the shared pool. A dedicated line is sold as a $250/line/mo add-on, passing through Photon Business.

### 5.2 Risk matrix

| Scenario | Apple ban risk | Photon contract risk | Notes |
|---|---|---|---|
| Inbound-first support on shared pool | Low–Moderate | **High (§3.4(c) third-party use; 10/100 user caps)** | Users must be pre-registered as Photon project "users". This doesn't scale past 10 or 100 shoppers total per project. |
| Bot-first transactional message to a shopper who opted in at checkout, shared pool | **High** | High | Unknown number → Report Spam link, likely Unknown Senders folder. Photon pricing implies cold/new outreach isn't a Free/Pro feature. |
| Bot-first to a shopper who previously texted that same line (existing thread) | Low | Medium | Doesn't count as a "new conversation". Keep it reciprocal and avoid 3am sends. |
| Bot-first, dedicated Business line, opt-in, ≤50 new/day, paced | Moderate | Medium (needs reseller consent) | The supported path. Still flagged if junk reports or a poor reply ratio accumulate. |
| Marketing / abandoned-cart blasts | **Very high** | Breach (§3.6 "unsolicited", "bulk ... marketing") | Never on iMessage. A2P SMS with TCPA express written consent, or email. |
| Self-hosted (open-source Spectrum on our Mac/Apple Account) | **Very high** (Lindy precedent) | n/a | Our own Apple Account bears the ban, and it violates iCloud §IV.A/§V.B(10) directly. |

**Blast radius:**
- A flagged shared line hurts every tenant routed through it. Photon's §7(f) lets Photon suspend us for actions that "risk harm to any of Photon's other customers".
- A ban of a dedicated line kills the merchant's published number. It is not portable below Enterprise, so the merchant has to reprint QR codes and receipts.
- Under Linq's description, a flag can block SMS fallback too [2nd].

### 5.3 Mitigations (practical, in priority order)

**Contract / vendor**
1. **Get a written Photon Order or platform addendum** that:
   - permits multi-tenant/resale use (overriding §3.4(b)(c), §15(n));
   - permits per-merchant projects or sub-accounts (§3.8(g));
   - clarifies who "owns" managed Messaging Accounts (§3.5);
   - supplies a DPA (processor, no AI training on our customers' data, subprocessor list, US hosting statement);
   - defines a line-recovery SLA;
   - fills in the bracketed governing law.

   Until this is signed, treat Photon as a pilot dependency.
2. **Pass Photon's obligations through to merchants.** Threadline's Terms and AUP (`launch/legal/TERMS.md`, `ACCEPTABLE-USE.md`) should include:
   - The merchant warrants opt-in for every recipient and keeps consent records (mirrors Photon §3.6).
   - No marketing, promotions, or cold contacts over iMessage.
   - No card data, PHI, or government IDs (Photon Prohibited Data).
   - An indemnity mirroring Photon §15.
   - Our right to throttle or suspend bots on complaint signals.
   - **Disclaimer:** iMessage delivery runs on unofficial infrastructure not endorsed by Apple. Numbers may be blocked or deactivated by Apple at any time without notice or recourse. There is no delivery guarantee, and the merchant's remedy is limited to fallback channels or service credits.
   - No promise of a permanent number on shared plans.

**Product design (biggest risk reducers)**

3. **Inbound-first by default.** Give merchants `sms:`/iMessage deep links with a pre-filled body, QR codes, a "Text us" button, and a post-purchase page link. The shopper sends first, so there is no Report Spam banner and no new-conversation quota use.
4. **Gate "bot texts first."** Allow it only when all of these hold:
   - (a) the recipient has an existing thread on that line, or has opted in with recorded consent (timestamp, source, wording, IP);
   - (b) it is transactional (order status, pickup ready, appointment), not marketing;
   - (c) the merchant is on a dedicated line.

   On the shared pool, disable cold `space.create` to unregistered handles entirely. Photon rejects these anyway, but surface the reason clearly.
5. **Volume caps below vendor maximums.** Use a per-line budget of ≤40 new conversations/day (Photon's limit is 50) and ≤150 total conversations/day/line (Sendblue's guidance). Space new contacts ≥8 minutes apart, never send a burst of 100+ in a short window, and send only between 9am and 8pm recipient-local time (also a TCPA quiet-hours consideration). Track the reply ratio per line and auto-pause outbound when it falls below about 1 inbound per 2 outbound (Linq).
6. **First-message content rules.** Text only, with no links or media. Identify the business and the bot by name and include an AI disclosure. Open with a question to invite a reply. Send no more than 2 follow-ups, spaced days apart, to non-responders. Share a contact card (vCard) after the first exchange.
7. **STOP handling.** Honour STOP, UNSUBSCRIBE, END, QUIT, CANCEL, and "spam", plus negative sentiment, immediately and globally per handle and merchant. Send one confirmation, then suppress. Persist the suppression list. Support HELP. This is required by Photon §3.6, Linq, AMB trigger words, and TCPA.
8. **Line hygiene.** Round-robin new shoppers across lines. Keep each line at ≤400 users (Photon guidance). Keep standby lines warm with real traffic, because lines are deactivated after about 2 months idle. Monitor the Photon "Flagged" status and pause the bot when a line is flagged. Do not rotate numbers to evade a flag (§3.4(l)).
9. **Fallback channels.** Telegram (no ban dynamics of this kind) and email. SMS fallback only with 10DLC registration and TCPA-grade consent, since carrier filtering applies independently. Show merchants channel health.
10. **Kill switches.** `THREADLINE_KILL=outbound` already exists (`packages/core/src/safety.ts`). Add per-line and per-merchant automatic pauses on flag, junk, or STOP spikes.
11. **Medium-term:** evaluate Apple Messages for Business through an MSP integration for larger merchants (live-agent handoff required) as the "official" tier. Treat the Photon rail as best-effort.

### 5.4 Open questions for Photon (email help@photon.codes)
- Is Threadline's multi-tenant use permitted, and under what Order or pricing?
- On shared plans, do "users" mean end recipients? Are 10 (Free) and 100 (Pro) project-wide caps?
- Can Free/Pro lines ever initiate to registered users who have not texted first? The pricing table suggests not.
- Who is the Apple Account holder for managed lines, and what does §3.5 "Customer owns ... Messaging Accounts" mean for them?
- What is the `sendReceiveRatioExceeded` threshold?
- Is there a DPA and subprocessor list? Where is hosting? Is there an AI-training opt-out?
- What is the recovery SLA and success rate for flagged lines? Is there a credit policy?

---

## Sources (all accessed 2026-10-10)
- Apple Messages for Business Policies v3.1: https://register.apple.com/resources/messages/messaging-documentation/policies
- Apple MSP onboarding: https://register.apple.com/resources/messages/msp-onboarding/
- iCloud Terms: https://www.apple.com/legal/internet-services/icloud/
- macOS Tahoe 26 SLA: https://www.apple.com/legal/sla/docs/macOSTahoe.pdf
- Apple, Report spam and block senders: https://support.apple.com/guide/iphone/report-spam-and-block-senders-iph3f94d910d/ios
- Apple, Screen and filter texts: https://support.apple.com/guide/iphone/screen-and-filter-texts-iph203ab0be4/ios
- Apple, View conversations from unknown senders (iOS 26): https://support.apple.com/en-us/125068
- Beeper Mini / Apple statement: https://9to5google.com/2023/12/09/apple-beeper-mini-imessage/, https://appleinsider.com/articles/23/12/10/apple-confirms-it-blocked-beeper-mini-citing-security-risks, https://blog.beeper.com/p/beeper-mini-is-back
- Nothing Chats / Sunbird: https://9to5google.com/2023/11/18/nothing-chats-sunbird-unencrypted-data-privacy-nightmare/
- Lindy ban post-mortem: https://www.lindy.ai/blog/imessage-api-three-rewrites-one-apple-ban-and-what-actually-works
- Photon ToS: https://photon.codes/terms-of-services; Privacy: https://photon.codes/privacy-policy; Pricing: https://photon.codes/pricing; Deliverability (AUP): https://photon.codes/docs/best-practices/imessage-deliverability; Connection and routing: https://photon.codes/docs/spectrum-ts/providers/imessage/connection-and-routing
- Sendblue ToS: https://sendblue.com/terms-of-service; limits: https://support.sendblue.com/articles/4256420350-daily-limits-rate-limits-capacity-sendblue, https://support.sendblue.com/articles/5118759699-how-many-new-conversations-can-i-start-per-line-each-day
- Linq AUP: https://linqapp.com/policies/acceptable-use-policy; flagged number: https://help.linqapp.com/flagged-number; best practices: https://docs.linqapp.com/getting-started/best-practices/index.md; competitor overview: https://linqapp.com/blog/the-best-imessage-api-providers
- LoopMessage terms: https://loopmessage.com/terms
- Blooio messaging safety: https://docs.blooio.com/guides/messaging-safety
- AMB guides (secondary): https://getkanal.com/blog/apple-messages-for-business, https://bird.com/en-au/guides/your-guide-to-apple-messages-for-business-what-to-know
- iOS 26 business impact (secondary): https://www.bandwidth.com/blog/apple-ios26-inbox-update/, https://www.twilio.com/en-us/blog/insights/trends/potential-ios-26-update-communications-implications
