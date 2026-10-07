#!/bin/bash
# Relaunch one Threadline agent so it resumes where it stopped. Usage: AGENTS/run-agent.sh <web|gateway|core|platform>
export PATH=/opt/homebrew/bin:$HOME/.local/bin:$PATH
A="$1"
cd "$(dirname "$0")/.." || exit 1
mkdir -p AGENTS/logs
PROMPT="You are agent \"$A\" on the Threadline project in $(pwd). You were RESTARTED after an interruption — your previous run was cut off at about 16:10.
Resume, do not restart: read AGENTS/COMMON.md, AGENTS/$A.md, AGENTS/STATUS-$A.md, the whole COORDINATION.md (new notes: Anthropic key + Spectrum creds in Keychain, job queue), then run git status and git log -15 to see your uncommitted and committed work, and continue from there.
Deadline: the end-to-end MVP slice must work by 16:45 (signup → wizard → build from https://sanitea.vercel.app → playground answers correctly → deploy iMessage join code → gateway reply). Prioritise anything on that path, verify with real runs, tick your STATUS checkboxes ONLY when proven, commit often. Other agents are running in parallel; stay in your folders. Work autonomously; never ask questions. Keep looping until every Definition-of-Done item is verified, then polish."
exec claude -p "$PROMPT" --model opus --dangerously-skip-permissions --output-format stream-json --verbose >> "AGENTS/logs/$A.jsonl" 2>> "AGENTS/logs/$A.err"
