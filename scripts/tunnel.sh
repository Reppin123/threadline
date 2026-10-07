#!/bin/bash
# Public URL for this Mac via a Cloudflare quick tunnel (no account needed).
#   scripts/tunnel.sh              tunnel → http://localhost:3000 (web); URL saved to data/public_url.txt
#   scripts/tunnel.sh --gateway    also tunnel → http://localhost:3100 (Spectrum webhook); URL saved to data/gateway_url.txt
# Runs in the foreground until Ctrl+C. Logs: data/tunnel-web.log, data/tunnel-gateway.log
set -euo pipefail
export PATH=/opt/homebrew/bin:$HOME/.local/bin:$PATH
cd "$(dirname "$0")/.."
mkdir -p data
WEB_PORT=${WEB_PORT:-3000}
GATEWAY_PORT=${GATEWAY_PORT:-3100}
WITH_GATEWAY=0
[[ "${1:-}" == "--gateway" ]] && WITH_GATEWAY=1

command -v cloudflared >/dev/null || { echo "cloudflared not installed: brew install cloudflared" >&2; exit 1; }

PIDS=()
cleanup() { for p in "${PIDS[@]:-}"; do kill "$p" 2>/dev/null || true; done; }
trap cleanup EXIT INT TERM

# start_tunnel <port> <logfile> <urlfile>  → sets TUNNEL_URL (no subshell, so PIDS/wait see the process)
start_tunnel() {
  local port=$1 log=$2 out=$3
  : > "$log"
  cloudflared tunnel --no-autoupdate --url "http://localhost:$port" >"$log" 2>&1 &
  PIDS+=($!)
  local url=""
  for _ in $(seq 1 60); do
    url=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$log" | head -1 || true)
    [[ -n "$url" ]] && break
    sleep 1
  done
  if [[ -z "$url" ]]; then echo "tunnel for :$port did not come up; see $log" >&2; tail -5 "$log" >&2; exit 1; fi
  echo "$url" > "$out"
  TUNNEL_URL=$url
}

if ! curl -s -o /dev/null --max-time 5 "http://localhost:$WEB_PORT/"; then
  echo "warning: nothing answering on :$WEB_PORT yet (start it with: pnpm start:all)" >&2
fi

start_tunnel "$WEB_PORT" data/tunnel-web.log data/public_url.txt; WEB_URL=$TUNNEL_URL
echo "web     $WEB_URL   (saved to data/public_url.txt)"
if [[ $WITH_GATEWAY == 1 ]]; then
  start_tunnel "$GATEWAY_PORT" data/tunnel-gateway.log data/gateway_url.txt; GW_URL=$TUNNEL_URL
  echo "gateway $GW_URL   (webhook: $GW_URL/spectrum/webhook; saved to data/gateway_url.txt)"
fi

# Wait until the URL actually resolves and serves (quick tunnels take a few seconds to propagate).
for _ in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$WEB_URL/" || true)
  [[ "$code" =~ ^[23] ]] && { echo "public URL is serving (HTTP $code). Set APP_URL=$WEB_URL for absolute links."; break; }
  sleep 2
done
[[ "${code:-}" =~ ^[23] ]] || echo "warning: $WEB_URL not serving yet (last HTTP ${code:-none}) — DNS may still be propagating" >&2

echo "Ctrl+C to stop."
wait
