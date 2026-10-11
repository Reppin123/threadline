// Test vs live isolation for bot_table_rows (migration 0006), offline LLM, own DB. Exercises the real chat → save_row path.
//   node --experimental-strip-types packages/core/scripts/testdata-isolation.ts
import { rmSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

process.env.THREADLINE_LLM = "offline";
const DB = process.env.THREADLINE_DB || "/tmp/tl-testdata-isolation.db";
for (const s of ["", "-wal", "-shm"]) rmSync(DB + s, { force: true });
process.env.THREADLINE_DB = DB;
const here = dirname(fileURLToPath(import.meta.url));

const { run, get, all, id, db } = await import("@threadline/db");
const { core } = await import("../src/index.ts");
const { executeTool } = await import("../src/tools/index.ts");
const { loadDraft } = await import("../src/config.ts");
const T = await import("../src/tables.ts");

let passed = 0;
async function step(name: string, fn: () => Promise<void> | void) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}\n`, e); process.exit(1); }
}
const rowsOf = (tid: string) => all<{ id: string; customer_id: string | null; is_test: number; data_json: string }>("SELECT id,customer_id,is_test,data_json FROM bot_table_rows WHERE table_id=? ORDER BY created_at, rowid", [tid]);
const custId = (botId: string, handle: string) => get<{ id: string }>("SELECT id FROM customers WHERE bot_id=? AND handle=?", [botId, handle])!.id;

console.log(`testdata isolation (offline LLM, db ${DB})`);
const uid = id("u_");
run("INSERT INTO users(id,email) VALUES (?,?)", [uid, `${uid}@testdata.test`]);
const { botId } = await core.createBot(uid, { kind: "idea", idea: "coffee roaster taking orders for beans; keep a list of orders" });
await core.buildBot(botId);
const orders = T.tableId(botId, "Orders")!;
// Owner-filled catalog: the owner adds a real row from the dashboard (customer_id null, never test).
const menu = T.upsertTable(botId, { name: "Menu", description: "Beans we sell", columns: [{ name: "Name" }, { name: "Price" }], filled_by: "owner" } as any);
T.insertRow(menu, { Name: "Ethiopia Yirgacheffe", Price: "$18" }, null);

await step("column exists with default 0 and the migration is recorded", () => {
  assert.ok(all<any>("PRAGMA table_info(bot_table_rows)").some((c) => c.name === "is_test" && c.dflt_value === "0" && c.notnull === 1));
  assert.ok(get("SELECT 1 FROM schema_migrations WHERE name='0006_testdata_isolation.sql'"));
  assert.equal(rowsOf(menu)[0].is_test, 0);
});

await step("Build playground order (isTest chat, owner-preview) is stamped is_test=1", async () => {
  const r = await core.chat({ botId, channel: "web", customerHandle: "owner-preview", text: "yes confirm my order of 2 bags Ethiopia", isTest: true });
  assert.ok(r.toolCalls.some((t) => t.name === "save_row" && t.ok), JSON.stringify(r.toolCalls));
  const rs = rowsOf(orders);
  assert.equal(rs.length, 1);
  assert.equal(rs[0].is_test, 1);
});

await step("real customer order (iMessage, not test) is stamped is_test=0", async () => {
  const r = await core.chat({ botId, channel: "imessage", customerHandle: "+15550200", text: "yes confirm my order of 1 bag Ethiopia" });
  assert.ok(r.toolCalls.some((t) => t.name === "save_row" && t.ok), JSON.stringify(r.toolCalls));
  const live = rowsOf(orders).filter((x) => x.customer_id === custId(botId, "+15550200"));
  assert.deepEqual(live.map((x) => x.is_test), [0]);
});

await step("a check simulator (another test session) is also test, and counts split", async () => {
  await core.chat({ botId, channel: "imessage", customerHandle: "sim-abc-1", text: "yes please confirm the order", isTest: true });
  assert.deepEqual(T.countRows(orders), { live: 1, test: 2 });
});

const cfg = loadDraft(botId);
const ctxFor = (handle: string, isTest: boolean) => ({ botId, customerId: custId(botId, handle), conversationId: "x", channel: "web", isTest, config: cfg });

await step("find_rows from a test chat sees the REAL catalog row (owner table)", async () => {
  const r: any = await executeTool(cfg.tools.find((t) => t.name === "find_rows"), "find_rows", { table: "Menu" }, ctxFor("owner-preview", true));
  assert.ok(r.ok, JSON.stringify(r));
  assert.ok(JSON.stringify(r.output).includes("Ethiopia Yirgacheffe"), JSON.stringify(r.output));
});

await step("find_rows (mine) in a test chat sees only that session's test order", async () => {
  const r: any = await executeTool(cfg.tools.find((t) => t.name === "find_rows"), "find_rows", { table: "Orders", mine_only: true }, ctxFor("owner-preview", true));
  assert.equal(r.output.rows.length, 1);
  assert.equal(r.output.rows[0].id, rowsOf(orders).find((x) => x.customer_id === custId(botId, "owner-preview"))!.id);
});

await step("runtime reads without a test customer never see test rows", () => {
  const all3 = T.findRows(orders, {});
  assert.equal(all3.length, 1, JSON.stringify(all3));
  assert.equal(T.findRows(orders, { includeTest: true }).length, 3);
  // a test session's view: real rows + only its own test rows, never another session's
  assert.equal(T.findRows(orders, { includeTest: true, testCustomerId: custId(botId, "owner-preview") }).length, 2);
});

await step("a real customer's own lookup stays real-only", async () => {
  const r: any = await executeTool(cfg.tools.find((t) => t.name === "find_rows"), "find_rows", { table: "Orders", mine_only: true }, ctxFor("+15550200", false));
  assert.equal(r.output.rows.length, 1);
});

await step("a test chat can update its own test row but never a real row", () => {
  const mine = rowsOf(orders).find((x) => x.customer_id === custId(botId, "owner-preview"))!;
  const real = rowsOf(orders).find((x) => x.is_test === 0)!;
  assert.ok(T.updateRow(orders, mine.id, { Status: "Paid" }, custId(botId, "owner-preview")));
  assert.equal(T.updateRow(orders, real.id, { Status: "Hacked" }, null, { isTest: true }), null);
  assert.ok(!rowsOf(orders).find((x) => x.id === real.id)!.data_json.includes("Hacked"));
});

await step("0006 backfill rule re-derives the same flags from conversations", () => {
  const before = rowsOf(orders).map((x) => x.is_test);
  run("UPDATE bot_table_rows SET is_test=0");
  const sql = readFileSync(resolve(here, "../../db/migrations/0006_testdata_isolation.sql"), "utf8").match(/UPDATE bot_table_rows[\s\S]*?;/)![0];
  db().exec(sql);
  assert.deepEqual(rowsOf(orders).map((x) => x.is_test), before);
  assert.equal(rowsOf(menu)[0].is_test, 0);
});

await step("clearTestRows deletes only is_test=1 rows of that table", () => {
  assert.equal(T.clearTestRows(orders), 2);
  assert.deepEqual(T.countRows(orders), { live: 1, test: 0 });
  assert.equal(T.countRows(menu).live, 1);
});

console.log(`\n${passed} checks passed`);
