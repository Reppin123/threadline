# STATUS: blog

## Plan (Definition of Done)
- [x] 1. Read site voice (landing, /imessage-api etc.) + launch/gtm (empty at start, no gtm topic requests in COORDINATION.md yet)
- [x] 2. Pick 6 posts with search intent (launch/blog/README.md: slugs, keywords, rationale)
- [x] 3. Write 6 posts, 1,200-2,000 words each, frontmatter, FAQ, CTA, internal links, no em dashes (verified by script)
- [x] 4. /blog index + /blog/[slug] (markdown at build time, site design, metadata, OG, Article + FAQPage JSON-LD), sitemap + footer link
- [x] 5. Production build (NEXT_DIST_DIR=.next-blog) passes; screenshots index + 2 posts desktop + mobile in launch/blog/screens/

## Log
- Posts: launch/blog/*.md (6), 1,377-1,927 words each, descriptions 149-155 chars, 0 em dashes, all link /imessage-api /telegram-ai-agent /whatsapp-ai-agent /signup (script-checked).
- Facts sourced from README, AGENTS/core-e2e-checks.md, packages/core/src/checks.ts, apps/gateway/src/telegram.ts, site pricing; external stats cited with URLs.
- Site: apps/web/app/blog (layout, blog.css, _lib/markdown.ts own renderer, no new deps, _lib/posts.ts, page.tsx, [slug]/page.tsx, [slug]/opengraph-image.tsx).
- Verified: NEXT_DIST_DIR=.next-blog production build passes (6 SSG posts + 6 OG images); next start → /blog 200, posts 200, unknown slug 404,
  OG image 200, sitemap lists 7 blog URLs; Article/FAQPage/BreadcrumbList JSON-LD present; no horizontal overflow at 390px.
- Screenshots: launch/blog/screens/ (index, DTC post, testing post; desktop + mobile; plus FAQ and table views).

## Summary
Done. Key decisions: posts stay as markdown in launch/blog (single source, rebuilt into static pages); own tiny markdown renderer to avoid touching the lockfile;
Sanitea framed as a public benchmark, not a customer; README numbers (11/11, p50 3.8s) used with the later 5.7s/17.6s run disclosed for honesty.
Nothing for NEEDS-AKI: publishing happens with the next deploy. Suggest Aki reviews the "Aki" byline voice before deploying.
