#!/bin/bash
# Deploy Threadline to Cloudflare Containers. Keys come from macOS Keychain and are piped straight into wrangler (never printed).
set -e
export PATH=/opt/homebrew/bin:/usr/local/bin:/Applications/Docker.app/Contents/Resources/bin:$PATH
cd "$(dirname "$0")"
echo "== install"; npm install --no-audit --no-fund --loglevel=error
echo "== deploy (docker build + push, several minutes)"; npx wrangler deploy 2>&1 | tee /tmp/threadline-cf-deploy.log
kc() { security find-generic-password -s "$1" -a "$2" -w; }
echo "== secrets"
kc "Threadline Anthropic" ANTHROPIC_API_KEY | npx wrangler secret put ANTHROPIC_API_KEY >/dev/null && echo "set anthropic"
kc "Threadline Spectrum" SPECTRUM_PROJECT_ID | npx wrangler secret put SPECTRUM_PROJECT_ID >/dev/null && echo "set spectrum id"
kc "Threadline Spectrum" SPECTRUM_PROJECT_SECRET | npx wrangler secret put SPECTRUM_PROJECT_SECRET >/dev/null && echo "set spectrum secret"
kc "Threadline Supabase" SUPABASE_URL | npx wrangler secret put SUPABASE_URL >/dev/null && echo "set supabase url"
kc "Threadline Supabase" SUPABASE_SERVICE_ROLE_KEY | npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY >/dev/null && echo "set supabase key"
# Optional launch secrets (production agent): pushed only if Aki stored them in Keychain item "Threadline Ops" first.
#   security add-generic-password -U -s "Threadline Ops" -a RESEND_API_KEY -w   (prompts for the value; never paste into files)
for k in RESEND_API_KEY SENTRY_DSN ALERT_WEBHOOK_URL STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET GATEWAY_ADMIN_TOKEN CF_BEACON_TOKEN IMESSAGE_LINE_HANDLE OPS_TOKEN; do
  # Stripe keys may live in billing's Keychain item "Threadline Stripe" (launch/billing/SETUP.md) instead.
  if { v=$(kc "Threadline Ops" "$k" 2>/dev/null) || v=$(kc "Threadline Stripe" "$k" 2>/dev/null); } && [ -n "$v" ]; then printf %s "$v" | npx wrangler secret put "$k" >/dev/null && echo "set $k"; fi
done
# Set once: it is also THREADLINE_ENCRYPTION_KEY, so rotating it would orphan encrypted creds in the persisted DB.
if npx wrangler secret list 2>/dev/null | grep -q '"AUTH_SECRET"'; then echo "auth secret kept"
else openssl rand -hex 32 | npx wrangler secret put AUTH_SECRET >/dev/null && echo "set auth"; fi
# Public URL = APP_URL from wrangler.jsonc vars (heybell.app after the cutover), else the workers.dev URL wrangler printed.
url=$(grep -oE '"APP_URL": *"[^"]+"' wrangler.jsonc | head -1 | sed -E 's/.*"(https?:[^"]+)"/\1/')
[ -n "$url" ] || url=$(grep -oE 'https://[a-z0-9.-]+\.workers\.dev' /tmp/threadline-cf-deploy.log | head -1)
echo "$url" | tee ../../data/cloudflare_url.txt
curl -s -o /dev/null -w "healthz %{http_code}\n" --max-time 60 "$url/healthz" || true
echo "== done"
