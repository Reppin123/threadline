// "What your bot keeps": bot_tables + rows. The bot fills `bot` tables from chats; owners fill `owner` tables.
import { run, get, all, id, json } from "@threadline/db";
import type { TableSpec } from "./config.ts";

export function upsertTable(botId: string, t: TableSpec) {
  const ex = get<{ id: string }>("SELECT id FROM bot_tables WHERE bot_id=? AND lower(name)=lower(?)", [botId, t.name]);
  if (ex) {
    run("UPDATE bot_tables SET description=?, columns_json=?, filled_by=? WHERE id=?", [t.description, json.str(t.columns), t.filled_by, ex.id]);
    return ex.id;
  }
  const tid = id("tb_");
  run("INSERT INTO bot_tables(id,bot_id,name,description,columns_json,filled_by) VALUES (?,?,?,?,?,?)", [tid, botId, t.name, t.description, json.str(t.columns), t.filled_by]);
  return tid;
}

export function removeTable(botId: string, name: string) {
  run("DELETE FROM bot_tables WHERE bot_id=? AND lower(name)=lower(?)", [botId, name]);
}

/** Resolve a table by (case-insensitive, singular/plural tolerant) name; recreate from the version spec if the draft dropped it. */
export function tableId(botId: string, name: string, specs: TableSpec[] = []): string | null {
  const n = name.trim().toLowerCase();
  const rows = all<{ id: string; name: string }>("SELECT id,name FROM bot_tables WHERE bot_id=?", [botId]);
  const hit = rows.find((r) => r.name.toLowerCase() === n) ?? rows.find((r) => r.name.toLowerCase().replace(/s$/, "") === n.replace(/s$/, ""));
  if (hit) return hit.id;
  const spec = specs.find((s) => s.name.toLowerCase().replace(/s$/, "") === n.replace(/s$/, ""));
  return spec ? upsertTable(botId, spec) : null;
}

// Test vs live isolation (migration 0006). conversations.is_test is the source of truth: a customer is "testing" when every
// conversation they have is a test one (Build playground "owner-preview", check simulators). Same rule as the 0006 backfill.
export function isTestCustomer(customerId: string | null | undefined): boolean {
  if (!customerId) return false;
  const r = get<{ t: number; l: number }>(
    "SELECT COALESCE(SUM(is_test=1),0) t, COALESCE(SUM(is_test=0),0) l FROM conversations WHERE customer_id=?", [customerId]);
  return !!r && r.t > 0 && r.l === 0;
}

/** Writes stamp is_test: pass ctx.isTest when you have it; otherwise it's derived from the writing customer. */
export function insertRow(tableIdV: string, data: Record<string, unknown>, customerId: string | null, opts: { isTest?: boolean } = {}) {
  const rid = id("row_");
  const isTest = opts.isTest ?? isTestCustomer(customerId);
  run("INSERT INTO bot_table_rows(id,table_id,customer_id,data_json,is_test) VALUES (?,?,?,?,?)", [rid, tableIdV, customerId, json.str(data), isTest ? 1 : 0]);
  return rid;
}

export function updateRow(tableIdV: string, rowId: string, patch: Record<string, unknown>, customerId?: string | null, opts: { isTest?: boolean } = {}) {
  const r = get<{ data_json: string; customer_id: string | null; is_test: number }>("SELECT data_json, customer_id, is_test FROM bot_table_rows WHERE id=? AND table_id=?", [rowId, tableIdV]);
  if (!r) return null;
  if (customerId && r.customer_id && r.customer_id !== customerId) return null; // customers may only edit their own rows
  if (!r.is_test && (opts.isTest ?? isTestCustomer(customerId))) return null;  // a test chat never changes real customers' rows
  const data = { ...json.parse<Record<string, unknown>>(r.data_json, {}), ...patch };
  run("UPDATE bot_table_rows SET data_json=?, updated_at=datetime('now') WHERE id=?", [json.str(data), rowId]);
  return data;
}

/**
 * Reads only real rows by default. includeTest adds test rows — scoped to `testCustomerId` (the test session) when given,
 * so a test chat sees real catalog rows + its own test orders, never another session's. Left undefined, includeTest is
 * derived from customerId (a testing customer's own lookups include their test rows).
 */
export function findRows(tableIdV: string, opts: { query?: string; customerId?: string | null; limit?: number; includeTest?: boolean; testCustomerId?: string | null } = {}) {
  const includeTest = opts.includeTest ?? isTestCustomer(opts.customerId);
  const session = opts.testCustomerId ?? opts.customerId ?? null;
  const where = ["table_id=?"];
  const p: unknown[] = [tableIdV];
  if (opts.customerId) { where.push("customer_id=?"); p.push(opts.customerId); }
  if (!includeTest) where.push("is_test=0");
  else if (session) { where.push("(is_test=0 OR customer_id=?)"); p.push(session); }
  const rows = all<{ id: string; data_json: string; customer_id: string | null; created_at: string }>(
    `SELECT id,data_json,customer_id,created_at FROM bot_table_rows WHERE ${where.join(" AND ")} ORDER BY created_at DESC LIMIT 200`, p);
  const q = opts.query?.toLowerCase().trim();
  return rows
    .map((r) => ({ id: r.id, createdAt: r.created_at, ...json.parse<Record<string, unknown>>(r.data_json, {}) }))
    .filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q))
    .slice(0, opts.limit ?? 20);
}

/** Row counts split by origin (dashboard "Customers | Test data" toggle). */
export function countRows(tableIdV: string): { live: number; test: number } {
  const r = get<{ live: number; test: number }>(
    "SELECT COALESCE(SUM(is_test=0),0) live, COALESCE(SUM(is_test=1),0) test FROM bot_table_rows WHERE table_id=?", [tableIdV]);
  return { live: r?.live ?? 0, test: r?.test ?? 0 };
}

/** "Clear test data": deletes only is_test=1 rows of one table. Returns how many went. */
export function clearTestRows(tableIdV: string): number {
  return Number(run("DELETE FROM bot_table_rows WHERE table_id=? AND is_test=1", [tableIdV]).changes);
}
