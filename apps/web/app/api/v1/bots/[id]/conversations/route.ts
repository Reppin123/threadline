import { all, get } from "@threadline/db";
import { authorize, pageParams } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: botId } = await params;
  const auth = authorize(req, botId);
  if (auth instanceof Response) return auth;
  const { limit, offset, url } = pageParams(req);
  const customer = url.searchParams.get("customer_id");
  const withMessages = url.searchParams.get("messages") !== "0";
  const rows = all<any>(
    `SELECT c.id,c.channel,c.customer_id,cu.handle,c.started_at,c.last_message_at,c.intent,c.outcome,c.couldnt_answer,c.problem
     FROM conversations c JOIN customers cu ON cu.id=c.customer_id WHERE c.bot_id=? AND c.is_test=0 ${customer ? "AND c.customer_id=?" : ""}
     ORDER BY c.last_message_at DESC LIMIT ? OFFSET ?`,
    customer ? [botId, customer, limit, offset] : [botId, limit, offset],
  );
  const data = rows.map((c) => ({
    ...c,
    couldnt_answer: !!c.couldnt_answer,
    problem: !!c.problem,
    ...(withMessages ? { messages: all("SELECT role,content,tool_name,created_at FROM messages WHERE conversation_id=? AND role IN ('user','assistant','tool') ORDER BY created_at, rowid LIMIT 200", [c.id]) } : {}),
  }));
  const total = get<{ n: number }>("SELECT count(*) n FROM conversations WHERE bot_id=? AND is_test=0", [botId])!.n;
  return Response.json({ data, total, limit, offset });
}
