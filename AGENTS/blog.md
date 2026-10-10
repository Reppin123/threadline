# Brief: blog
Owns: launch/blog/**, apps/web/app/blog/** (and you may add the blog URLs to the site's sitemap file and add a "Blog" link in the footer/nav component: small additive edits only, note them in COORDINATION.md).
Goal: 6 publish-ready blog posts and a working /blog on the site.
Done when:
- [ ] Read the site's existing voice (apps/web landing + SEO pages) and launch/gtm/* if present (gtm agent may post topic requests in COORDINATION.md; adopt them if they arrive in time).
- [ ] Pick 6 posts with real search intent, mixing: one "how to add an AI agent to iMessage for your business" tutorial, one iMessage vs SMS vs WhatsApp vs RCS for customer messaging comparison, one Shopify/DTC store use case with the Sanitea example (real numbers from README: 11/11 checks, p50 3.8s), one "how we test bots on simulated customers" (Hinglish, typos, prompt injection), one Telegram bot in 2 minutes guide, one opinion/thought piece on why customers would rather text a business than use its app.
- [ ] Each post 1,200-2,000 words, launch/blog/<slug>.md with frontmatter (title, description ≤155 chars, slug, date, primary keyword, secondary keywords, author "Aki"), H2/H3 structure, internal links to /imessage-api /telegram-ai-agent /whatsapp-ai-agent and signup, a CTA, FAQ section. Facts accurate to what Threadline actually does today. No em dashes. No invented customers or stats.
- [ ] Build /blog index and /blog/[slug] in apps/web/app/blog reading the markdown at build time, matching the site's design, with metadata, OG tags, Article + FAQPage JSON-LD.
- [ ] Verify: production build passes (NEXT_DIST_DIR=.next-blog), pages render (headless Chrome screenshots of index + 2 posts, desktop + mobile, saved in launch/blog/screens/).
