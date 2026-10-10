# Brief: domain
Owns: launch/domain/**
Goal: get Threadline a great home on the web.
Done when:
- [ ] Check availability of threadline.com, .ai, .app, .so, .co, .io, .chat, getthreadline.com, threadline.chat, usethreadline.com, trythreadline.com, threadlinehq.com etc. via RDAP/whois (curl rdap.org / registry RDAP, `whois`) AND a registrar price check (Cloudflare Registrar, Porkbun, Namecheap pages). Note premium/aftermarket listings and asking prices.
- [ ] Check name conflicts: existing companies/products called Threadline (esp. messaging/SaaS), USPTO trademark search (tmsearch.uspto.gov) and app stores. Rate trademark risk.
- [ ] If the good options are taken or risky, generate 25+ alternative names fitting "your app, on iMessage / text your business like a friend", check each's .com/.ai/.app availability, and shortlist the top 8 with reasons.
- [ ] launch/domain/REPORT.md: table (name, domain, available?, price/yr, premium?, trademark risk, notes), top 3 recommendation with a clear #1, plus handles availability (X, Instagram, LinkedIn page, GitHub org) for the top 3.
- [ ] launch/domain/CUTOVER.md: exact steps to buy on Cloudflare Registrar, point at the Cloudflare Worker (custom domain route), set APP_URL, email DNS (SPF, DKIM, DMARC for Resend/Google Workspace), www redirect.
- [ ] Post the chosen domain to COORDINATION.md for the production, gtm and blog agents. Purchase goes to launch/NEEDS-AKI.md.
