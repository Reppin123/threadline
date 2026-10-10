# Privacy and data protection research: Threadline / HeyBell

Prepared 2026-10-10. This is legal research, not legal advice. Items marked **[UNVERIFIED]** come from a single secondary source, from memory, or could not be confirmed against primary text during research. Confirm them before relying on them. Sources are linked inline and listed at the end of each section.

## 0. Our facts, and how they map to roles

| Data | Whose data | Our role (GDPR / DPDP / CCPA) |
|---|---|---|
| End-user phone numbers, iMessage/Telegram/WhatsApp messages, "memories" (name, address, preferences) | The merchant's customers | **Processor / Data Processor / Service Provider**, acting for the merchant (controller / Data Fiduciary / business) |
| Merchant account data (owner name, email, billing, usage) | Our customers | **Controller / Data Fiduciary / business** |
| Crawled website content | Mostly non-personal (some staff names and emails) | Controller for any incidental personal data |
| Product analytics, abuse logs, model-quality evaluation | Mixed | **Controller** if we use end-user data for our own purposes. Avoid this, or obtain contractual permission for it. |

The single most important design decision: **stay a pure processor for end-user data.** Do not use end-user conversations to train or improve models for other customers, do not build cross-merchant end-user profiles, and do not market to end users. Each of those makes us an independent controller under GDPR (CJEU *Fashion ID* C-40/17 joint-controller logic). Under CCPA, our use would also fall outside the permitted service-provider business purposes (regs §7050).

Sub-processors to list in our DPA: Cloudflare (Containers/SQLite, US/global), Supabase (Storage snapshots; region to confirm), Anthropic (US, LLM inference), Stripe (billing; merchant data only), Telegram/Meta WhatsApp Business/Apple iMessage relay provider (messaging transport), and any email provider.

---

## 1. India: Digital Personal Data Protection Act 2023 (DPDP Act) and DPDP Rules 2025

### 1.1 Status and commencement
- The DPDP Act 2023 received assent on 11 Aug 2023. MeitY notified the **DPDP Rules 2025 on 13 Nov 2025**, published in the Gazette around 13/14 Nov 2025 (sources differ by one day). The Act's commencement notification was issued at the same time. ([Hogan Lovells](https://ca.hoganlovells.com/en/publications/indias-digital-personal-data-protection-act-2023-brought-into-force-), [AZB](https://www.azbpartners.com/bank/update-indias-digital-personal-data-protection-framework-comes-into-effect/), [Storyboard18](https://www.storyboard18.com/digital/breaking-govt-notifies-final-dpdp-rules-sets-staggered-rollout-with-key-obligations-for-data-fiduciaries-84201.htm))
- **The rollout is phased:**
  - **Immediate (13 Nov 2025):** Rules 1, 2 and 17 to 21. This covers the Data Protection Board's constitution and functioning, together with the Act's definitional and Board provisions.
  - **About 12 months (13 Nov 2026):** Rule 4, consent manager registration.
  - **18 months (about 13 May 2027):** Rules 3, 5 to 16, 22 and 23, plus the substantive obligations in the Act. These include notice, consent, security, breach notification, erasure, children, SDF duties, cross-border transfer and data-principal rights. Section 17's exemptions also take effect on this date. ([SCC Online summary](https://www.scconline.com/blog/post/2025/12/26/digital-personal-data-protection-rules-2025-key-highlights/), [MYND DPDP wiki s.17](https://dpdp.myndsolution.com/wiki/act/section-17/))
- **Pending compression [UNVERIFIED as to outcome]:** In Jan-Feb 2026, MeitY consulted on cutting the 18-month window to 12 months, which would make the deadline about 13 Nov 2026. The proposal appears aimed at least at Significant Data Fiduciaries and at making cross-border restrictions immediate. I found no notified amendment as of research date. Check the Gazette and MeitY before relying on May 2027. ([Mondaq/S.S. Rana](https://www.mondaq.com/india/data-protection/1773554/meity-plans-to-cut-short-dpdp-compliance-timeline-and-notify-cross-border-restrictions-for-sdfs), [Storyboard18](https://www.storyboard18.com/amp/digital/meity-seeks-industry-views-on-fast-tracking-dpdp-act-rollout-proposes-12-month-compliance-timeline-88332.htm), [GoTrust](https://www.gotrust.tech/newsletter/meity-may-cut-dpdp-compliance-timeline-from-18-to-12-months))
- **Practical implication:** We should build to DPDP now. If compression happens, Indian merchants will need DPDP-ready processor terms from us within weeks, not months.

### 1.2 Territorial scope (Section 3)
- The Act applies to processing of **digital personal data within India**, whether collected digitally or digitised later (s.3(a)).
- It also applies to processing **outside India** if that processing is connected with offering goods or services to Data Principals in India (s.3(b)).
- Consequence: as an Indian company processing data in India, the Act prima facie covers **all** our processing. That includes US end users' data, because "within India" turns on where the processing happens, and the founder, operations and admin access are in India. The servers are not in India, but the processing is still controlled from India.
- **The Section 17(1)(d) exemption** covers processing of personal data of Data Principals **not within the territory of India**, carried out by a person in India under a **contract with a person outside India**. For that processing, Chapter II (obligations of Data Fiduciary) does not apply, except s.8(1) (overall compliance responsibility) and s.8(5) (reasonable security safeguards). Chapter III (rights of Data Principals) and s.16 (cross-border transfer) also do not apply. ([Consent.in](https://www.consent.in/blog/dpdp-exemptions), [Leegality](https://leegality.com/consent-blog/exemptions), [MYND wiki](https://dpdp.myndsolution.com/wiki/act/section-17-exemptions/index.md))
  - **For us:** Processing US/EU end users' data under our contract with a US Shopify merchant should fall within s.17(1)(d). The residual duty is reasonable security safeguards (and compliance responsibility). The exemption only takes effect with the 18-month tranche, so until then the substantive obligations are not yet in force either.
  - **Caveat [UNVERIFIED interpretation]:** Commentators differ on exactly which provisions survive. Draft our contracts so the foreign merchant is the contracting party, and note in our records that the processing is "pursuant to contract with a person outside India".
- **Indian merchants and Indian end users:** No exemption applies. The merchant is the **Data Fiduciary** and we are its **Data Processor** under s.8(2). A processor may be engaged "only under a valid contract". The fiduciary remains responsible for the processor's compliance.

### 1.3 Data Fiduciary vs Data Processor
- **Data Fiduciary** (s.2(i)): determines the purpose and means of processing. For end-user chats this is the merchant. For account data it is us.
- **Data Processor** (s.2(k)): processes on behalf of a fiduciary. The Act places most obligations on the fiduciary, and the processor is bound mainly through contract. The Rules also extend specific duties to processors:
  - **Rule 6:** reasonable security safeguards, including encryption/obfuscation/masking/tokenisation, access control, logging and monitoring for detecting unauthorised access, backup and continuity, and log retention. The fiduciary must ensure the processor contract includes these.
  - **Rule 8:** processors must follow fiduciary deletion instructions.
  ([SCC Online](https://www.scconline.com/blog/post/2025/12/26/digital-personal-data-protection-rules-2025-key-highlights/))
- **Log retention [UNVERIFIED rule placement]:** Rules 6 and 8 together contemplate **retaining logs and associated personal data for at least one year** for detection and investigation. Some summaries place this in Rule 8, others in Rule 6. This conflicts somewhat with short chat-retention defaults. Our solution is to keep access and processing **logs** for one year while purging message **content** sooner (see section 5).

### 1.4 Notice and consent (ss.5-6, Rule 3)
- Consent must be **free, specific, informed, unconditional, unambiguous, with clear affirmative action**, and limited to necessary data (s.6(1)). Withdrawal must be as easy as giving consent (s.6(4)).
- **Notice under Rule 3** must be:
  - standalone and understandable independently of other information;
  - in clear, plain language;
  - an itemised description of the personal data and the specific purposes;
  - a link to withdraw consent, exercise rights and complain to the Board.
  The Act also requires that notice be available in English or any Eighth Schedule language on request (s.5(3)).
- "Legitimate uses" (s.7) allow processing without consent in limited cases. One example is where the person voluntarily provided the data for a specified purpose and has not objected (s.7(a)). That may cover a customer who texts a merchant's bot with an order question **[UNVERIFIED application]**. It will not cover marketing or "memories" kept for personalisation.
- **Product implication:** For Indian merchants, the bot's first reply to a new end user should include a short notice and a link: "This is <Store>'s AI assistant. We store your number and messages to help with your orders; see <link> / reply STOP to delete". The merchant (fiduciary) must own the notice, and we supply the mechanism.
- **Consent Managers** (Rule 4, from Nov 2026) are optional registered intermediaries. They are not relevant to us now.

### 1.5 Breach notification (s.8(6), Rule 7)
- **To each affected Data Principal:** without delay, in plain language, covering the nature, extent, timing and location of the breach, likely consequences, mitigation, safety steps they can take, and a contact.
- **To the Board:** an **initial intimation without delay**. Then a **detailed report within 72 hours** of becoming aware, or a longer period if the Board allows. The report covers the facts, circumstances and reasons, mitigation, findings about the person who caused the breach, remedial measures, and notifications made. ([Storyboard18](https://www.storyboard18.com/digital/breaking-govt-notifies-final-dpdp-rules-sets-staggered-rollout-with-key-obligations-for-data-fiduciaries-84201.htm), [SCC Online](https://www.scconline.com/blog/post/2025/12/26/digital-personal-data-protection-rules-2025-key-highlights/))
- Unlike GDPR there is **no "risk" threshold**. Every personal data breach is notifiable.
- **As processor:** We must notify the merchant immediately so it can meet these deadlines. Our DPA should promise notice **within 24 hours** of awareness.
- **CERT-In (separate regime):** CERT-In Directions of 28 Apr 2022 under IT Act s.70B require reporting specified cyber incidents **within 6 hours**. They also require **logs kept for 180 days in India** **[UNVERIFIED as to current text; confirm]**. This applies to "service providers, intermediaries, data centres, body corporates". We are a body corporate if we incorporate in India.

### 1.6 Erasure and retention (s.8(7), Rule 8)
- Delete personal data when the Data Principal withdraws consent or when the purpose is no longer served, whichever is earlier, unless law requires retention. The fiduciary must also make its processor delete.
- Rule 8 and the Third Schedule set **deemed-purpose-expiry periods** of **3 years of inactivity** for large e-commerce (2 crore+ registered users), online gaming and social media intermediaries. A **48-hour pre-erasure notice** to the user is required in those cases **[UNVERIFIED that the Third Schedule is limited to these classes; SCC summary mentions the 48-hour notice]**. Our merchants are far below these thresholds, but the general purpose-limitation duty still applies.

### 1.7 Significant Data Fiduciary (s.10, Rule 13)
- The Central Government notifies SDFs based on volume and sensitivity of data, risk to rights, sovereignty and security, and electoral democracy.
- SDF duties: an India-based DPO, an independent data auditor, an annual DPIA and audit, algorithmic due diligence, and possible data-localisation restrictions on specified data.
- **Not relevant to a seed-stage startup.** No SDF notification lists have been issued against small SaaS companies.

### 1.8 Cross-border transfer (s.16, Rule 15)
- **Negative-list approach:** transfer is permitted except to countries the Central Government restricts by notification (s.16(1)). Rule 15 lets the government impose requirements on transfers.
- Sectoral laws with stricter localisation still prevail (s.16(2)), for example RBI payment-data localisation.
- **As of research, no negative list has been notified [UNVERIFIED as of Oct 2026; check].** Sending Indian end users' data to Cloudflare, Supabase or Anthropic in the US is therefore currently permitted.

### 1.8a Children (s.9, Rule 10)
- A "child" is under **18**. Processing a child's data requires **verifiable parental consent**, and tracking, behavioural monitoring and targeted advertising directed at children are prohibited.
- Rule 10 permits verification via existing reliable identity details, voluntary tokens and DigiLocker. Exemptions in the Fourth Schedule cover classes like healthcare and education.
- **For us:** Our bots are not directed at children, but shoppers may be minors. The terms should say services are not directed at under-18s in India. The bot should stop storing "memories" if a user self-identifies as a minor.

### 1.9 Penalties (s.33, Schedule)
| Breach | Maximum penalty |
|---|---|
| Failure to take reasonable security safeguards (s.8(5)) | **INR 250 crore** (about USD 30M) |
| Failure to notify a breach to the Board or Data Principals (s.8(6)) | INR 200 crore |
| Breach of children's obligations (s.9) | INR 200 crore |
| SDF additional obligations (s.10) | INR 150 crore |
| Data Principal duties (s.15) | INR 10,000 |
| Residual (any other provision) | INR 50 crore |

Penalties are imposed by the Data Protection Board after inquiry. Factors include nature, gravity, duration, mitigation, and proportionality (s.33(2)). There is no criminal liability and no private right to compensation under the DPDP Act itself.

**Also note:** Section 43A of the IT Act (compensation for negligent handling of sensitive personal data) and the SPDI Rules 2011 are **repealed or omitted** when the DPDP Act's relevant provisions commence (s.44(2)). Until then, the SPDI Rules 2011 still apply to an Indian body corporate. They require a privacy policy, consent for sensitive personal data, and "reasonable security practices" such as ISO 27001 or equivalent. **[Confirm s.44 commencement date; likely the 18-month tranche.]**

---

## 2. GDPR (EU) and UK GDPR

### 2.1 Does GDPR apply to us?
- **Art 3(1), establishment:** No. We have no EU or UK establishment.
- **Art 3(2), targeting or monitoring:** GDPR applies to a non-EU controller or processor processing data of people in the EU in connection with (a) offering goods or services to them or (b) monitoring their behaviour in the EU.
  - If we sign **EU or UK merchants**, we offer services to EU businesses. Sole traders' data is personal data, and the merchant's end users are EU residents. EDPB Guidelines 3/2018 on territorial scope say a non-EU processor is caught by Art 3(2) where its processing "relates to" the controller's targeting activities.
  - If we only have **US merchants** whose occasional shoppers are in the EU, the merchant's own targeting is what matters. Exposure exists but is low.
- **Conclusion:** GDPR becomes a real obligation once we deliberately market to or sign EU/UK merchants. Before that, a GDPR-grade DPA is still a commercial expectation, because US Shopify merchants with EU shoppers will ask for one.

### 2.2 Controller vs processor for a B2B chatbot platform
- **The merchant is the controller.** It decides to deploy a bot to answer its customers, and it decides purposes such as support, order lookup and marketing opt-in.
- **We are the processor** while we process only on documented instructions (Art 4(8), Art 28). EDPB Guidelines 07/2020 on controller and processor concepts allow a processor to choose "non-essential means" (tech stack, hosting, LLM vendor) without becoming a controller.
- **Risk points that would make us a controller or joint controller:**
  1. Using conversations to train or tune models or prompts across customers.
  2. A cross-merchant "memory" of the same phone number. Never share memories across merchants, and key them per merchant.
  3. Our own marketing to end users.
  4. Analytics benchmarking that uses end-user data for our own purposes.
  If we want (1) or (4), use aggregated or anonymised data only, or obtain explicit contractual authorisation and accept controller status for that slice.
- **Anthropic, Cloudflare and Supabase** are our **sub-processors**. Under Art 28(2) we need the controller's prior general written authorisation and must give notice of changes with a right to object.

### 2.3 Article 28 DPA mandatory contents (Art 28(3))
The DPA must set out:
- the subject matter and duration;
- the nature and purpose of processing;
- the types of personal data and categories of data subjects;
- the controller's obligations and rights.

The processor must:
- (a) process only on documented instructions, including for international transfers, unless law requires otherwise;
- (b) ensure confidentiality commitments from personnel;
- (c) take all Art 32 security measures;
- (d) respect the Art 28(2) and (4) conditions for engaging sub-processors, flowing down the same obligations;
- (e) assist with data-subject rights requests;
- (f) assist with Arts 32-36 (security, breach notification, DPIA, prior consultation);
- (g) delete or return all personal data at the end of services, at the controller's choice;
- (h) make available all information needed to demonstrate compliance, and allow and contribute to audits and inspections;
- tell the controller immediately if an instruction infringes GDPR.

Add, as market practice:
- a list of sub-processors and a change-notification mechanism (usually 30 days' notice and a right to object or terminate);
- a security annex (Annex II of the SCCs);
- breach notice to the controller "without undue delay", committed as within 24-48 hours;
- SCCs or the UK Addendum incorporated by reference;
- liability caps.

The Commission's Art 28(7) standard contractual clauses (Decision 2021/915) can be used as-is.

### 2.4 Article 27 EU/UK representative
- **Obligation:** A non-EU controller **or processor** subject to Art 3(2) must designate in writing a representative in a member state where the data subjects are (Art 27(1), (3)).
- **Exemption (Art 27(2)):** processing that is **occasional**, does not include large-scale special-category or criminal data, and is unlikely to result in a risk. Our processing would be continuous once EU merchants are live, so the exemption is unlikely to apply.
- **UK GDPR Art 27:** a parallel UK representative requirement. It was proposed for deletion in the abandoned DPDI Bill. **I believe it was retained in the Data (Use and Access) Act 2025 [UNVERIFIED; check consolidated UK GDPR on legislation.gov.uk].** ([BCLP](https://bclplaw.com/en-US/insights/the-data-and-brexit-digest-data-protection-representatives.html))
- **Typical cost:**
  - **VeraSafe:** EU representative **USD 2,700/year** for revenue up to $25M, single entity. The UK representative is a custom quote. ([VeraSafe](https://www.verasafe.com/eu-representative/))
  - **Prighter:** EU GDPR representative plans from roughly **€420-€852/year** (small/growth) and €2,040/year (medium), excluding VAT. Bundles get up to 40% off, and Prighter also sells a UK representative. ([Prighter EU](https://prighter.com/privacy-representation/eu-gdpr.md), [Prighter pricing](https://prighter.com/ja/pricing)) **[Tier names and prices UNVERIFIED; the listing looked inconsistent]**
  - **DataRep:** no public pricing found. Historically quoted around €1,000-€2,000/year for small companies **[UNVERIFIED]**.
  - **Budget:** **€500-€3,000/year each for EU and UK**, from the point we sign EU/UK merchants.
- **Fines for failing to appoint:** up to €10M or 2% of turnover (Art 83(4)). Real-world enforcement includes the Dutch AP's €525,000 fine on Locatefamily.com in 2021.

### 2.5 International transfers
Our flows run from an EU controller (the merchant) to us (India, or US if we incorporate there) and then to US sub-processors.

**EU SCCs (Commission Implementing Decision 2021/914):**
- Use **Module 2** (controller to processor) if we are the importer from an EU merchant.
- Use **Module 3** (processor to processor) for our onward transfers to Anthropic, Cloudflare and others. Those vendors already offer SCCs in their DPAs.
- A **Transfer Impact Assessment (TIA)** is required under *Schrems II*, C-311/18. For India, a TIA should address government access under the IT Act s.69 and the DPDP s.36 power to call for information **[analysis required]**.
- The Commission had been preparing **additional SCCs for importers already subject to GDPR under Art 3(2)** **[status UNVERIFIED as of Oct 2026]**.

**UK:**
- Use the **UK IDTA** or the **UK Addendum** to the EU SCCs, in force since 21 Mar 2022 under DPA 2018 s.119A.
- Transfers to the US can use the **UK Extension ("UK-US Data Bridge")** to the DPF, in effect since 12 Oct 2023, for DPF-certified recipients.

**EU-US Data Privacy Framework (DPF):**
- Adequacy decision of 10 Jul 2023.
- On **3 Sep 2025 the EU General Court dismissed Latombe's annulment action (T-553/23)** and upheld the DPF. It found the Data Protection Review Court sufficiently independent and accepted ex post review of bulk collection.
- **Latombe appealed to the CJEU on 31 Oct 2025 (C-703/25 P)**. The appeal was pending as of last available reports. **[Check curia.europa.eu for any judgment in 2026.]**
- noyb (Schrems) has also signalled further challenges.
([FKKS](https://technologylaw.fkks.com/post/102l2zs/eu-general-court-upholds-eu-u-s-data-privacy-framework), [Digital Policy Alert](https://digitalpolicyalert.org/event/35459-latombe-filed-appeal-against-general-court-dismissal-of-challenge-to-european-unionunited-states-data-protection-framework-adequacy-decision-in-latombe-v-commission), [Bloomberg Law](https://news.bgov.com/bloomberg-law-analysis/analysis-12))

**What the DPF means for us:**
- Anthropic, Cloudflare, Stripe and Supabase's US entities are generally DPF-certified **[verify each on dataprivacyframework.gov]**. Rely on DPF plus SCCs as a fallback in vendor DPAs.
- If we become a Delaware company, we could self-certify to the DPF. The cost is the ITA annual fee, tiered by revenue (about $250+ at low revenue **[UNVERIFIED]**), plus an independent recourse mechanism. Indian companies cannot certify.
- **India has no EU adequacy decision.** EU-to-India transfers need SCCs.

### 2.6 Records of processing (Art 30)
- Processors must keep a record of: the categories of processing carried out for each controller, the controller's details, transfers and safeguards, and a general description of security measures (Art 30(2)).
- The Art 30(5) exemption for organisations under 250 employees does **not** apply where processing is "not occasional", which ours is. **Keep an Art 30 record.** A one-page spreadsheet is enough.

### 2.7 DPIA (Art 35)
- A DPIA is the **controller's** duty. We must assist (Art 28(3)(f)).
- The EDPB/WP29 criteria (WP248) that a merchant might tick:
  - innovative technology (LLMs; regulators frequently cite AI chatbots);
  - systematic processing of communications;
  - possibly vulnerable data subjects.
  Two or more criteria generally means a DPIA is needed.
- **Recommendation:** Publish a "DPIA support pack" for merchants. It should describe the data flows, LLM vendor, retention, security, the absence of training on customer data, and our human-in-the-loop handoff. This is also a strong sales asset.

### 2.8 Breach notification (Arts 33-34)
- **The controller** notifies the supervisory authority within **72 hours** of awareness, unless the breach is unlikely to result in risk. It notifies data subjects without undue delay if there is high risk.
- **We as processor** must notify the controller "without undue delay" after becoming aware (Art 33(2)). Commit to 24-48 hours in the DPA.
- **Maintain a breach register** (Art 33(5)).

### 2.9 UK ICO data protection fee
- Under the Data Protection (Charges and Information) Regulations 2018, as amended by the 2025 Amendment Regulations, the fee rose from **17 Feb 2025** (one source says 1 Feb):
  - **Tier 1 (micro):** £40 to **£52**;
  - **Tier 2:** £60 to £78;
  - **Tier 3:** £2,900 to about £3,763.
  - Direct debit saves £5, so Tier 1 is **£47** by direct debit.
  ([Lewis Silkin](https://www.lewissilkin.com/insights/2025/02/06/fee-payable-to-the-ico-to-increase-in-february-102jzb9), [Acuity Law](https://acuitylaw.com/rise-in-ico-fees-data-protection-fees-february/), [gov.uk response](https://www.gov.uk/government/consultations/data-protection-fee-regime-proposed-changes/outcome/data-protection-fee-regime-government-response))
- **Who must pay:** The fee is payable by **controllers**. Pure processing on behalf of others does not itself trigger a fee, but we are a controller for our own merchant account data.
- **Overseas organisations:** Whether a non-UK controller subject only to UK GDPR Art 3(2) must pay is **unclear [UNVERIFIED]**. The ICO page does not address it.
- **Recommendation:** Pay **£52 (Tier 1)** once we sign UK merchants. It is cheap insurance, and the ICO's fee checker is quick.

### 2.10 EU AI Act touchpoints (privacy-adjacent)
- **Art 50(1)** (from **2 Aug 2026**): providers of AI systems that interact directly with natural persons must design them so people are informed they are interacting with an AI, unless obvious.
- We are the **provider** of the bot system and the merchant is the **deployer**.
- **Default every bot to disclose "AI assistant"** in its first message. The Nov 2025 "Digital Omnibus" proposals mainly delay high-risk obligations **[UNVERIFIED whether Art 50 timing changed]**.
- **US analogues:**
  - California **Bot Disclosure Law** (Cal. Bus. & Prof. Code §17940-17943, SB 1001): disclose a bot used to incentivise a sale.
  - Utah's AI Policy Act (disclosure on request, and proactively for regulated occupations).

---

## 3. California CCPA/CPRA and other US state laws

### 3.1 Applicability thresholds (Cal. Civ. Code §1798.140(d))
A "business" is a for-profit entity doing business in California that meets one of:
- (A) annual gross revenue above the inflation-adjusted threshold: **USD 26,625,000**, CPPA adjustment effective 1 Jan 2025. The next biennial adjustment is expected Jan 2027, so **$26.625M applies for 2026**;
- (B) buys, sells or shares personal information of **100,000+** consumers or households;
- (C) derives **50%+** of revenue from selling or sharing personal information.
([Fieldguide](https://www.fieldguide.io/resource-articles/ccpa-compliance-guide-audit-practitioners), [Morgan Lewis](https://www.morganlewis.com/pubs/2025/08/cppa-board-finalizes-new-rules-on-admt-cybersecurity-audits-and-risk-assessments))

**We are not a "business" under CCPA today.** Many of our larger merchants may be. When processing for them we are a **service provider**, and we must sign compliant contracts because the merchant legally needs them.

### 3.2 Service provider contract requirements
**Statute, §1798.140(ag)(1).** A service provider processes personal information on behalf of a business under a written contract that prohibits it from:
- (A) selling or sharing the personal information;
- (B) retaining, using or disclosing it for any purpose (including commercial) other than the business purposes in the contract;
- (C) retaining, using or disclosing it outside the direct business relationship;
- (D) combining it with personal information from other sources or its own interactions, except as permitted by regulation.
The contract may also permit the business to monitor compliance (audits, scans, at least once every 12 months).

**Regulations, 11 CCR §7051(a).** The contract must:
1. prohibit selling or sharing;
2. identify the **specific business purpose(s)**. Generic "for any purpose" or "as needed to provide services" is not enough;
3. prohibit use or retention outside the specified purposes and the direct relationship;
4. prohibit combining, subject to §7050(a);
5. require compliance with the CCPA and the **same level of privacy protection**;
6. grant the business rights to take reasonable and appropriate steps to ensure use consistent with CCPA obligations;
7. require the service provider to **notify** the business if it can no longer meet its obligations;
8. grant rights to **stop and remediate** unauthorised use;
9. require enabling and cooperation with consumer requests;
10. flow down to subcontractors (§7051(a)(10)).

A missing contract means the provider is not a "service provider", and disclosures to it may be treated as a "sale" or "sharing" (§7051(c)).

**Permitted internal uses (11 CCR §7050(a)).** Use to build or improve the quality of our services is permitted, **provided we do not use the personal information to perform services for another business or to build profiles** about the consumer.
- This supports narrowly scoped model or prompt quality work.
- It does **not** support cross-merchant training that benefits other customers' bots, a cross-merchant "memory", or using a consumer's data to serve another merchant.

**Deletion.** Service providers must cooperate with deletion requests passed through by the business (§1798.105(c)(3)).

### 3.3 2026 regulations: ADMT, risk assessments, cybersecurity audits
OAL approved the CPPA's package on **23 Sep 2025**, effective **1 Jan 2026**. ([Hunton](https://www.hunton.com/privacy-and-cybersecurity-law-blog/newly-approved-ccpa-regulations-have-staggered-deadlines-for-compliance), [Sheppard](https://www.sheppard.com/insights/blogs/california-privacy-regulations-on-admt-cybersecurity-audits-and-risk-assessments-receive-final-approval), [Alston](https://www.alstonprivacy.com/california-finalizes-new-and-amended-ccpa-regulations/))

| Regulation | Requirement | Relevance to us |
|---|---|---|
| **ADMT** | Pre-use notice, opt-out and access rights where ADMT is used to make a **"significant decision"** (financial/lending, housing, education, employment, healthcare). Compliance from **1 Jan 2027**. | A support bot answering product and order questions is **not** a significant decision. Do not let bots make credit or eligibility decisions (e.g., financing approval) without legal review. |
| **Risk assessments** | Required for processing presenting "significant risk": selling or sharing, sensitive PI, ADMT for significant decisions, certain training uses, and others. Assessments from 1 Jan 2026; attestations for 2026-27 due by **1 Apr 2028**. | The obligation falls on **businesses** (our larger merchants). If they process precise geolocation or sensitive PI through us, they may ask us for input, and the regs require service providers to cooperate. Our DPIA support pack covers this. |
| **Cybersecurity audits** | Independent annual audits for businesses with "significant risk" (50%+ revenue from selling or sharing; or above the revenue threshold **and** 250,000+ consumers or 50,000+ sensitive). First certifications due 1 Apr 2028 (>$100M revenue), 2029 ($50-100M) and 2030 (<$50M). | Not us directly. Large merchants may push audit requirements, including SOC 2-style evidence, down to vendors. |

### 3.4 Other US state comprehensive privacy laws (B2B processor view)
- About 19-20 states have comprehensive laws in force or taking effect by 2026:
  - **Earlier:** VA, CO, CT, UT, TX, OR, MT, IA, DE, NH, NJ, NE.
  - **2025:** TN, MN, MD.
  - **1 Jan 2026:** IN, KY, RI.
  ([NCSL / IAPP tracker; individual effective dates UNVERIFIED in this pass])
- **Processor contract terms (Virginia model, Va. Code §59.1-579; copied in most states).** The contract must:
  - set processing instructions, nature and purpose, data types, duration, and the rights of both parties;
  - impose a duty of confidentiality;
  - require deletion or return at the end of services;
  - require the processor to make available information demonstrating compliance;
  - allow and cooperate with reasonable assessments or audits, or provide an independent audit report;
  - flow obligations down to subcontractors under written contract, with an opportunity to object.
  - Colorado (CPA rules 6.10) and Oregon add some specifics.
- **Thresholds** are typically 100,000 consumers per state (lower in some states, e.g. DE/NH 35k, MD 35k, RI 35k) or 25k+ with sale revenue.
  - **Texas and Nebraska** use "not a small business" (SBA definition) rather than consumer counts.
  - We will rarely be a "controller" under these laws, but **merchants will need our processor terms.**
- **Practical approach:** One **US State Privacy Addendum** covering CCPA service-provider terms plus the "processor" terms of all state laws. This is now standard. Combine it with the GDPR DPA into a single global DPA with jurisdiction-specific schedules.
- **Sector and other laws to note:**
  - **TCPA**: outbound SMS or iMessage marketing needs prior express written consent. This is critical if bots ever initiate messages.
  - **COPPA**: under-13s.
  - **Washington My Health My Data Act** (2023): if merchants sell health or wellness products and the bot collects "consumer health data", for example "what's your skin condition". It has a private right of action, and its applicability to **processors** includes direct obligations.
  - **State breach notification laws** (all 50 states). The service provider must notify the data owner, usually "immediately" or within a fixed number of days.

---

## 4. Contracts and documents we need (checklist)
1. **Global DPA** (GDPR Art 28 + UK + CCPA §7051 + US state processor terms + DPDP s.8(2)), with SCC Module 2/3 and the UK Addendum incorporated, and a security annex and sub-processor list.
2. **Public sub-processor page** with a 30-day change notice.
3. **Privacy policy** (our controller role: merchant accounts, website visitors) plus a **template end-user notice** that merchants can link from bots.
4. **Art 30 record**, **breach register**, **TIA** (EU to India/US), and **DPIA support pack**.
5. **Vendor DPAs** signed or accepted: Anthropic (commercial terms + DPA; confirm no training on API data and the retention period), Cloudflare, Supabase, Stripe, messaging providers.
6. **EU/UK representative** and **ICO fee**, triggered when we sign EU or UK merchants.

---

## 5. Retention and deletion best practice for chat logs

**Legal anchors:**
- **GDPR**: Art 5(1)(c) data minimisation and Art 5(1)(e) storage limitation; Art 17 erasure; Art 28(3)(g) deletion at contract end.
- **CCPA**: §1798.100(a)(3), the business must disclose retention periods per category and not retain longer than reasonably necessary.
- **DPDP**: s.8(7) erasure when purpose ends; Rule 8 log-retention minimum.
- **FTC**: enforcement on over-retention, e.g. *US v. Amazon (Alexa)*, 2023, **$25M** civil penalty for retaining children's voice recordings and failing to honour deletion.

**Recommended defaults** (merchant-configurable within bounds):

| Data class | Default retention | Notes |
|---|---|---|
| Raw message content (end user and bot) | **90 days rolling**, configurable 30-365 days | Enough for order-support continuity and dispute review. |
| "Memories" (name, address, preferences) | Until the end user deletes ("forget me" or STOP), or **12 months of inactivity**, or contract end | Show the user what is remembered on request; never share across merchants. |
| Phone number / chat ID mapping | Same as memories; tombstone (hash) after deletion to honour opt-outs | Keep a hashed suppression list so a deleted user is not re-contacted. |
| Access and security logs (metadata, no content) | **1 year** | Aligns with DPDP Rule 6/8 and good security practice. Mind the CERT-In 180-day in-India log rule if incorporated in India **[verify]**. |
| LLM vendor logs | Use the vendor's minimum, or zero-data-retention where available | Anthropic API commercial default retention and ZDR availability **[verify current Anthropic terms]**. |
| Backups / Supabase snapshots | **Rolling 30-35 days**, encrypted | A deletion in production must propagate as backups age out. Document "deleted from backups within 35 days". |
| Merchant account and billing data | Life of account + **7-8 years** for invoices and tax records | Indian Companies Act s.128 (8 years for books); IRS (generally 3-7 years). |
| Crawled site content | Until the merchant deletes the bot, or 30 days after contract end | Not personal data in most cases. |

**At contract termination:** Export on request within 30 days, then delete production data within 30 days and backups within a further 35 days. Issue a deletion certificate on request.

**Engineering requirements:**
- per-merchant data isolation;
- a hard-delete API, covering SQLite rows, Supabase objects and any vector or embedding store;
- an end-user self-service "delete my data" command;
- a scheduled purge job with audit logging;
- redaction of payment card numbers and government IDs from transcripts on ingest (PCI DSS scope avoidance);
- sensitive-data detection with a "do not memorise" rule for health, financial and ID data.

---

## 6. Prioritised actions
1. **Now:**
   - Publish the global DPA, privacy policy and sub-processor list.
   - Default retention to 90 days with a purge job; add the "forget me" command; add AI disclosure in the first message.
   - Contractually commit to "no training on customer data".
2. **Before the first EU/UK merchant:** Appoint an EU and UK representative (about €1-3k/yr each), pay the ICO fee (£52), and complete the TIA for EU to India/US.
3. **Before May 2027, or Nov 2026 if MeitY compresses the timeline:**
   - Add DPDP notice and consent flows for Indian merchants.
   - Set up a breach runbook covering Board notice in 72h, merchant notice in 24h, and CERT-In in 6h.
   - Name a grievance and contact officer on the website (Rule 9).
4. **Ongoing:** Monitor the CJEU Latombe appeal (C-703/25 P), the DPDP negative list, the MeitY compression, and the CCPA 2027 threshold adjustment.
