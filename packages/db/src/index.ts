// Shared SQLite access (node:sqlite, zero native deps). Owned by orchestrator.
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

export { encrypt, decrypt, encryptJson, decryptJson } from "./crypto.ts";

const here = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(here, "../../..");
export const MIGRATIONS_DIR = resolve(here, "../migrations");

let _db: DatabaseSync | null = null;

export function dbPath(): string {
  return process.env.THREADLINE_DB || join(REPO_ROOT, "data", "threadline.db");
}

export function db(): DatabaseSync {
  if (_db) return _db;
  const p = dbPath();
  mkdirSync(dirname(p), { recursive: true });
  _db = new DatabaseSync(p);
  _db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
  migrate(_db);
  return _db;
}

export function migrate(d: DatabaseSync = db()): string[] {
  d.exec("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))");
  const done = new Set((d.prepare("SELECT name FROM schema_migrations").all() as { name: string }[]).map((r) => r.name));
  const applied: string[] = [];
  for (const f of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()) {
    if (done.has(f)) continue;
    d.exec("BEGIN");
    try {
      d.exec(readFileSync(join(MIGRATIONS_DIR, f), "utf8"));
      d.prepare("INSERT INTO schema_migrations(name) VALUES (?)").run(f);
      d.exec("COMMIT");
      applied.push(f);
    } catch (e) {
      d.exec("ROLLBACK");
      throw e;
    }
  }
  return applied;
}

export function id(prefix = ""): string {
  return prefix + randomBytes(10).toString("base64url");
}

export function now(): string {
  return new Date().toISOString();
}

type Params = unknown[];
export function all<T = any>(sql: string, p: Params = []): T[] {
  return db().prepare(sql).all(...(p as any[])) as T[];
}
export function get<T = any>(sql: string, p: Params = []): T | undefined {
  return db().prepare(sql).get(...(p as any[])) as T | undefined;
}
export function run(sql: string, p: Params = []) {
  return db().prepare(sql).run(...(p as any[]));
}
export function tx<T>(fn: () => T): T {
  const d = db();
  d.exec("BEGIN");
  try {
    const r = fn();
    d.exec("COMMIT");
    return r;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}

export const json = {
  parse<T = any>(s: string | null | undefined, fallback: T): T {
    if (!s) return fallback;
    try {
      return JSON.parse(s) as T;
    } catch {
      return fallback;
    }
  },
  str(v: unknown): string {
    return JSON.stringify(v ?? null);
  },
};

// ---------- Job queue (see migrations/0003). Job types: build_bot {botId} | run_checks {botId, runId?} | recrawl {botId} | send_scheduled {} ----------
export type JobType = "build_bot" | "run_checks" | "recrawl" | "send_scheduled" | (string & {});
export function enqueueJob(type: JobType, payload: unknown, opts: { runAt?: string; dedupeKey?: string; maxAttempts?: number } = {}): string {
  const jid = id("job_");
  run(
    "INSERT INTO jobs(id,type,payload_json,run_at,dedupe_key,max_attempts) VALUES (?,?,?,COALESCE(?,strftime('%Y-%m-%dT%H:%M:%fZ','now')),?,?) ON CONFLICT(dedupe_key) DO NOTHING",
    [jid, type, json.str(payload), opts.runAt ?? null, opts.dedupeKey ?? null, opts.maxAttempts ?? 3],
  );
  return jid;
}
export interface JobRow { id: string; type: string; payload_json: string; attempts: number; max_attempts: number }
export function claimJob(workerId: string, types?: string[]): JobRow | undefined {
  return tx(() => {
    const filter = types?.length ? ` AND type IN (${types.map(() => "?").join(",")})` : "";
    const j = get<JobRow>(
      `SELECT id,type,payload_json,attempts,max_attempts FROM jobs WHERE status='queued' AND run_at <= strftime('%Y-%m-%dT%H:%M:%fZ','now')${filter} ORDER BY run_at LIMIT 1`,
      types ?? [],
    );
    if (!j) return undefined;
    run("UPDATE jobs SET status='running', locked_by=?, locked_at=datetime('now'), attempts=attempts+1 WHERE id=?", [workerId, j.id]);
    return { ...j, attempts: j.attempts + 1 };
  });
}
export function completeJob(jobId: string, result?: unknown) {
  run("UPDATE jobs SET status='done', result_json=?, finished_at=datetime('now') WHERE id=?", [json.str(result), jobId]);
}
export function failJob(jobId: string, error: string) {
  const j = get<JobRow>("SELECT attempts,max_attempts FROM jobs WHERE id=?", [jobId]);
  if (j && j.attempts < j.max_attempts) {
    const backoffSec = 5 * 2 ** j.attempts;
    run("UPDATE jobs SET status='queued', error=?, run_at=strftime('%Y-%m-%dT%H:%M:%fZ','now', ?) WHERE id=?", [error, `+${backoffSec} seconds`, jobId]);
  } else {
    run("UPDATE jobs SET status='failed', error=?, finished_at=datetime('now') WHERE id=?", [error, jobId]);
  }
}
// Re-queue jobs whose worker died (locked > staleMinutes ago).
export function requeueStaleJobs(staleMinutes = 15) {
  run("UPDATE jobs SET status='queued', locked_by=NULL WHERE status='running' AND locked_at < datetime('now', ?)", [`-${staleMinutes} minutes`]);
}

export function logEvent(botId: string | null, type: string, data?: unknown) {
  run("INSERT INTO events(id, bot_id, type, data_json) VALUES (?,?,?,?)", [id("ev_"), botId, type, json.str(data)]);
}
