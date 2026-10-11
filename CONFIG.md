# Environment variables (put real values in a local env file that is gitignored; never commit them)

LLM (any one; if none set, core falls back to the local Claude CLI at ~/.local/bin/claude, dev only):
- ANTHROPIC_API_KEY
- OPENAI_API_KEY
- DEEPSEEK_API_KEY, KIMI_API_KEY (or MOONSHOT_API_KEY), GLM_API_KEY (or ZHIPU_API_KEY) — optional cheap providers, see "Model providers"

Model providers (packages/core/src/llm.ts; all callers of `complete()` follow it):
- THREADLINE_PROVIDER = anthropic | openai | deepseek | kimi | glm | cli | offline. Unset = key-based default
  (ANTHROPIC_API_KEY → OPENAI_API_KEY → local CLI → offline), so nothing changes unless you set it.
  THREADLINE_LLM=offline (tests) always wins; THREADLINE_LLM is still honoured when THREADLINE_PROVIDER is unset.
- Models per provider (smart / fast tier): THREADLINE_<P>_MODEL / THREADLINE_<P>_FAST_MODEL for P in OPENAI, DEEPSEEK, KIMI, GLM
  (defaults gpt-4.1/gpt-4.1-mini, deepseek-chat, kimi-k2-0905-preview, glm-4.6 / glm-4.5-air). Anthropic keeps THREADLINE_MODEL / THREADLINE_FAST_MODEL.
- THREADLINE_<P>_BASE_URL overrides the endpoint (defaults: api.deepseek.com/v1, api.moonshot.ai/v1, api.z.ai/api/paas/v4 — use
  https://open.bigmodel.cn/api/paas/v4 for mainland Zhipu keys, https://api.moonshot.cn/v1 for mainland Moonshot keys).
- THREADLINE_GLM_THINKING=1 re-enables GLM's reasoning mode (off by default: slower and billed as output).
- Compare providers on cost / latency / tool calling: `pnpm --filter @threadline/core shootout -- --providers=anthropic,deepseek,kimi,glm`

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
