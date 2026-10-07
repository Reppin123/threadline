#!/bin/bash
# Smoke test against RUNNING services (start them first: pnpm start:all). Boots nothing.
#   scripts/smoke.sh                     local ports 3000/3100/3200, shared dev DB
#   BASE_URL=https://x.trycloudflare.com scripts/smoke.sh     check web through the public URL
#   SMOKE_URL=https://sanitea.vercel.app scripts/smoke.sh     build a website bot instead of the quick idea bot
# Exit 0 only if every check passes. SKIPs don't fail the run.
set -uo pipefail
export PATH=/opt/homebrew/bin:$HOME/.local/bin:$PATH
cd "$(dirname "$0")/.."
[[ -f .env ]] && set -a && . ./.env && set +a
[[ -f .env.local ]] && set -a && . ./.env.local && set +a
BASE_URL=${BASE_URL:-http://localhost:${WEB_PORT:-3000}}
GW=http://localhost:${GATEWAY_PORT:-3100}
WK=http://localhost:${WORKER_PORT:-3200}
export THREADLINE_DB=${THREADLINE_DB:-$PWD/data/threadline.db}
export NODE_NO_WARNINGS=1

ROWS=()
add() { ROWS+=("$1|$2|$3"); }
http_check() { # name url expect-regex [body-grep]
  local name=$1 url=$2 want=$3 grepfor=${4:-}
  local body code
  body=$(curl -s -L --max-time 30 -w $'\n%{http_code}' "$url" 2>/dev/null); code=${body##*$'\n'}; body=${body%$'\n'*}
  if [[ "$code" =~ $want ]] && { [[ -z "$grepfor" ]] || grep -q "$grepfor" <<<"$body"; }; then add "$name" PASS "HTTP $code $url"
  else add "$name" FAIL "HTTP ${code:-none} $url${grepfor:+ (expected '$grepfor')}"; fi
}
json_ok() { # name url
  local out; out=$(curl -s --max-time 10 "$2" 2>/dev/null)
  if [[ -n "$out" ]] && node -e 'const j=JSON.parse(process.argv[1]); process.exit(j.ok===true?0:1)' "$out" 2>/dev/null; then add "$1" PASS "$2 ok=true"
  else add "$1" FAIL "$2 ${out:0:100}"; fi
}

http_check web_landing "$BASE_URL/" '^200$' '<title>'
http_check web_login "$BASE_URL/login" '^200$'
json_ok gateway_health "$GW/health"
json_ok worker_health "$WK/health"

echo "→ building a bot through the worker (this can take a while with a real LLM)…"
while IFS= read -r line; do
  if [[ "$line" == RESULT\ * ]]; then
    read -r _ name status detail <<<"$line"; add "$name" "$status" "$detail"
  else echo "  $line"; fi
done < <(apps/worker/node_modules/.bin/tsx scripts/smoke-flow.ts 2>&1)
[[ " ${ROWS[*]} " == *"worker_build|"* ]] || add worker_build FAIL "smoke-flow.ts crashed (run it directly for the stack trace)"

fail=0
printf '\n%-20s %-5s %s\n' CHECK RESULT DETAIL
printf '%-20s %-5s %s\n' -------------------- ----- ------------------------------------------------------------
for r in "${ROWS[@]}"; do
  IFS='|' read -r n s d <<<"$r"
  [[ "$s" == FAIL ]] && fail=1
  if [[ -t 1 ]]; then c=32; [[ $s == FAIL ]] && c=31; [[ $s == SKIP ]] && c=33; printf '%-20s \033[%sm%-5s\033[0m %s\n' "$n" "$c" "$s" "$d"
  else printf '%-20s %-5s %s\n' "$n" "$s" "$d"; fi
done
echo
if [[ $fail == 0 ]]; then echo "SMOKE: PASS"; else echo "SMOKE: FAIL"; fi
exit $fail
