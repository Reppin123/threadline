# STATUS — pitch (pitch/)

## Done (verified 2026-10-07)
- [x] pitch/deck.html: self-contained (images inlined, no CDNs), 16:9 1280×720, 12 main slides + 4 appendix. Arrow/Space/Home/End
      navigation, `N` speaker notes (hidden `<aside>` per slide), "Edit text" (contenteditable) with selection toolbar
      (bold/italic/underline/size/color), "Copy HTML" (falls back to download). Palette and type follow apps/web/app/globals.css.
- [x] Real screenshots in pitch/assets/ (landing, wizard, builder, deploy taken from the running app via pitch/scripts/shots.mjs;
      checks.png is the web agent's real e2e screenshot, because the local dev server stopped responding mid-capture).
- [x] pitch/deck.pdf: 16 pages, one slide per page, exported by headless Chrome. Each page rendered to PNG and checked by eye,
      plus an automated layout check in build.mjs (nothing past the slide edge or into the source line): "layout check: ok".
- [x] pitch/SPEAKER_NOTES.md: about 2.5 min talk track.
- [x] Each number is measured in this build or sourced on the slide (Appendix D lists them). Assumptions are labeled on the slide.
      No em dashes in the deck text. No references to the product the hard rule forbids.

## Rebuild
- Edit `pitch/src/deck.src.html`, then `node pitch/scripts/build.mjs` (writes deck.html + deck.pdf and runs the layout check).
- Re-shoot: `EMAIL=<user with a live bot> BOT=<bot id> node pitch/scripts/shots.mjs` (needs web on :3000).

## Needs Aki
- Fill the placeholders: slide 1 (your name and one line about you), slide 12 (the ask), slide 10 footer (StoreLeads plan price).
- Pricing ($0.50/conversation, $99/mo minimum) and the funnel conversion rates are proposals or targets. Confirm or change them.
- iPhone 69% is Counterpoint's figure as reported by TechSpot; Counterpoint's own page shows only the headline.
