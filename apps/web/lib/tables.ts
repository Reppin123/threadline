import "server-only";
import { all, json } from "@/lib/db";

export interface TableInfo { id: string; name: string; description: string | null; filled_by: string; columns: string[]; saves7d: number; total: number }

export function colNames(columnsJson: string | null): string[] {
  const cols = json.parse<any[]>(columnsJson, []);
  return Array.isArray(cols) ? cols.map((c) => (typeof c === "string" ? c : c?.name ?? c?.key ?? String(c))).filter(Boolean) : [];
}

export function tablesOf(botId: string): TableInfo[] {
  return all<{ id: string; name: string; description: string | null; filled_by: string; columns_json: string; saves7d: number; total: number }>(
    `SELECT t.id,t.name,t.description,t.filled_by,t.columns_json,
       (SELECT count(*) FROM bot_table_rows r WHERE r.table_id=t.id AND r.created_at >= datetime('now','-7 days')) saves7d,
       (SELECT count(*) FROM bot_table_rows r WHERE r.table_id=t.id) total
     FROM bot_tables t WHERE t.bot_id=? ORDER BY t.created_at`,
    [botId],
  ).map((t) => ({ ...t, columns: colNames(t.columns_json) }));
}

export function rowsOf(tableId: string, limit = 200) {
  return all<{ id: string; customer_id: string | null; data_json: string; created_at: string }>(
    "SELECT id,customer_id,data_json,created_at FROM bot_table_rows WHERE table_id=? ORDER BY created_at DESC LIMIT ?",
    [tableId, limit],
  ).map((r) => ({ id: r.id, customer_id: r.customer_id, created_at: r.created_at, data: json.parse<Record<string, unknown>>(r.data_json, {}) }));
}
