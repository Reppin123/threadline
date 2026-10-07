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

export function insertRow(tableIdV: string, data: Record<string, unknown>, customerId: string | null) {
  const rid = id("row_");
  run("INSERT INTO bot_table_rows(id,table_id,customer_id,data_json) VALUES (?,?,?,?)", [rid, tableIdV, customerId, json.str(data)]);
  return rid;
}

export function updateRow(tableIdV: string, rowId: string, patch: Record<string, unknown>, customerId?: string | null) {
  const r = get<{ data_json: string; customer_id: string | null }>("SELECT data_json, customer_id FROM bot_table_rows WHERE id=? AND table_id=?", [rowId, tableIdV]);
  if (!r) return null;
  if (customerId && r.customer_id && r.customer_id !== customerId) return null; // customers may only edit their own rows
  const data = { ...json.parse<Record<string, unknown>>(r.data_json, {}), ...patch };
  run("UPDATE bot_table_rows SET data_json=?, updated_at=datetime('now') WHERE id=?", [json.str(data), rowId]);
  return data;
}

export function findRows(tableIdV: string, opts: { query?: string; customerId?: string | null; limit?: number } = {}) {
  const rows = all<{ id: string; data_json: string; customer_id: string | null; created_at: string }>(
    `SELECT id,data_json,customer_id,created_at FROM bot_table_rows WHERE table_id=? ${opts.customerId ? "AND customer_id=?" : ""} ORDER BY created_at DESC LIMIT 200`,
    opts.customerId ? [tableIdV, opts.customerId] : [tableIdV]);
  const q = opts.query?.toLowerCase().trim();
  return rows
    .map((r) => ({ id: r.id, createdAt: r.created_at, ...json.parse<Record<string, unknown>>(r.data_json, {}) }))
    .filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q))
    .slice(0, opts.limit ?? 20);
}
