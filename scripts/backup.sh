#!/bin/bash
# Online SQLite backup (safe while web/gateway/worker are writing) → data/backups/threadline-<UTC timestamp>.db, 7-day retention.
#   scripts/backup.sh                 uses $THREADLINE_DB (default data/threadline.db), keeps $BACKUP_RETENTION_DAYS (7)
# Cron (nightly 03:15):  15 3 * * * cd /path/to/threadline && scripts/backup.sh >> data/backups/backup.log 2>&1
set -euo pipefail
export PATH=/opt/homebrew/bin:$HOME/.local/bin:$PATH
cd "$(dirname "$0")/.."
DB=${THREADLINE_DB:-$PWD/data/threadline.db}
DIR=${BACKUP_DIR:-$(dirname "$DB")/backups}
KEEP_DAYS=${BACKUP_RETENTION_DAYS:-7}
[[ -f "$DB" ]] || { echo "no database at $DB" >&2; exit 1; }
mkdir -p "$DIR"
OUT="$DIR/threadline-$(date -u +%Y%m%dT%H%M%SZ).db"

if command -v sqlite3 >/dev/null; then
  sqlite3 "$DB" ".timeout 10000" ".backup '$OUT'"
else
  # node:sqlite online backup API (Node ≥ 23.8)
  NODE_NO_WARNINGS=1 node -e '
    const { DatabaseSync, backup } = require("node:sqlite");
    const src = new DatabaseSync(process.argv[1], { readOnly: true });
    backup(src, process.argv[2]).then(() => src.close()).catch((e) => { console.error(e); process.exit(1); });
  ' "$DB" "$OUT"
fi

# Make the copy self-contained (no -wal/-shm sidecars) and verify it before trusting it.
CHECK=$(NODE_NO_WARNINGS=1 node -e '
  const { DatabaseSync } = require("node:sqlite");
  const d = new DatabaseSync(process.argv[1]);
  d.exec("PRAGMA journal_mode=DELETE");
  const ok = d.prepare("PRAGMA integrity_check").get();
  const n = d.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE type=?").get("table").n;
  console.log(Object.values(ok)[0] + " tables=" + n);
' "$OUT")
[[ "$CHECK" == ok* ]] || { echo "backup integrity check FAILED: $CHECK" >&2; rm -f "$OUT"; exit 1; }
gzip -f "$OUT"
echo "backup ok: $OUT.gz ($(du -h "$OUT.gz" | cut -f1), $CHECK)"

# Retention
find "$DIR" -name 'threadline-*.db.gz' -type f -mtime +"$KEEP_DAYS" -print -delete | sed 's/^/pruned: /'
