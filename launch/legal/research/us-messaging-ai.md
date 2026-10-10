# US messaging + AI disclosure law: research memo for Threadline / HeyBell

Prepared 2026-10-10. This is legal research, not legal advice. Have US counsel (TCPA specialist) review before launch.

Legend: **[V]** = checked against a primary source or several consistent secondary sources during this research. **[S]** = based on secondary sources (law-firm or vendor summaries) only. **[U]** = unverified or from memory. Confirm before relying on it.

Product flows referenced below:
- (a) customer texts "start <code>" to a shared line (consumer-initiated)
- (b) "bot texts you first": the business owner or a public share page submits a number and the bot sends a greeting
- (c) scheduled follow-ups the bot sends later
- (d) planned outbound to prospect stores (pre-built bots)

---

## 0. Bottom line (risk ranking of our flows)

| Flow | Federal TCPA risk | State risk | Verdict |
|---|---|---|---|
| (a) consumer texts in first, bot replies | Low. Consumer-initiated, responsive messages are "conversational" (implied consent under CTIA) and are consented under TCPA | Low | Ship. Add AI disclosure + STOP handling |
| (b) owner enters **own** number | Low. The subscriber gives consent | Low | Ship. Store consent record |
| (b) **public share page**, anyone enters any number | **High.** Consent must come from the called party (subscriber or customary user). An anonymous stranger can't consent for someone else. Glide-style "platform sends to a number a user supplied" is the fact pattern the FCC found made the platform the caller | High (FL/OK/MD/WA/TX/VA) | **Redesign.** Replace with a click-to-text deep link (`sms:`/`imessage:` with prefilled `start <code>`) so the consumer sends the first message. If number entry stays, require a consent checkbox and send **one** confirmation-request message only ("reply YES"), then nothing until YES |
| (c) scheduled follow-ups | Medium. Informational follow-ups need prior express consent. Anything promotional (discounts, cart recovery, upsell) is telemarketing and needs prior express **written** consent if automated, plus quiet hours and DNC | Medium-high (FL/OK need PEWC for automated sales texts, 8pm cutoffs, 3/24h caps) | Ship informational only by default. Gate promotional follow-ups behind a PEWC capture |
| (d) cold outbound to prospect stores via iMessage/SMS | **High.** Store contact numbers are often owners' cell phones. WA bans commercial texts without consent outright, and FL/OK/TX/VA/MD apply. AI-generated personalized texts sent by our system are "telephone solicitations" | High | **Don't cold-text.** Use cold email (CAN-SPAM is opt-out-based, see section 4), then move to messaging only after the prospect opts in |

TCPA statutory damages are $500 per message, trebled to $1,500 if willful or knowing, with no cap. Class actions over a few thousand messages reach seven figures. 47 U.S.C. § 227(b)(3), (c)(5).

---

## 1. TCPA (47 U.S.C. § 227; 47 C.F.R. § 64.1200)

### 1.1 Are iMessage / OTT messages to a phone number "calls"?

- **FCC position: texts are "calls."** The FCC has held since 2003 that the TCPA's "call" includes text messages (2003 TCPA Order, 18 FCC Rcd 14014, ¶ 165) **[S]**. The Supreme Court accepted this in *Campbell-Ewald Co. v. Gomez*, 577 U.S. 153 (2016), and the 9th Circuit did earlier in *Satterfield v. Simon & Schuster*, 569 F.3d 946 (9th Cir. 2009) **[V]** (https://library.nclc.org/article/supreme-court-applies-tcpa-text-messages-affirms-fccs-vicarious-liability-principles).
- **App and Internet-to-phone messages.** The FCC's July 10, 2015 Omnibus Declaratory Ruling and Order (FCC 15-72, 30 FCC Rcd 7961) addressed app-originated messages:
  - It treated "Internet-to-phone" messages sent to a wireless number as calls. The transport technology doesn't matter because the message is directed to a telephone number **[U: paragraph numbers ~¶¶ 107-122 not verified]**.
  - It decided the TextMe and Glide petitions on who "makes" a call. Glide, which auto-texted a user's contacts unless the user opted out, was the caller. TextMe, where the user chose each recipient and pressed send, was not **[V]** (https://perkinscoie.com/en/news-insights/the-july-2015-tcpa-omnibus-declaratory-ruling-and-order-the-good.html; https://www.govinfo.gov/content/pkg/FR-2015-10-09/html/2015-25682.htm).
  - Applied later in *Cour v. Life360* (N.D. Cal. 2016) **[V]** (https://www.consumerfinancialserviceslawmonitor.com/2016/08/court-dismisses-tcpa-claim-because-text-messaging-app-does-not-make-calls/).
- **iMessage specifically: no reported decision found [U].** Our searches found no case holding iMessage in or out of the TCPA. Analysis:
  - § 227(b)(1)(A)(iii) is keyed to calls "to any telephone number assigned to a ... cellular telephone service." An iMessage addressed to a US mobile number is very likely treated the same as SMS. Any SMS fallback is indisputably SMS.
  - Assume iMessage = text = call.
- **Post-*McLaughlin* uncertainty.** In *McLaughlin Chiropractic Assocs. v. McKesson Corp.*, No. 23-1226 (U.S. June 20, 2025), the Court held that district courts are not bound by FCC TCPA interpretations. Since then **[S]**:
  - *Howard v. Republican Nat'l Comm.*, No. 23-3826 (9th Cir. Jan. 2026): a text **is** a "call" under § 227(b) on the plain dictionary meaning. Dismissal was affirmed anyway because the RNC text contained no artificial or prerecorded voice.
  - *Steidinger v. Blackstone Med. Servs.*, No. 25-2398 (7th Cir. July 2026): a text is **not** a "telephone call" under the § 227(c)(5) do-not-call private right of action. This is binding in IL, IN and WI. Similar district rulings include *Jones v. Blackstone* (C.D. Ill. 2025) and *Conrad v. Hart Consumer Prods.* (N.D. Ala.).
  - No cert grant as of this writing **[S]**.
  - Sources: https://www.hubinternational.com/en-us/hub-resources/proex-advocate/2026/10/tcpa-text-messages-and-private-right-of-action/ ; https://blogs.duanemorris.com/classactiondefense/2026/07/17/seventh-circuit-holds-that-the-tcpas-do-not-call-provision-does-not-cover-text-message/
  - Practical read: don't build on these defenses. Outside the 7th Circuit, DNC claims over texts continue, and state laws expressly cover texts.

### 1.2 ATDS after *Facebook v. Duguid*

- *Facebook, Inc. v. Duguid*, 592 U.S. 395 (2021): an "automatic telephone dialing system" must have the capacity to store or produce numbers **using a random or sequential number generator**. Systems that message numbers from a stored list (CRMs, our bot) are generally **not** ATDSs **[V]**.
- Consequence: § 227(b)'s consent requirement for texts applies only if (i) an ATDS is used or (ii) an "artificial or prerecorded voice" is used. Text has no voice (*Howard*), so federal § 227(b) exposure for our texts is now narrow.
- **This does not make us safe:**
  - DNC rules (§ 227(c); 47 C.F.R. § 64.1200(c)-(e)) apply to telephone solicitations regardless of equipment. The FCC's Dec. 2023 order expressly extended national DNC protection to texts (64.1200(e)) **[S]**.
  - State mini-TCPAs use broader autodialer definitions (section 1.8).
  - If we ever add voice (AI voice calls), the FCC's Feb. 2024 declaratory ruling (FCC 24-17) treats AI-generated voices as "artificial voice," which requires consent **[U: from memory]**.

### 1.3 Prior express consent (PEC) vs prior express written consent (PEWC)

- **PEC**: needed for non-marketing (informational) autodialed or prerecorded calls/texts to wireless numbers. 47 C.F.R. § 64.1200(a)(1). It can be oral or implied by knowingly giving one's number for that purpose. A consumer texting us first = consent to responsive replies.
- **PEWC**: needed for telemarketing or advertising calls/texts using an ATDS or artificial/prerecorded voice. § 64.1200(a)(2). Under § 64.1200(f)(9) it is a written agreement, with E-SIGN signatures allowed (checkbox + submit), that:
  - bears the signature of the person called
  - clearly authorizes **the seller** to deliver ads/telemarketing using automated technology
  - names the telephone number
  - discloses that consent is **not a condition of purchase**
  - The seller bears the burden of proof.
- **One-to-one consent rule vacated.** *Insurance Marketing Coalition v. FCC*, No. 24-10277 (11th Cir. Jan. 24, 2025) vacated Part III.D of the FCC's 2023 order (one-seller-at-a-time consent plus "logically and topically related") as exceeding FCC authority. Common-law consent governs **[V]** (https://www.wiley.law/alert-UPDATE-11th-Circuit-Vacates-FCCs-One-to-One-TCPA-Consent-Rule; https://www.reedsmith.com/our-insights/blogs/technology-law-dispatch/102k2uj/eleventh-circuit-vacates-fcc-one-to-one-consent-rule/). Whether and when the FCC formally removed the text from the CFR is **[U]**. For us, each consent naturally names one merchant anyway. Keep it that way.
- **On-demand single text.** The FCC's 2015 Order treated a one-time text sent immediately in response to a consumer's request as within the consumer's consent, provided it contains only the requested information and no other marketing **[U: ¶ cite]**. This supports a single confirmation-request message in flow (b), but only if the requester is the number's subscriber.

### 1.4 Consent revocation: 2024 order, delays, and the Sept. 2026 rewrite

- **2024 TCPA Consent Order** (FCC 24-24, adopted Feb. 15, 2024; 89 Fed. Reg. 15756) **[S]**:
  - Consent may be revoked by **any reasonable means**.
  - A reply of "stop," "quit," "end," "revoke," "opt out," "cancel" or "unsubscribe" is per se reasonable.
  - Revocations must be honored within a reasonable time, **not exceeding 10 business days**.
  - A one-time confirmation text is allowed if sent within 5 minutes and free of marketing.
  - Most of it took effect **April 11, 2025**.
- **"Revoke-all" rule (§ 64.1200(a)(10)).** A revocation applies to all robocalls/robotexts from that caller, including unrelated informational ones. It was delayed by CGB waiver first to **April 11, 2026** (DA 25-312, Apr. 2025 **[U: DA number]**), then to **January 31, 2027** (DA 26-12, Jan. 6, 2026) **[V]** (https://www.burr.com/telephone-consumer-protection-act/the-fcc-delays-effective-date-of-tcpa-revoke-all-rule-until-january-31-2027; https://www.consumerfinancialserviceslawmonitor.com/2026/01/fcc-further-extends-effective-date-for-tcpa-revoke-all-rule/).
- **Sept. 30, 2026 Report & Order + FNPRM (FCC 26-67)** **[S for adoption/final text; V for the circulated draft FCC-CIRC 2609-05]** (draft: https://docs.fcc.gov/public/attachments/DOC-424844A1.pdf; adoption summary: https://www.recordinglaw.com/news/fcc-tcpa-consent-revocation-order/):
  - A caller may designate an **exclusive** revocation method from three options:
    - an automated voice or key-press opt-out on a call
    - replying to a text with any of **"stop," "quit," "end," "revoke," "opt out," "cancel," "unsubscribe"**
    - a designated website or phone number
  - The designated method must be disclosed clearly and conspicuously on the call or in the text.
  - Callers that designate nothing must still honor **any reasonable means**, under a rebuttable presumption that the consumer revoked.
  - An opt-out of an **informational** message may be limited to that category.
  - An opt-out in response to **advertising/telemarketing** revokes consent for all future marketing from that caller.
  - If a texting protocol can't accept replies, each text must say so and give alternative opt-out methods.
  - Still **≤ 10 business days** to honor.
  - The confirmation-text safe harbor remains: confirm only, no marketing, presumed fine if sent within 5 minutes.
  - **Effective 30 days after Federal Register publication.** Not yet published as of Oct. 8, 2026, per the secondary source. It supersedes the Jan. 31, 2027 revoke-all date.
  - The FNPRM (proposals only) asks about a shorter honor window, mandatory two-way texting, and a mandatory "revoke all" option.
  - Final adopted text may differ from the draft **[U]**.
- **Our design:** honor all seven words plus natural-language opt-outs (any reasonable means). Process **immediately**, not within 10 days. Treat an opt-out from any message as blocking all non-transactional messages from that merchant.

### 1.5 Quiet hours and frequency

- Federal: no telephone solicitation before **8:00 a.m. or after 9:00 p.m.** in the called party's local time. 47 C.F.R. § 64.1200(c)(1) **[V]**. It applies to solicitations, not responsive or customer-service replies.
- State limits are stricter (section 1.8): FL and MD end at **8 p.m.**; TX allows **9 a.m.-9 p.m. Mon-Sat and noon-9 p.m. Sun**; OK bans solicitations on holidays; FL/OK/MD cap solicitations at **3 per 24 hours** on the same subject **[S]**.

### 1.6 Damages

- § 227(b)(3): actual damages or **$500 per violation**, up to **$1,500** if willful or knowing. Each text is a violation.
- § 227(c)(5) (DNC): same amounts, requires more than one call in 12 months. Good-faith compliance-procedures defense under § 227(c)(5).
- State AGs: § 227(g). Statute of limitations: 4 years (28 U.S.C. § 1658) **[U]**.

### 1.7 Who is liable: platform vs merchant

- **Direct liability** attaches to the person who "makes" or "initiates" the call. The FCC uses a totality-of-circumstances test: who controls content, timing and recipients (2015 Omnibus Order, TextMe/Glide).
- In *Dialing Services, LLC* (FCC Notice of Apparent Liability, 29 FCC Rcd 5537 (2014)) **[U: cite from memory]**, the FCC found a platform could be the "maker" of robocalls when it is so involved in placing them, and it isn't shielded just because customers supplied the content.
- **Vicarious liability**: *In re DISH Network* Declaratory Ruling, 28 FCC Rcd 6574 (May 9, 2013): sellers can be vicariously liable under federal common-law agency principles (actual authority, apparent authority, ratification) for third parties' calls **[V]** (https://www.wiley.law/alert-2708). *Campbell-Ewald* confirmed this.
- **Applied to us:**
  - Flow (a): the consumer initiates. Low risk for everyone.
  - Flow (b) share page and flow (c): **we** choose timing and largely the content (the AI writes it), and our system sends automatically. Like Glide, HeyBell is likely a "maker." The merchant is also liable as the seller (vicarious).
  - Flow (d): we are the seller and the sender. Fully ours.
  - Photon, the underlying sender, probably has carrier-like arguments but will push liability to us by contract. Check Photon's AUP and indemnity terms **[U]**.
- **Contract mitigation:** our Terms should require merchants to warrant consent and indemnify us. This won't stop plaintiffs suing us directly, so product controls matter more.
- **Foreign founder:** the TCPA applies to calls to US numbers regardless of where the sender is. Personal jurisdiction over a foreign company that targets US consumers is routinely found **[U]**.

### 1.8 State "mini-TCPAs" (selected)

| State | Statute | Key points for texts | Private action / damages |
|---|---|---|---|
| **Florida (FTSA)** | Fla. Stat. § 501.059 | **2023 HB 761** (passed May 2, 2023, effective on enactment) **[S]**: (1) ATDS narrowed from "selection **or** dialing" to "automated system for the selection **and** dialing" of numbers; (2) for unsolicited texts, plaintiff must first reply **"STOP"** and allow **15 days** before suing; (3) PEWC still required for automated "telephonic sales calls"; 8 a.m.-8 p.m.; max 3 sales calls/24h on same subject | Yes. $500 per violation, up to $1,500 if willful (https://www.gunster.com/newsroom/publications/floridas-comprehensive-robocall-tort-reform; https://www.klgates.com/Florida-Legislature-Passes-Bill-to-Bring-Common-Sense-Changes-to-the-Florida-Telephone-Solicitation-Act-5-9-2023) |
| **Oklahoma (OTSA)** | 15 O.S. § 775C.1 et seq. (eff. Nov. 1, 2022) | Modeled on the pre-2023 FTSA. Automated system for selection **or** dialing (broad, no cure period) **[S]**. PEWC for automated sales calls/texts; 3/24h; hours per sources 8 a.m.-9 p.m. **[S: conflicting]**; holidays restricted | Yes. $500, up to $1,500 if willful **[S]** |
| **Maryland** | Stop the Spam Calls Act, Md. Code, Com. Law § 14-4501 to 14-4503 (eff. Jan. 1, 2024) | Broad "selection or dialing" autodialer definition. PEWC for automated sales calls/texts; 8 a.m.-8 p.m.; 3/24h | Enforced via Md. Consumer Protection Act. Scope of private action disputed **[U]** |
| **Washington (CEMA)** | RCW 19.190.060-.070 | **Flat ban**: no person doing business in WA may "initiate or assist in the transmission of" a **commercial electronic text message** to a WA resident's cell number **[V]** (https://app.leg.wa.gov/RCW/default.aspx?cite=19.190.060). Exception for recipients who clearly and affirmatively consented in advance, or an existing business relationship (RCW 19.190.070) **[U]**. Note "assist in": platform liability | Per se Consumer Protection Act (RCW 19.86) violation. $500 liquidated damages per message recognized in *Wright v. Lyft*, 189 Wn.2d 718 (2017) **[U]** |
| **Texas** | SB 140 (eff. Sept. 1, 2025), amending Tex. Bus. & Com. Code ch. 302/304 | Telephone solicitation rules now expressly cover texts and images. Registration with SOS and $10,000 bond unless exempt. A Nov. 2025 AG settlement reportedly confirmed that genuinely consent-based texts are exempt from registration **[S]**. Hours 9 a.m.-9 p.m. Mon-Sat, noon-9 p.m. Sun | DTPA remedies, treble for knowing violations. Plaintiffs plead up to $5,000 per violation **[S]** |
| **Virginia** | Va. Telephone Privacy Protection Act, Va. Code § 59.1-510 et seq., amended eff. Jan. 1, 2026 | Covers texts. A STOP/UNSUBSCRIBE reply must be honored for **10 years** **[S]** | $500 / $1,000 / $5,000 (repeat) **[S]** |
| Others | GA SB 73 (2024), CT, NY GBL Art. 29-A, CA | Varying hours, DNC lists, autodialer definitions **[S]** | Varies |

Sources for the table: https://www.leadgen-economy.com/blog/state-mini-tcpa-laws-ftsa-otsa/ ; https://justcall.io/blog/state-mini-tcpa-laws.html (vendor summaries; numbers marked [S]/[U] need checking against the statutes).

**Engineering default that satisfies all of the above for any non-responsive outbound message:**
- send only **9:00 a.m.-8:00 p.m.** recipient local time Mon-Sat, **noon-8:00 p.m.** Sunday
- no sends on US federal holidays
- **≤ 3 per 24h** per number per merchant
- recipient time zone from area code, overridden by ZIP or address when known

---

## 2. CTIA Messaging Principles and Best Practices (May 2023)

Source: https://api.ctia.org/wp-content/uploads/2023/05/230523-CTIA-Messaging-Principles-and-Best-Practices-FINAL.pdf **[V: text extracted and read]**.

- **Scope (§ 2.2):** applies to SMS, MMS and RCS over wireless providers' networks. CTIA expressly says the principles are intended for services that interoperate with wireless providers' networks, **not** cloud services that need a separate client and don't interoperate.
  - **iMessage-to-iMessage traffic is outside CTIA's scope.** Apple, not carriers, is the gatekeeper there.
  - **SMS fallback is in scope.** Fallback traffic from Photon numbers is ordinary 10-digit long-code A2P traffic. Carriers require **10DLC brand and campaign registration** through The Campaign Registry and will filter unregistered traffic.
  - Confirm with Photon whether fallback is enabled and whose 10DLC registration covers it **[U]**.
- **CTIA is voluntary, not law.** We should still follow it because (1) it is the industry benchmark courts and regulators look to, (2) it's required on any SMS fallback, and (3) Apple will likely flag our pool IDs for spam if we don't.
- **Consent tiers (Exhibit II):**
  - **Conversational**: the consumer texts first and the business replies. Implied consent.
  - **Informational**: the consumer gave their number and asked to be contacted. Express consent.
  - **Promotional**: express **written** consent. Adding a coupon or other call to action to an informational text can make it promotional.
- **Call-to-action (§ 5.1.1)** must disclose:
  1. program description
  2. the number(s) messages come from
  3. identity of the sender
  4. clear opt-in language and any fees
  5. terms: how to opt out, customer care contact, privacy policy
  - Don't bury opt-in terms in T&Cs.
- **Consent records (§ 5.1.2).** Retain where applicable:
  - timestamp
  - acquisition medium
  - capture of the language and action used to secure consent
  - specific campaign
  - **IP address**
  - phone number
  - identity of the person who consented (name, user name or session ID)
- **Opt-in confirmation for recurring messages (§ 5.1.2.1)** must contain:
  1. program name or product description
  2. customer care contact (number or HELP instructions)
  3. how to opt out
  4. **that messages are recurring, and the frequency**
  5. any fees ("Msg & data rates may apply")
  - Send it before any other messages.
- **One opt-in per campaign (§ 5.1.2.2).** Not transferable. Merchant A's opt-in doesn't cover merchant B.
- **Opt-out (§ 5.1.3):**
  - support multiple opt-out mechanisms (call, email, text)
  - send **one** final opt-out confirmation per campaign, then nothing more
  - state in messages how to opt out, using standard "STOP" wording
  - natural-language requests ("stop, end, unsubscribe, cancel, quit, 'please opt me out'") must also be honored
  - ignore case, punctuation and other minor variances
- **Keywords:**
  - The 2023 Principles list stop, end, unsubscribe, cancel, quit.
  - **STOPALL**, **HELP** and **INFO** come from carrier/short-code handbook practice and 10DLC campaign requirements, not the Principles text **[S]**.
  - HELP responses conventionally include program name, support contact, frequency, STOP instructions and "Msg & data rates may apply" **[S]**.
- No rented, sold or shared lists (§ 5.1.4). Process number deactivation files (§ 5.1.5).

---

## 3. AI / bot disclosure laws

### 3.1 California SB 1001, "B.O.T. Act" (Bus. & Prof. Code §§ 17940-17943; eff. July 1, 2019)

**[U: statutory text from memory. leginfo returned 403. Verify wording.]**
- § 17941(a): unlawful to use a **bot** to communicate or interact with a person in California **online** with intent to mislead them about its artificial identity, in order to knowingly deceive them about the content of the communication to **incentivize a purchase or sale of goods or services** in a commercial transaction (or to influence an election vote).
  - **Safe harbor**: no liability if the person discloses that it is a bot.
- § 17941(b): the disclosure must be **"clear, conspicuous, and reasonably designed to inform persons with whom the bot communicates or interacts that it is a bot."**
- § 17940 definitions:
  - "bot": an automated online account where all or substantially all actions or posts are not the result of a person
  - "online": any public-facing website, web application, or **digital application**, including a social network
- § 17942: imposes no duty on platform service providers. § 17943: cumulative with other law.
- Enforcement through UCL (Bus. & Prof. Code § 17200/17206) by public prosecutors, civil penalties up to $2,500 per violation **[U]**. No express private right.
- **Relevance:** a sales-capable store bot over iMessage plausibly falls within "digital application." The disclosure safe harbor is cheap. Disclose in the first message and whenever asked.

### 3.2 California AB 1609, "Right to Human Customer Service" (Ch. 733, Stats. 2026; signed Sept. 28, 2026) [S]

- Applies only to "large private businesses": more than **$500M** gross annual revenue nationally.
- Requirements:
  - no representing a customer-service chatbot as human
  - clear and conspicuous disclosure, **in the same medium**, that the bot is AI if a reasonable person would likely be misled
  - during business hours, a simple way to request a human on all customer-service platforms, with a good-faith effort to connect within 15 minutes or schedule a callback
- Public prosecutor enforcement, $5,000 for a first violation and $10,000 for each later one. Effective date **[U]**.
- Sources: https://dataprivacy.foxrothschild.com/2026/09/articles/general-privacy-data-security-news-developments/5118/ ; https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202520260AB1609
- Our Shopify DTC merchants are almost all below the threshold. Still a useful design target: "reply HUMAN" plus a human handoff feature.

### 3.3 California SB 243, companion chatbots (2025; eff. Jan. 1, 2026) [S]

- Regulates "companion chatbots": disclosure, suicide/self-harm protocols, minor protections, and a private right of action (reportedly $1,000 per violation **[U]**).
- **Excludes** bots used only for customer service, business operational purposes, productivity or technical assistance. **Not applicable as long as our agents stay transactional.** Don't let merchants configure "virtual friend" personas.
- Source: https://www.ailawsbystate.com/tools/companion-chatbot-tracker

### 3.4 Utah Artificial Intelligence Policy Act (SB 149, 2024; amended by SB 226 and SB 332, 2025; amendments eff. May 7, 2025) [S]

- **General commercial use (Division of Consumer Protection laws):**
  - If a consumer makes a **"clear and unambiguous request"** to know whether they're interacting with AI, the business must disclose that it is.
  - SB 226 narrowed this from any "ask."
- **Regulated occupations** (licensed professions: health, financial, legal and similar):
  - prominent disclosure at the outset, but only for **"high-risk" interactions**
  - high-risk means collecting sensitive personal information (health, financial, biometric) **and** giving personalized advice that could inform significant decisions
- **Safe harbor** (SB 226): no enforcement if the AI clearly and conspicuously discloses, at the outset and throughout, that it is AI and not human **[S: details unverified]**.
- SB 332 extended the Act's sunset to **July 1, 2027**.
- Enforcement by the Division of Consumer Protection, administrative fines up to $2,500 per violation **[U]**.
- Sources: https://fpf.org/wp-content/uploads/2025/04/Overview-of-Utahs-2025-Enacted-AI-Legislation.pdf ; https://davispolk.com/insights/client-update/utah-scales-back-reach-generative-ai-consumer-protection-law
- **Our rule:** answer truthfully, always, when asked "are you a bot/human?" Our up-front disclosure fits the safe harbor.

### 3.5 Colorado AI Act (SB 24-205): repealed and replaced [S]

- SB 25B-004 (Aug. 2025 special session) delayed SB 24-205 to June 30, 2026.
- *xAI v. Weiser* (D. Colo.): enforcement was enjoined or stayed in April 2026, and the AG stated it would not enforce.
- **SB 26-189** (signed May 14, 2026) repeals SB 24-205 and replaces it with a narrower **automated decision-making technology (ADMT)** framework, **effective Jan. 1, 2027**:
  - notice duties only where covered ADMT is used in **consequential decisions** (employment, lending, housing, insurance and similar)
  - AG enforcement only, with a 60-day cure period
- SB 24-205's general duty to disclose interaction with an AI system (former C.R.S. § 6-1-1704) **was dropped**.
- **Not applicable** to an e-commerce customer-service bot that makes no consequential decisions.
- Sources: https://www.eckertseamans.com/legal-updates/colorado-repeals-and-replaces-its-landmark-ai-statute-what-businesses-need-to-know ; https://www.mcdermottlaw.com/insights/colorado-ai-law-in-flux-comprehensive-replacement-bill-signed-after-federal-court-blocks-predecessors-enforcement/ ; https://www.jdsupra.com/legalnews/colorado-replaces-its-landmark-ai-act-3494395/

### 3.6 Maine LD 1727 (P.L. 2025, ch. 294; 10 M.R.S. § 1500-DD; eff. ~Sept. 2025) [V for text summary]

- A person may not use an AI chatbot "or any other computer technology" to engage in trade and commerce with a consumer in a way that may mislead or deceive a reasonable consumer into believing they're engaging with a human, **unless the consumer is notified in a clear and conspicuous manner** that they are not.
- "AI chatbot" = software that simulates human conversation by text or voice.
- A violation is a violation of the Maine Unfair Trade Practices Act (AG enforcement). Penalty amounts **[U]**.
- Source: https://legislature.maine.gov/legis/statutes/10/title10sec1500-DD.html
- **This is the broadest rule that clearly reaches small merchants. Up-front disclosure satisfies it.**

### 3.7 NY / NJ / IL and other states

- **New York:** GBL Art. 47 (AI companion models, eff. Nov. 2025) covers companion bots, not customer service **[S]**. No general customer-service bot disclosure law found **[U]**.
- **New Jersey:** no enacted chatbot disclosure law found **[U]**. Bills have been introduced in past sessions.
- **Illinois:** no general bot-disclosure statute found. The 2025 Wellness and Oversight for Psychological Resources Act (HB 1806) restricts AI therapy, which is not relevant **[S/U]**.
- **Other 2026 enactments** reported: WA HB 2225 (companion bots, eff. Jan. 1, 2027); NE LB 525 and ID SB 1297 (conversational AI, eff. July 1, 2027); a Georgia chatbot disclosure and child-safety act (eff. July 1, 2026). All **[S]**, scope unverified. Some may reach general conversational AI. Re-check before July 2027.
- Source: https://www.orrick.com/en/Insights/2026/04/2026-State-Chatbot-Laws-Key-Provisions-and-Regulatory-Trends (403 on fetch; cited via search summary)
- Trend: disclosing at the start and on request satisfies every enacted customer-facing rule we found.

### 3.8 EU AI Act, Article 50 (Reg. (EU) 2024/1689)

- **Art. 50(1)**:
  - **Providers** must design AI systems intended to interact directly with natural persons so those persons are informed they're interacting with an AI system, unless that's obvious to a reasonably well-informed, observant person given the circumstances.
  - The information must be clear and distinguishable and given **at the latest at the first interaction or exposure** (Art. 50(5)).
  - It must meet accessibility requirements.
- **Art. 50(2)**: providers of generative systems must mark synthetic output in a machine-readable way.
- **Timing.** Art. 50 applies from **Aug. 2, 2026**. The **Digital Omnibus on AI** (political deal May 2026; EP vote June 16; Council final approval June 29; reported entry into force ~July 27, 2026):
  - delayed high-risk obligations (Annex III to Dec. 2, 2027; Annex I to Aug. 2, 2028)
  - did **not** delay Art. 50(1) chatbot disclosure
  - gave only a grace period, to **Dec. 2, 2026**, for Art. 50(2) machine-readable marking by systems already on the market before Aug. 2, 2026
  - **[S]**. Official Journal reference not verified. Sources: https://www.joneswalker.com/en/insights/blogs/ai-law-blog/yes-august-2-still-matters-the-eu-approved-a-high-risk-ai-delay-but-most-trans.html?id=102nbon ; https://www.winstontaylor.com/insights/ai-act-rules-on-high-risk-ai-delayed-as-ai-digital-omnibus-agreed ; https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/
- **Applies to us** when output is used in the EU (Art. 2(1)(c)), e.g. a US store's EU customers.
  - HeyBell is likely the **provider** of the AI system: we build it and offer it under our name on top of a third-party LLM.
  - Merchants are deployers.
- Penalties up to EUR 15M or 3% of worldwide turnover (Art. 99(4)).
- Our first-message disclosure satisfies Art. 50(1).
- For Art. 50(2), text output from a chatbot in a conversation with a disclosed AI is low risk. Watch the Commission's Code of Practice on transparency **[U]**.

### 3.9 FTC Act § 5 (15 U.S.C. § 45)

- **Bots posing as humans.** Misrepresenting that a person is talking to a human can be a deceptive practice.
  - Precedent: *FTC v. Ruby Corp. (Ashley Madison)* (2016), fake "engager" bot profiles.
  - FTC staff guidance (2023 business blog posts, e.g. "Chatbots, deepfakes, and voice clones: AI deception for sale" and "The Luring Test") warns against AI that misleads people about whether they're dealing with a machine **[U: wording]**.
  - 2024 Impersonation Rule, 16 C.F.R. Part 461: bars impersonating government and businesses. Extension to individuals was proposed **[S]**.
- **AI claims.** Operation AI Comply (Sept. 2024; DoNotPay and others) and roughly a dozen 2025 "AI-washing" cases target false or unsubstantiated claims about AI capability **[S]** (https://www.mofo.com/resources/insights/241008-ftc-first-ai-related-enforcement-actions; https://natlawreview.com/press-releases/ftc-brings-dozen-ai-washing-enforcement-cases-2025-targeting-overstated-ai).
  - Our marketing claims (e.g. "resolves 80% of tickets") need substantiation.
- **Current posture.** Under Chair Ferguson and the July 2025 AI Action Plan, the FTC has de-emphasized novel AI theories but still brings traditional deception cases. It opened a Sept. 2025 § 6(b) study of companion chatbots **[S]**.
- **Privacy policy misrepresentation.** Saying one thing in a privacy policy and doing another (e.g. using customer conversations to train models, sharing with LLM vendors, retention) is classic § 5 deception. FTC staff warned in early 2024 that **quietly changing terms or privacy policies** to allow AI training can be unfair or deceptive **[U: blog titles/dates]**.
  - Our privacy policy must accurately describe LLM subprocessors (Anthropic or others), Photon, retention, and whether conversations are used for training.

---

## 4. Cold B2B outreach

### 4.1 CAN-SPAM (15 U.S.C. §§ 7701-7713; 16 C.F.R. Part 316) for cold email

CAN-SPAM covers **all commercial email, including B2B**. It is **opt-out** based, so cold email is lawful if you:
1. Use no false or misleading header information: From, Reply-To, routing (§ 7704(a)(1)).
2. Use no deceptive subject lines (§ 7704(a)(2)).
3. Identify the message as an advertisement, clearly and conspicuously. FTC guidance gives latitude in how (§ 7704(a)(5)(A)(i)).
4. Include a **valid physical postal address** of the sender. A registered PO box or private mailbox is OK (§ 7704(a)(5)(A)(iii)).
5. Provide a working **opt-out** mechanism, functional for **30 days** after sending (§ 7704(a)(3)), and honor it within **10 business days** (§ 7704(a)(4); 16 C.F.R. § 316.4).
   - No fee, no login, nothing beyond a reply email or a single web page.
   - Don't sell or transfer opted-out addresses.
6. **No harvested or dictionary-generated addresses or automated account creation** (aggravated violations, § 7704(b)).
7. **Responsible party:** the company whose product is promoted is liable even if a vendor sends.

- Penalties: civil penalties per email, inflation-adjusted. **$53,088 in 2025 [S]**, 2026 figure **[U]**. FTC, state AG and ISP enforcement. No consumer private action.
- State overlay:
  - **Washington CEMA** (RCW 19.190.020) bars false or misleading subject lines and transmission info in commercial email to WA residents.
  - *Brown v. Old Navy, LLC* (Wash. Apr. 17, 2025) held any false or misleading subject-line content, e.g. fake urgency, is actionable, with **$500 per email** via the CPA. CAN-SPAM preemption doesn't cover falsity claims **[S/U]**.
  - Keep subject lines literally true. No fake "Re:", no fake deadlines.
- Non-US prospects need opt-in under CASL (Canada) and PECR/GDPR (UK/EU), with narrow B2B exceptions. Keep cold email US-only unless reviewed.

### 4.2 Texting or iMessaging prospects

- **Federal TCPA:**
  - § 227(b) has no B2B exemption for **cell phones**. Post-*Duguid*, a list-based, non-voice text sender is probably not an ATDS, so (b) exposure is limited.
  - DNC (§ 227(c)) protects "residential subscribers." Courts often treat cell numbers used for both personal and business purposes (typical for small Shopify owners) as residential **[S]**.
  - National DNC registration of a number used for a business is a fact question.
- **State law:**
  - Washington's CEMA flatly bars commercial texts to WA residents' cell numbers without consent, and it reaches anyone who "assists."
  - FL/OK/MD require PEWC for automated sales texts.
  - TX requires registration unless exempt.
  - VA requires 10-year opt-out honoring.
  - These laws generally don't exempt B2B solicitation of sole proprietors **[U per state]**.
- **Apple and Photon terms:** unsolicited bulk iMessage from pooled Apple IDs risks account bans. Apple's terms prohibit spam **[U: check Photon AUP]**.
- **Recommendation:** **no cold texts or iMessages to prospects.**
  - Do cold email under CAN-SPAM. The CTA links to the prospect's pre-built bot demo page, where the owner texts the bot (consumer-initiated) or enters their own number with a consent checkbox.
  - A one-off, manually typed text by a human founder to a business landline is lower risk, but still state-law exposure. Avoid at scale.

---

## 5. Practical compliance spec for HeyBell

### 5.1 Keyword handling (all channels: iMessage, SMS fallback, Telegram, WhatsApp)

Normalize first: trim, lowercase, strip punctuation and emoji, collapse whitespace.

| Class | Exact-match keywords (whole message) | Action |
|---|---|---|
| **Opt-out** | `stop`, `stopall`, `stop all`, `unsubscribe`, `cancel`, `end`, `quit`, `revoke`, `opt out`, `optout`, `opt-out` | Immediately set `opted_out=true` for (number, merchant). Send **one** confirmation within 5 minutes (5.4). Block all further messages from that merchant except a response if the consumer later texts in again. Never send marketing after |
| **Opt-out (natural language)** | LLM or regex classifier for intent: "stop texting me", "remove me", "don't message me", "leave me alone", "wrong number", "unsubscribe me please", "not interested, stop", and non-English equivalents (`alto`, `basta`, `arrêt`, `para`) | Same as opt-out. When unsure, lean toward opt-out (any-reasonable-means standard). Log the raw text plus classifier score |
| **Help** | `help`, `info`, `support` | Send the HELP response (5.4). Doesn't change consent |
| **Re-subscribe** | `start`, `unstop`, `yes` (only after an opt-out or confirmation prompt) | Re-opt-in. Log as new consent with source=`keyword_reoptin`. Send opt-in confirmation |
| **Human** | `human`, `agent`, `person`, `representative`, "talk to a human" | Hand off to the merchant inbox. Tell the user when to expect a reply |
| **Bot check** | "are you a bot/AI/real/human?" | **Always truthful**: "I'm an AI assistant, not a person." (Utah, Maine, CA, FTC) |

Rules:
- Opt-out wins over everything, including in the middle of a conversation.
- Opt-out scope = that merchant across all HeyBell numbers and channels (one consumer identity per merchant).
- Global "STOPALL" = all merchants on that HeyBell line.
- Never delete opt-out records. Retain at least **10 years** (Virginia).
- Hard-suppress before **every** send in the send pipeline, not only in the bot layer.

### 5.2 Consent record fields (store per consent event, immutable/append-only)

| Field | Notes |
|---|---|
| `consent_id`, `merchant_id`, `campaign/program` | One consent per merchant program (CTIA § 5.1.2.2) |
| `phone_e164`, `channel` (imessage/sms/telegram/whatsapp) | |
| `consent_type` | `conversational` (consumer texted first) / `informational_pec` / `marketing_pewc` |
| `source` | `inbound_keyword` (flow a), `owner_self_entry`, `share_page_form`, `checkout_checkbox`, `keyword_reoptin`, `api` |
| `submitted_by` | `consumer_self` vs `merchant_user:<id>` vs `anonymous_web`. Critical for flow (b) |
| `timestamp_utc` (+ recipient local tz) | |
| `ip_address`, `user_agent`, `page_url`, `referrer`, `session_id` | For web captures (CTIA § 5.1.2) |
| `consent_text_exact` + `consent_text_version_hash` | The exact words shown, including the "not a condition of purchase" line for PEWC |
| `ui_evidence` | Checkbox unchecked by default, checked by user (boolean), button label, screenshot/template ID |
| `name/identifier` of consenter | Name if collected, else session/account ID |
| `inbound_message_raw` + `message_id` | For keyword or inbound opt-ins (the "start <code>" text) |
| `double_optin_confirmed_at` | Timestamp of the YES reply for share-page flow |
| `frequency_disclosed` | e.g. "up to 4 msgs/mo" |
| `revocation` events | `revoked_at`, `raw_text`, `method` (keyword/NL/email/web/call), `processed_at`, `confirmation_sent_at` |
| Retention | At least 5 years after last message (4-year federal SOL plus margin). Opt-outs 10 years |

### 5.3 Flow rules

- **(a) Inbound "start <code>":**
  - Conversational/implied consent for responsive replies.
  - The first reply includes the AI disclosure plus STOP/HELP (5.4).
  - Later **scheduled** follow-ups need express consent. Ask in-thread ("Want me to text you shipping updates? Reply YES") and log it.
- **(b) Owner's own number:** owner checks a consent box in the dashboard. Log `submitted_by=merchant_user` and owner attestation that this is their number.
- **(b) Public share page:**
  - Preferred: replace number entry with an "Open in Messages" button (prefilled `start <code>`).
  - If number entry stays:
    - unticked consent checkbox with the exact disclosure
    - CAPTCHA plus rate limit per IP/number
    - send **one** confirmation request, no other content, then **nothing** unless the user replies YES
    - suppress the number for 30+ days if no reply
    - never allow merchants to bulk-upload numbers through this path
- **(c) Follow-ups:**
  - Informational only by default: order status, "did that solve it?", within 24-72h of the conversation.
  - Promotional follow-ups (discounts, win-back, cart recovery) require a `marketing_pewc` consent record.
  - Enforce quiet hours (9a-8p Mon-Sat, noon-8p Sun, recipient local), skip federal holidays, cap at 3 per 24h, and check suppression.
  - Optionally scrub promotional sends against the national DNC list unless PEWC exists.
- **(d) Prospect outreach:** email only (section 4). Messaging only after the prospect initiates.
- **SMS fallback:** disable it unless traffic is covered by a 10DLC registered campaign. Otherwise, "deliver only if iMessage."

### 5.4 Copy templates (keep each under 300 characters; `[Store]` = merchant brand)

**First message, inbound flow (a), AI disclosure + opt-out:**
> Hi! I'm [Store]'s AI assistant, an automated bot, not a person. I can help with orders, returns and products. Reply HUMAN for our team, HELP for help, STOP to opt out. Msg & data rates may apply.

**Share-page confirmation request, flow (b) (only message until YES):**
> [Store]: Someone asked [Store]'s AI assistant to text this number. Reply YES to start chatting, or STOP to opt out. If this wasn't you, ignore this and you won't hear from us. Automated msg.

**Opt-in confirmation (recurring follow-ups / marketing):**
> [Store] AI assistant: You're signed up for order updates & follow-ups from [Store]. Up to 4 msgs/mo. Reply HELP for help, STOP to cancel. Msg & data rates may apply. Terms: heybell.app/t/[code]

**Opt-out confirmation (send within 5 minutes, no marketing):**
> You've been unsubscribed from [Store] messages and won't receive any more. Reply START to resubscribe.

**HELP response:**
> [Store] AI assistant (automated). For help email [support@store.com] or visit heybell.app/help. Up to 4 msgs/mo. Reply STOP to opt out. Msg & data rates may apply.

**"Are you human?" response:**
> I'm an AI assistant, not a human. Reply HUMAN and someone from [Store] will get back to you.

**Web/checkout PEWC checkbox (unticked by default; for marketing follow-ups):**
> ☐ By checking this box, I agree to receive recurring automated marketing and customer-care text messages (incl. iMessage/SMS) from [Store], sent via HeyBell, at the number provided. Consent is not a condition of purchase. Msg frequency varies (up to 4/mo). Msg & data rates may apply. Reply HELP for help, STOP to cancel. [Terms] [Privacy]

**Informational-only (PEC) checkbox (share page / owner entry):**
> ☐ Text me at this number from [Store]'s AI assistant (an automated bot) about my question or order. Up to 4 msgs/mo. Msg & data rates may apply. Reply STOP to opt out anytime. [Terms] [Privacy]

### 5.5 Other product and contract items

- Merchant Terms/AUP:
  - merchants warrant they have consent for any number they cause us to message
  - no purchased lists
  - indemnity
  - no companion or "pretend to be human" personas
  - no regulated-profession advice without review (Utah)
- The system prompt must forbid the bot from claiming to be human. Run a regression test for "are you a real person?"
- Privacy policy:
  - name LLM subprocessors and Photon
  - state retention
  - state whether conversations train models (default: no)
  - never change this silently (FTC)
- Telegram: the bot can't message first (Telegram bots require the user to start), so this is structurally consumer-initiated. WhatsApp (later): Meta requires opt-in and approved templates outside the 24h window.
- Pre-launch: TCPA counsel review of the flow (b) share page and flow (c) promotional follow-ups. Confirm the Photon contract (who is the "sender," fallback and 10DLC status, indemnity).

---

## Open items to verify

1. Final text and Federal Register publication date of FCC 26-67 (adopted Sept. 30, 2026). The analysis here relies on the Sept. 9 circulated draft.
2. Whether the FCC formally removed the vacated one-to-one rule from the CFR.
3. Exact wording of Cal. Bus. & Prof. Code §§ 17940-17943 (leginfo blocked) and AB 1609 effective date and code section.
4. Utah SB 226 safe-harbor text and codified section numbers.
5. Maryland private right of action, WA CEMA text damages, OK calling hours, TX SB 140 damages and exemption details.
6. EU Digital Omnibus OJ citation, and whether any Art. 50(1) wording changed.
7. Any iMessage-specific TCPA ruling (none found).
8. 2026 CAN-SPAM civil penalty figure.
