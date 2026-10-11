import "server-only";
import { all, get, id, json, run } from "@/lib/db";

/** Which rows a view shows: what real customers caused ("live") or what the owner's testing left behind ("test"). */
export type RowsMode = "live" | "test";
export const rowsMode = (v: unknown): RowsMode => (v === "test" ? "test" : "live");

export interface TableInfo { id: string; name: string; description: string | null; filled_by: string; columns: string[]; saves7d: number; total: number; test: number; test7d: number }

export function colNames(columnsJson: string | null): string[] {
  const cols = json.parse<any[]>(columnsJson, []);
  return Array.isArray(cols) ? cols.map((c) => (typeof c === "string" ? c : c?.name ?? c?.key ?? String(c))).filter(Boolean) : [];
}

/** saves7d/total count real customers' rows only; test/test7d are the owner's test rows (bot_table_rows.is_test, migration 0006). */
export function tablesOf(botId: string): TableInfo[] {
  return all<Omit<TableInfo, "columns"> & { columns_json: string }>(
    `SELECT t.id,t.name,t.description,t.filled_by,t.columns_json,
       (SELECT count(*) FROM bot_table_rows r WHERE r.table_id=t.id AND r.is_test=0 AND r.created_at >= datetime('now','-7 days')) saves7d,
       (SELECT count(*) FROM bot_table_rows r WHERE r.table_id=t.id AND r.is_test=0) total,
       (SELECT count(*) FROM bot_table_rows r WHERE r.table_id=t.id AND r.is_test=1 AND r.created_at >= datetime('now','-7 days')) test7d,
       (SELECT count(*) FROM bot_table_rows r WHERE r.table_id=t.id AND r.is_test=1) test
     FROM bot_tables t WHERE t.bot_id=? ORDER BY t.created_at`,
    [botId],
  ).map(({ columns_json, ...t }) => ({ ...t, columns: colNames(columns_json) }));
}

export function rowsOf(tableId: string, limit = 200, mode: RowsMode = "live") {
  return all<{ id: string; customer_id: string | null; data_json: string; created_at: string }>(
    "SELECT id,customer_id,data_json,created_at FROM bot_table_rows WHERE table_id=? AND is_test=? ORDER BY created_at DESC LIMIT ?",
    [tableId, mode === "test" ? 1 : 0, limit],
  ).map((r) => ({ id: r.id, customer_id: r.customer_id, created_at: r.created_at, data: json.parse<Record<string, unknown>>(r.data_json, {}) }));
}

/** A real row written by the owner (dashboard editor or the public API). Never a test row. */
export function insertLiveRow(tableId: string, data: Record<string, unknown>, customerId: string | null = null) {
  const rid = id("row_");
  run("INSERT INTO bot_table_rows(id,table_id,customer_id,data_json,is_test) VALUES (?,?,?,?,0)", [rid, tableId, customerId, json.str(data)]);
  return get<{ id: string; customer_id: string | null; data_json: string; created_at: string; updated_at: string }>(
    "SELECT id,customer_id,data_json,created_at,updated_at FROM bot_table_rows WHERE id=?", [rid])!;
}

/** "Clear test data" for one table: deletes only is_test=1 rows. */
export function clearTestRows(tableId: string): number {
  return Number(run("DELETE FROM bot_table_rows WHERE table_id=? AND is_test=1", [tableId]).changes);
}
