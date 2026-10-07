#!/bin/bash
# Serialise pnpm across parallel agents with an atomic mkdir lock.
export PATH=/opt/homebrew/bin:$PATH
cd "$(dirname "$0")/.." || exit 1
LOCK=/tmp/threadline-pnpm.lock
for i in $(seq 1 600); do
  if mkdir "$LOCK" 2>/dev/null; then
    trap 'rmdir "$LOCK"' EXIT
    pnpm "$@"
    exit $?
  fi
  # stale lock (>10 min) cleanup
  if [ -d "$LOCK" ] && [ $(( $(date +%s) - $(stat -f %m "$LOCK") )) -gt 600 ]; then rmdir "$LOCK" 2>/dev/null; fi
  sleep 1
done
echo "pnpm lock timeout" >&2; exit 1
