// Off-box persistence for the single SQLite file: snapshots to a private Supabase Storage bucket.
// Used by scripts/start-all.mjs (the supervisor) so containers without a persistent disk survive restarts/redeploys:
//   1. restoreSnapshot()  — BEFORE any child opens the DB: if the local file is missing/empty, download the latest snapshot.
//   2. startSnapshotter() — the supervisor is the single uploader. Every 30s it checks PRAGMA data_version on its own idle
//      connection (bumps whenever another process commits); if changed it takes a consistent online copy with sqlite backup()
//      and upserts it. flush() is also called on SIGTERM/SIGINT. Failures are logged and never block anything.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (both required, otherwise everything is a no-op),
//      SUPABASE_SNAPSHOT_BUCKET (default threadline-db), SUPABASE_SNAPSHOT_OBJECT (default threadline.db),
//      SNAPSHOT_INTERVAL_MS (default 30000).
// Besides the latest object, one copy per hour is kept under history/<object>/ so a bad upload can be rolled back by hand.
// Self-contained on purpose (no ./index.ts import): it must not open the DB or run migrations.
import { DatabaseSync, backup } from "node:sqlite";
import { existsSync, statSync, readFileSync, writeFileSync, renameSync, rmSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

type Log = (msg: string) => void;

function cfg() {
  const url = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const bucket = process.env.SUPABASE_SNAPSHOT_BUCKET || "threadline-db";
  const object = process.env.SUPABASE_SNAPSHOT_OBJECT || "threadline.db";
  return url && key ? { url, key, bucket, object } : null;
}

export function snapshotEnabled(): boolean {
  return cfg() !== null;
}

function headers(key: string): Record<string, string> {
  return { Authorization: `Bearer ${key}`, apikey: key };
}

export type RestoreResult = "disabled" | "skipped-local-exists" | "restored" | "no-snapshot" | "error";

// Downloads the latest snapshot when the local DB is missing or empty. Retries transient errors a few times.
export async function restoreSnapshot(dbPath: string, log: Log = console.log): Promise<RestoreResult> {
  const c = cfg();
  if (!c) return "disabled";
  if (existsSync(dbPath) && statSync(dbPath).size > 0) return "skipped-local-exists";
  mkdirSync(dirname(dbPath), { recursive: true });
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const r = await fetch(`${c.url}/storage/v1/object/${c.bucket}/${c.object}`, { headers: headers(c.key), signal: AbortSignal.timeout(60_000) });
      if (r.status === 404 || r.status === 400) {
        const body = await r.text();
        if (r.status === 404 || /not.?found/i.test(body)) {
          log(`snapshot: no snapshot in ${c.bucket}/${c.object} yet — starting with a fresh DB`);
          return "no-snapshot";
        }
        throw new Error(`HTTP ${r.status} ${body.slice(0, 200)}`);
      }
      if (!r.ok) throw new Error(`HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
      const buf = Buffer.from(await r.arrayBuffer());
      const tmp = `${dbPath}.restore-${process.pid}`;
      writeFileSync(tmp, buf);
      const check = new DatabaseSync(tmp);
      const ok = (check.prepare("PRAGMA quick_check").get() as { quick_check: string }).quick_check;
      check.close();
      if (ok !== "ok") throw new Error(`downloaded snapshot failed quick_check: ${ok}`);
      for (const ext of ["-wal", "-shm"]) rmSync(dbPath + ext, { force: true });
      renameSync(tmp, dbPath);
      log(`snapshot: restored ${(buf.length / 1024).toFixed(0)} KB from ${c.bucket}/${c.object}`);
      return "restored";
    } catch (e) {
      log(`snapshot: restore attempt ${attempt}/5 failed: ${(e as Error).message}`);
      if (attempt < 5) await new Promise((res) => setTimeout(res, attempt * 3000));
    }
  }
  return "error";
}

async function upload(c: NonNullable<ReturnType<typeof cfg>>, object: string, body: Buffer): Promise<void> {
  const r = await fetch(`${c.url}/storage/v1/object/${c.bucket}/${object}`, {
    method: "POST",
    headers: { ...headers(c.key), "Content-Type": "application/vnd.sqlite3", "x-upsert": "true", "cache-control": "no-cache" },
    body: new Uint8Array(body),
    signal: AbortSignal.timeout(120_000),
  });
  if (!r.ok) throw new Error(`upload ${object}: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
}

export interface Snapshotter {
  flush(reason?: string): Promise<boolean>;
  stop(): void;
}

// restored = result of restoreSnapshot(). After "error" we never overwrite the remote snapshot with what is probably a
// fresh empty DB; uploads go to history/ only, so nothing is lost and the good snapshot stays the restore target.
export function startSnapshotter(dbPath: string, opts: { restored?: RestoreResult; intervalMs?: number; log?: Log } = {}): Snapshotter {
  const log = opts.log ?? console.log;
  const c = cfg();
  if (!c) return { flush: async () => false, stop() {} };
  const protectLatest = opts.restored === "error";
  if (protectLatest) log("snapshot: restore failed — will NOT overwrite the latest snapshot; uploads go to history/ only");
  const intervalMs = opts.intervalMs ?? Number(process.env.SNAPSHOT_INTERVAL_MS || 30_000);
  let conn: DatabaseSync | null = null;
  let lastVersion: number | null = null; // data_version at the last successful upload
  let lastHistoryHour = "";
  let running: Promise<boolean> | null = null;

  const version = (): number | null => {
    if (!existsSync(dbPath)) return null;
    // Opened lazily (the children create/migrate the file). This connection never writes.
    conn ??= new DatabaseSync(dbPath);
    return (conn.prepare("PRAGMA data_version").get() as { data_version: number }).data_version;
  };
  // A freshly restored DB equals the remote copy → no upload until something changes.
  if (opts.restored === "restored") lastVersion = version();

  async function doFlush(reason: string, force: boolean): Promise<boolean> {
    const v = version();
    if (v === null || !conn) return false;
    if (!force && v === lastVersion) return false;
    const tmp = `${dbPath}.snapshot-${process.pid}`;
    try {
      const t0 = Date.now();
      rmSync(tmp, { force: true });
      await backup(conn, tmp);
      const buf = readFileSync(tmp);
      const hour = new Date().toISOString().slice(0, 13);
      if (!protectLatest) await upload(c!, c!.object, buf);
      if (protectLatest || hour !== lastHistoryHour) {
        await upload(c!, `history/${c!.object}/${hour.replace("T", "-")}.db`, buf);
        lastHistoryHour = hour;
      }
      lastVersion = v;
      log(`snapshot: uploaded ${(buf.length / 1024).toFixed(0)} KB (${reason}, ${Date.now() - t0}ms)`);
      return true;
    } catch (e) {
      log(`snapshot: upload failed (${reason}): ${(e as Error).message} — will retry`);
      return false;
    } finally {
      rmSync(tmp, { force: true });
    }
  }
  // Serialise: a SIGTERM flush waits for an in-flight periodic one, then runs (so the final state is always uploaded).
  function flush(reason = "manual", force = false): Promise<boolean> {
    const prev = running ?? Promise.resolve(false);
    const next = prev.then(() => doFlush(reason, force)).catch((e) => { log(`snapshot: ${(e as Error).message}`); return false; });
    running = next;
    next.then(() => { if (running === next) running = null; });
    return next;
  }
  const timer = setInterval(() => { if (!running) flush("interval").catch(() => {}); }, intervalMs);
  timer.unref();
  return {
    flush: (reason?: string) => flush(reason),
    stop() { clearInterval(timer); try { conn?.close(); } catch {} conn = null; },
  };
}
