// Shared SQLite access (node:sqlite, zero native deps). Owned by orchestrator.
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

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

export function logEvent(botId: string | null, type: string, data?: unknown) {
  run("INSERT INTO events(id, bot_id, type, data_json) VALUES (?,?,?,?)", [id("ev_"), botId, type, json.str(data)]);
}
