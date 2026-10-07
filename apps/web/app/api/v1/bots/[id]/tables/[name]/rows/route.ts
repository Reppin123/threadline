import { all, get, json } from "@/lib/db";
import { apiError, authorize, pageParams } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string; name: string }> }) {
  const { id: botId, name } = await params;
  const auth = authorize(req, botId);
  if (auth instanceof Response) return auth;
  const table = get<{ id: string; name: string; columns_json: string; filled_by: string }>(
    "SELECT id,name,columns_json,filled_by FROM bot_tables WHERE bot_id=? AND (lower(name)=lower(?) OR id=?)",
    [botId, decodeURIComponent(name), name],
  );
  if (!table) {
    const names = all<{ name: string }>("SELECT name FROM bot_tables WHERE bot_id=?", [botId]).map((t) => t.name);
    return apiError(404, "not_found", `No table '${name}'. Tables: ${names.join(", ") || "none"}.`);
  }
  const { limit, offset } = pageParams(req);
  const rows = all<{ id: string; customer_id: string | null; data_json: string; created_at: string; updated_at: string }>(
    "SELECT id,customer_id,data_json,created_at,updated_at FROM bot_table_rows WHERE table_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?",
    [table.id, limit, offset],
  );
  return Response.json({
    table: { name: table.name, columns: json.parse(table.columns_json, []), filled_by: table.filled_by },
    data: rows.map((r) => ({ id: r.id, customer_id: r.customer_id, ...json.parse<object>(r.data_json, {}), created_at: r.created_at, updated_at: r.updated_at })),
    limit, offset,
  });
}
