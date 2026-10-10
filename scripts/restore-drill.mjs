#!/usr/bin/env node
// Backup/restore drill (production agent). Proves both recovery paths restore a working DB and times them (RTO inputs).
//   node scripts/restore-drill.mjs           A: scripts/backup.sh file backup → gunzip → verify
//                                            B: Supabase snapshot path (snapshot.ts) against a local mock Storage server:
//                                               upload → wipe local DB → restoreSnapshot → verify; plus the failure paths
//   node scripts/restore-drill.mjs --real    C: also READ-ONLY download of the real latest snapshot (Keychain "Threadline Supabase")
//                                               into a temp dir, verify, delete. Never uploads.
// "verify" = PRAGMA integrity_check, same row counts per table as the source copy, app migrations apply, a login-path query works.
import { DatabaseSync, backup } from "node:sqlite";
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, readdirSync, statSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = process.env.THREADLINE_DB || join(ROOT, "data", "threadline.db");
const REAL = process.argv.includes("--real");
const work = mkdtempSync(join(tmpdir(), "tl-drill-"));
const results = [];
const rec = (name, ok, detail) => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail}`); };

function counts(path) {
  const d = new DatabaseSync(path, { readOnly: true });
  const tables = d.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'knowledge_fts_%' ORDER BY name").all().map((r) => r.name);
  const out = Object.fromEntries(tables.map((t) => [t, d.prepare(`SELECT COUNT(*) n FROM "${t}"`).get().n]));
  d.close();
  return out;
}
function verify(path, expected) {
  const d = new DatabaseSync(path);
  const integ = Object.values(d.prepare("PRAGMA integrity_check").get())[0];
  d.close();
  const got = counts(path);
  const diff = Object.keys(expected).filter((t) => expected[t] !== got[t]);
  // app can open it: run the real migrations (packages/db) in a child so env/DB handles stay isolated
  const appOk = execFileSync(process.execPath, ["--experimental-strip-types", "-e", `
    const db = await import(${JSON.stringify(join(ROOT, "packages/db/src/index.ts"))});
    db.migrate();
    const u = db.get("SELECT COUNT(*) n FROM users"); const s = db.get("SELECT COUNT(*) n FROM sessions WHERE expires_at > ?", [new Date().toISOString()]);
    const b = db.get("SELECT COUNT(*) n FROM bots WHERE status='live'");
    console.log(JSON.stringify({ users: u.n, activeSessions: s.n, liveBots: b.n }));`], { env: { ...process.env, THREADLINE_DB: path, NODE_NO_WARNINGS: "1" }, encoding: "utf8" }).trim();
  return { ok: integ === "ok" && diff.length === 0, integ, diff, app: JSON.parse(appOk.split("\n").pop()) };
}

if (!existsSync(SRC)) { console.error(`no source DB at ${SRC}`); process.exit(1); }
// Consistent source copy (online backup), so the drill never touches the live file.
const source = join(work, "source.db");
{ const d = new DatabaseSync(SRC, { readOnly: true }); await backup(d, source); d.close(); }
const expected = counts(source);
const total = Object.values(expected).reduce((a, b) => a + b, 0);
console.log(`source ${SRC}: ${(statSync(source).size / 1024).toFixed(0)} KB, ${Object.keys(expected).length} tables, ${total} rows\n`);

// ---------- A: file backup (scripts/backup.sh) ----------
{
  const dir = join(work, "backups");
  const t0 = Date.now();
  const out = execFileSync("bash", [join(ROOT, "scripts/backup.sh")], { env: { ...process.env, THREADLINE_DB: source, BACKUP_DIR: dir }, encoding: "utf8" });
  const tBackup = Date.now() - t0;
  const gz = readdirSync(dir).find((f) => f.endsWith(".db.gz"));
  const t1 = Date.now();
  const restored = join(work, "restored-a.db");
  writeFileSync(restored, gunzipSync(readFileSync(join(dir, gz))));
  const tRestore = Date.now() - t1;
  const v = verify(restored, expected);
  rec("A file backup → restore", v.ok, `backup ${tBackup}ms (${out.trim().split("(")[1]?.split(",")[0] ?? "?"} gz), restore ${tRestore}ms, integrity=${v.integ}, mismatched tables=[${v.diff}], app sees ${JSON.stringify(v.app)}`);
}

// ---------- B: Supabase snapshot path against a mock Storage API ----------
{
  const store = new Map(); let failGets = false;
  const srv = createServer(async (req, res) => {
    const chunks = []; for await (const c of req) chunks.push(c);
    const key = decodeURIComponent(new URL(req.url, "http://x").pathname.replace("/storage/v1/object/", ""));
    if (req.headers.authorization !== "Bearer drill-key") { res.writeHead(401); return res.end("{}"); }
    if (req.method === "POST" && req.url.startsWith("/storage/v1/object/list/")) {
      const { prefix } = JSON.parse(Buffer.concat(chunks).toString()); const bucket = req.url.split("/").pop();
      const names = [...store.keys()].filter((k) => k.startsWith(`${bucket}/${prefix}`)).map((k) => ({ name: k.slice(bucket.length + 1 + prefix.length) }));
      res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify(names));
    }
    if (req.method === "DELETE") {
      const { prefixes } = JSON.parse(Buffer.concat(chunks).toString()); const bucket = key;
      for (const p of prefixes) store.delete(`${bucket}/${p}`);
      res.writeHead(200, { "content-type": "application/json" }); return res.end("[]");
    }
    if (req.method === "POST") { store.set(key, Buffer.concat(chunks)); res.writeHead(200, { "content-type": "application/json" }); return res.end(`{"Key":"${key}"}`); }
    if (failGets) { res.writeHead(500); return res.end("storage down"); }
    if (!store.has(key)) { res.writeHead(400, { "content-type": "application/json" }); return res.end('{"statusCode":"404","error":"not_found","message":"Object not found"}'); }
    res.writeHead(200, { "content-type": "application/vnd.sqlite3" }); res.end(store.get(key));
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  Object.assign(process.env, { SUPABASE_URL: `http://127.0.0.1:${srv.address().port}`, SUPABASE_SERVICE_ROLE_KEY: "drill-key", SUPABASE_SNAPSHOT_BUCKET: "threadline-db", SUPABASE_SNAPSHOT_OBJECT: "threadline.db" });
  const { restoreSnapshot, startSnapshotter, pruneHistory } = await import("../packages/db/src/snapshot.ts");
  const quiet = () => {};

  const live = join(work, "live.db");
  { const d = new DatabaseSync(source, { readOnly: true }); await backup(d, live); d.close(); }
  const empty = await restoreSnapshot(join(work, "fresh.db"), quiet);
  rec("B0 first boot, bucket empty → fresh DB", empty === "no-snapshot", empty);

  const snap = startSnapshotter(live, { restored: "no-snapshot", intervalMs: 3_600_000, log: quiet });
  const t0 = Date.now(); const up = await snap.flush("drill"); const tUp = Date.now() - t0; snap.stop();
  const hist = [...store.keys()].filter((k) => k.includes("history/"));
  rec("B1 snapshot upload (latest + hourly history)", up && store.has("threadline-db/threadline.db") && hist.length === 1, `${tUp}ms, objects=${[...store.keys()].join(", ")}`);

  for (const ext of ["", "-wal", "-shm"]) rmSync(live + ext, { force: true });   // container replaced: disk gone
  const t1 = Date.now(); const r = await restoreSnapshot(live, quiet); const tRestore = Date.now() - t1;
  const v = verify(live, expected);
  rec("B2 container lost disk → restore from snapshot", r === "restored" && v.ok, `${r} in ${tRestore}ms, integrity=${v.integ}, mismatched=[${v.diff}], app sees ${JSON.stringify(v.app)}`);

  const skip = await restoreSnapshot(live, quiet);
  rec("B3 restart with disk intact → keeps local file", skip === "skipped-local-exists", skip);

  // Storage outage on boot: restore fails → snapshotter must NOT overwrite the good latest copy with a fresh empty DB.
  failGets = true;
  const lost = join(work, "lost.db");
  const tOut = Date.now(); const bad = await restoreSnapshot(lost, quiet); const tFail = Date.now() - tOut;
  failGets = false;
  const before = Buffer.from(store.get("threadline-db/threadline.db"));
  const d = new DatabaseSync(lost); d.exec("CREATE TABLE IF NOT EXISTS users(id TEXT)"); d.close();   // app boots on an empty DB
  const s2 = startSnapshotter(lost, { restored: bad, intervalMs: 3_600_000, log: quiet });
  await s2.flush("drill"); s2.stop();
  rec("B4 storage down at boot → latest snapshot protected", bad === "error" && before.equals(store.get("threadline-db/threadline.db")), `restore=${bad} after ${tFail}ms of retries; latest unchanged; empty DB went to history only`);

  // Manual rollback: copy an hourly history object over latest, restart → that version comes back.
  store.set("threadline-db/threadline.db", store.get(hist[0]));
  for (const ext of ["", "-wal", "-shm"]) rmSync(live + ext, { force: true });
  const rb = await restoreSnapshot(live, quiet);
  rec("B5 rollback to an hourly history copy", rb === "restored" && verify(live, expected).ok, rb);
  // Retention: hourly copies for 48h, then first-of-day for 30 days.
  const now = Date.UTC(2026, 9, 10, 12, 0, 0);
  for (const k of [...store.keys()]) if (k.includes("history/")) store.delete(k);
  for (let h = 0; h < 40 * 24; h += 3) {
    const d = new Date(now - h * 36e5).toISOString();
    store.set(`threadline-db/history/threadline.db/${d.slice(0, 10)}-${d.slice(11, 13)}.db`, Buffer.from("x"));
  }
  const histKeys = () => [...store.keys()].filter((k) => k.includes("history/"));
  const n0 = histKeys().length;
  const pruned = await pruneHistory(quiet, now);
  const left = histKeys().map((k) => k.split("/").pop());
  const old = left.filter((n) => now - Date.parse(`${n.slice(0, 10)}T${n.slice(11, 13)}:00:00Z`) >= 48 * 36e5);
  const days = new Set(old.map((n) => n.slice(0, 10)));
  const ok = pruned.length > 0 && old.length === days.size && !left.some((n) => now - Date.parse(`${n.slice(0, 10)}T00:00:00Z`) > 31 * 864e5)
    && left.filter((n) => !old.includes(n)).length === 16;
  rec("B6 history retention (48h hourly, 30d daily)", ok, `${n0} copies → ${left.length} (${pruned.length} deleted, ${old.length} daily kept)`);
  srv.close();
  for (const k of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SNAPSHOT_BUCKET", "SUPABASE_SNAPSHOT_OBJECT"]) delete process.env[k];
}

// ---------- C: real latest snapshot, read-only ----------
if (REAL) {
  const kc = (a) => execFileSync("security", ["find-generic-password", "-s", "Threadline Supabase", "-a", a, "-w"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  try {
    const url = kc("SUPABASE_URL").replace(/\/+$/, ""), key = kc("SUPABASE_SERVICE_ROLE_KEY");
    const t0 = Date.now();
    const r = await fetch(`${url}/storage/v1/object/threadline-db/threadline.db`, { headers: { Authorization: `Bearer ${key}`, apikey: key }, signal: AbortSignal.timeout(60_000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer()); const tDl = Date.now() - t0;
    const p = join(work, "prod.db"); writeFileSync(p, buf);
    const v = verify(p, counts(p));
    rec("C real latest snapshot (read-only download)", v.ok, `${(buf.length / 1024).toFixed(0)} KB in ${tDl}ms, integrity=${v.integ}, app sees ${JSON.stringify(v.app)}, last-modified=${r.headers.get("last-modified")}`);
  } catch (e) {
    rec("C real latest snapshot (read-only download)", false, `${e.message} (Keychain item "Threadline Supabase" present?)`);
  }
}

rmSync(work, { recursive: true, force: true });
const failed = results.filter((r) => !r.ok).length;
console.log(`\nrestore drill: ${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
