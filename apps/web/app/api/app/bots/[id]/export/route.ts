import { all, get, json } from "@threadline/db";
import { currentUser } from "@/lib/auth";
import { rowsOf, tablesOf } from "@/lib/tables";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csv(rows: Record<string, unknown>[]) {
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const esc = (v: unknown) => { const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  const bot = user && get<{ id: string; name: string; slug: string }>("SELECT id,name,slug FROM bots WHERE id=? AND user_id=?", [id, user.id]);
  if (!bot) return new Response("Not found", { status: 404 });
  const format = new URL(req.url).searchParams.get("format");
  const tables = tablesOf(id).map((t) => ({ name: t.name, description: t.description, filled_by: t.filled_by, columns: t.columns, rows: rowsOf(t.id, 100000).map((r) => ({ id: r.id, customer_id: r.customer_id, created_at: r.created_at, ...r.data })) }));
  if (format === "csv") {
    const table = new URL(req.url).searchParams.get("table");
    const t = tables.find((x) => x.name === table) ?? tables[0];
    return new Response(t ? csv(t.rows) : "", { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${bot.slug}-${(t?.name ?? "table").replace(/\W+/g, "-")}.csv"` } });
  }
  const customers = all<any>("SELECT id,channel,handle,display_name,first_seen,last_seen FROM customers WHERE bot_id=? AND handle!='owner-preview'", [id]).map((c) => ({
    ...c, memories: all("SELECT key,value,updated_at FROM memories WHERE customer_id=?", [c.id]),
  }));
  const conversations = all<any>("SELECT id,customer_id,channel,started_at,last_message_at,intent,outcome FROM conversations WHERE bot_id=? AND is_test=0", [id]).map((c) => ({
    ...c, messages: all("SELECT role,content,tool_name,tool_input_json,tool_output_json,created_at FROM messages WHERE conversation_id=? ORDER BY created_at, rowid", [c.id]),
  }));
  const scheduled = all("SELECT id,customer_id,channel,prompt,text,send_at,status,sent_at FROM scheduled_messages WHERE bot_id=?", [id]);
  const body = json.str({ exported_at: new Date().toISOString(), bot: { id: bot.id, name: bot.name }, tables, customers, conversations, scheduled });
  return new Response(body, { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${bot.slug}-export.json"` } });
}
