// GET  /api/v1/bots/:id/tables/:name/rows — real customers' rows (?rows=test for what the bot saved while you tested it).
// POST /api/v1/bots/:id/tables/:name/rows — add a real row: { "data": { column: value }, "customer_id"?: "..." }.
import { all, get, json, logEvent } from "@/lib/db";
import { apiError, authorize, pageParams } from "@/lib/api";
import { insertLiveRow, rowsMode } from "@/lib/tables";

export const runtime = "nodejs";

function findTable(botId: string, name: string) {
  const table = get<{ id: string; name: string; columns_json: string; filled_by: string }>(
    "SELECT id,name,columns_json,filled_by FROM bot_tables WHERE bot_id=? AND (lower(name)=lower(?) OR id=?)",
    [botId, decodeURIComponent(name), name],
  );
  if (table) return table;
  const names = all<{ name: string }>("SELECT name FROM bot_tables WHERE bot_id=?", [botId]).map((t) => t.name);
  return apiError(404, "not_found", `No table '${name}'. Tables: ${names.join(", ") || "none"}.`);
}

const shape = (r: { id: string; customer_id: string | null; data_json: string; created_at: string; updated_at: string }) =>
  ({ id: r.id, customer_id: r.customer_id, ...json.parse<object>(r.data_json, {}), created_at: r.created_at, updated_at: r.updated_at });

export async function GET(req: Request, { params }: { params: Promise<{ id: string; name: string }> }) {
  const { id: botId, name } = await params;
  const auth = authorize(req, botId);
  if (auth instanceof Response) return auth;
  const table = findTable(botId, name);
  if (table instanceof Response) return table;
  const { limit, offset, url } = pageParams(req);
  const mode = rowsMode(url.searchParams.get("rows"));
  const rows = all<{ id: string; customer_id: string | null; data_json: string; created_at: string; updated_at: string }>(
    "SELECT id,customer_id,data_json,created_at,updated_at FROM bot_table_rows WHERE table_id=? AND is_test=? ORDER BY created_at DESC LIMIT ? OFFSET ?",
    [table.id, mode === "test" ? 1 : 0, limit, offset],
  );
  return Response.json({
    table: { name: table.name, columns: json.parse(table.columns_json, []), filled_by: table.filled_by },
    rows: mode,
    data: rows.map(shape),
    limit, offset,
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string; name: string }> }) {
  const { id: botId, name } = await params;
  const auth = authorize(req, botId);
  if (auth instanceof Response) return auth;
  const table = findTable(botId, name);
  if (table instanceof Response) return table;
  let body: any;
  try { body = await req.json(); } catch { return apiError(400, "bad_json", "Body must be JSON."); }
  const data = body?.data;
  if (!data || typeof data !== "object" || Array.isArray(data) || !Object.keys(data).length)
    return apiError(422, "invalid_data", `'data' must be an object of column → value. Columns: ${json.parse<any[]>(table.columns_json, []).map((c) => c?.name ?? c).join(", ") || "any"}.`);
  if (JSON.stringify(data).length > 20_000) return apiError(422, "invalid_data", "'data' is over 20,000 characters.");
  let customerId: string | null = null;
  if (body.customer_id != null) {
    const c = get<{ id: string }>("SELECT id FROM customers WHERE id=? AND bot_id=?", [String(body.customer_id), botId]);
    if (!c) return apiError(422, "invalid_customer", "'customer_id' isn't a customer of this bot.");
    customerId = c.id;
  }
  const row = insertLiveRow(table.id, data, customerId);
  logEvent(botId, "row_saved", { table: table.name, rowId: row.id, isTest: false, via: "api" });
  return Response.json({ data: shape(row) }, { status: 201 });
}
