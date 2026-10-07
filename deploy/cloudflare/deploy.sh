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
openssl rand -hex 32 | npx wrangler secret put AUTH_SECRET >/dev/null && echo "set auth"
grep -oE 'https://[a-z0-9.-]+\.workers\.dev' /tmp/threadline-cf-deploy.log | head -1 | tee ../../data/cloudflare_url.txt
echo "== done"
