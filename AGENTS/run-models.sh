#!/bin/bash
# Launch (or resume) the "models" helper agent for Threadline. Usage: AGENTS/run-models.sh
export PATH=/opt/homebrew/bin:$HOME/.local/bin:$PATH
A="models"
cd "$(dirname "$0")/.." || exit 1
mkdir -p AGENTS/logs
PROMPT="You are agent \"$A\" on the Threadline project in $(pwd).
Read AGENTS/COMMON.md, AGENTS/$A.md, AGENTS/STATUS-$A.md and the whole COORDINATION.md
(read it fully, especially the latest entries), then run git status and git log -15.
If you have worked here before (uncommitted or committed 'models:' work exists), resume
where you stopped; do not start over.
Work autonomously; never ask questions — decide, note the decision in COORDINATION.md, and
keep going. Tick AGENTS/STATUS-$A.md checkboxes ONLY once proven by a real run. Commit your
own paths often with 'models: ...' messages. Keep looping until every Definition-of-Done
item in AGENTS/$A.md is verified, then do a polish pass and finish with a final STATUS
summary including exact run commands."
exec claude -p "$PROMPT" --model sonnet --dangerously-skip-permissions \
  --output-format stream-json --verbose \
  >> "AGENTS/logs/$A.jsonl" 2>> "AGENTS/logs/$A.err"
