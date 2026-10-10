#!/bin/bash
# Launch or resume one Threadline go-live agent. Usage: AGENTS/run-launch.sh <domain|gtm|blog|billing|legal|production>
export PATH=/opt/homebrew/bin:$HOME/.local/bin:$PATH
A="$1"; cd "$(dirname "$0")/.." || exit 1; mkdir -p AGENTS/logs
PROMPT="You are launch agent \"$A\" on the Threadline project in $(pwd).
Read AGENTS/LAUNCH-COMMON.md, AGENTS/$A.md, AGENTS/STATUS-$A.md (if any), LAUNCH.md and the whole COORDINATION.md, then git status and git log -15.
If you have worked here before, resume where you stopped; do not start over.
Work autonomously; never ask questions. Respect the hard limits. Keep going until every item in your brief is verified."
exec claude -p "$PROMPT" --model opus --dangerously-skip-permissions --output-format stream-json --verbose \
  >> "AGENTS/logs/$A.jsonl" 2>> "AGENTS/logs/$A.err"
