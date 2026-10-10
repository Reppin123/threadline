# Brief: legal (and compliance)
Owns: launch/legal/**
Goal: know every legal/policy risk before launch and have the documents drafted. Not legal advice; flag what needs a lawyer.
Done when:
- [ ] launch/legal/RISKS.md: Apple's rules on automated iMessage (Messages for Business / Apple Business Register vs Photon's approach), account-ban risk and mitigations; Photon Spectrum ToS limits; Telegram Bot ToS; WhatsApp Business Platform policy; US TCPA/CTIA opt-in and STOP handling, India DPDP Act 2023, GDPR/UK GDPR, CCPA; AI disclosure laws (e.g. California bot disclosure SB 1001, EU AI Act transparency); scraping customer websites (robots, ToS); Anthropic usage policy. Each: what it requires, our current state (read the code: gateway stop handling, invite flow, crawler), gap, fix.
- [ ] launch/legal/ENTITY.md: entity/incorporation options for Aki (India Pvt Ltd vs Delaware C-Corp via Stripe Atlas etc.), costs, bank/Stripe implications, recommendation.
- [ ] Drafts: launch/legal/TERMS.md, PRIVACY.md, DPA.md, ACCEPTABLE-USE.md, SUBPROCESSORS.md (Anthropic, Photon, Cloudflare, Supabase, Stripe, Resend, Telegram) using the pricing in COORDINATION.md/launch/billing if present. Compare with existing apps/web privacy/terms pages and list required changes (do NOT edit apps/web; post the diff request in COORDINATION.md).
- [ ] Product compliance fixes needed in code → precise list in COORDINATION.md addressed to the owning area (STOP/HELP keywords, opt-in record, AI disclosure in first message, data deletion endpoint).
- [ ] Lawyer-needed items + filing costs → launch/NEEDS-AKI.md.
