# Environment variables (put real values in a local env file that is gitignored; never commit them)

LLM (any one; if none set, core falls back to the local Claude CLI at ~/.local/bin/claude, dev only):
- ANTHROPIC_API_KEY
- OPENAI_API_KEY

Photon Spectrum Cloud (sign up at app.photon.codes) — needed for real cloud iMessage:
- PHOTON_PROJECT_ID
- PHOTON_PROJECT_SECRET
- SPECTRUM_WEBHOOK_SECRET (only if using webhooks)
- IMESSAGE_LINE_HANDLE — the shared line's phone/email shown to users

Gateway:
- GATEWAY_MODE = cloud | local | terminal   (default terminal; local = this Mac's Messages via @spectrum-ts/imessage-local)

Web / auth:
- APP_URL (default http://localhost:3000)
- AUTH_SECRET (session signing; dev default allowed)
- GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (optional Google sign-in)

Shared:
- THREADLINE_DB (default <repo>/data/threadline.db)
