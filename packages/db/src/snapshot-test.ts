// Round-trip test for snapshot.ts against the real bucket (uses a test object, never the live one):
// write rows → snapshot → delete local file → restore → rows back.
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node packages/db/src/snapshot-test.ts
import { rmSync } from "node:fs";
process.env.THREADLINE_DB = `/tmp/tl-supabase-test-${process.pid}.db`;
process.env.SUPABASE_SNAPSHOT_OBJECT = `test/roundtrip-${process.pid}.db`;
const path = process.env.THREADLINE_DB;
const { restoreSnapshot, startSnapshotter, snapshotEnabled } = await import("./snapshot.ts");
if (!snapshotEnabled()) throw new Error("set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
const clean = () => { for (const e of ["", "-wal", "-shm"]) rmSync(path + e, { force: true }); };
clean();

if ((await restoreSnapshot(path)) !== "no-snapshot") throw new Error("expected no-snapshot for a new object");
const snap = startSnapshotter(path, { restored: "no-snapshot", intervalMs: 3600_000 });
const dbm = await import("./index.ts");
const email = `persist-${Date.now()}@x.dev`;
dbm.run("INSERT INTO users(id,email) VALUES (?,?)", [dbm.id("u_"), email]);
if (!(await snap.flush("test"))) throw new Error("first flush did not upload");
if (await snap.flush("test-unchanged")) throw new Error("unchanged DB was uploaded again");
dbm.run("INSERT INTO users(id,email) VALUES (?,?)", [dbm.id("u_"), "second-" + email]);
if (!(await snap.flush("test-changed"))) throw new Error("change was not detected");
snap.stop();
dbm.db().close();
clean();

if ((await restoreSnapshot(path)) !== "restored") throw new Error("restore failed");
const { DatabaseSync } = await import("node:sqlite");
const d = new DatabaseSync(path);
const n = (d.prepare("SELECT count(*) n FROM users WHERE email IN (?,?)").get(email, "second-" + email) as { n: number }).n;
d.close();
clean();
// tidy the test object + its history copies
async function listHistory(): Promise<string[]> {
  const prefix = `history/${process.env.SUPABASE_SNAPSHOT_OBJECT}`;
  const r = await fetch(`${url}/storage/v1/object/list/threadline-db`, { method: "POST", headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, limit: 100 }) });
  return ((await r.json()) as { name: string }[]).map((o) => `${prefix}/${o.name}`);
}
const url = process.env.SUPABASE_URL!.replace(/\/+$/, ""), key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
await fetch(`${url}/storage/v1/object/threadline-db`, { method: "DELETE", headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" },
  body: JSON.stringify({ prefixes: [process.env.SUPABASE_SNAPSHOT_OBJECT, ...(await listHistory())] }) });
if (n !== 2) throw new Error(`expected 2 rows after restore, got ${n}`);
console.log("snapshot round-trip ok (2/2 rows restored)");
