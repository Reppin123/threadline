import { all, get } from "@threadline/db";
import { authorize, pageParams } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: botId } = await params;
  const auth = authorize(req, botId);
  if (auth instanceof Response) return auth;
  const { limit, offset } = pageParams(req);
  const rows = all<any>("SELECT id,channel,handle,display_name,first_seen,last_seen FROM customers WHERE bot_id=? AND handle!='owner-preview' ORDER BY last_seen DESC LIMIT ? OFFSET ?", [botId, limit, offset]);
  const data = rows.map((c) => ({
    ...c,
    to: `${c.channel}:${c.handle}`,
    ...(auth.canReadNotes ? { notes: Object.fromEntries(all<{ key: string; value: string }>("SELECT key,value FROM memories WHERE customer_id=?", [c.id]).map((m) => [m.key, m.value])) } : {}),
  }));
  const total = get<{ n: number }>("SELECT count(*) n FROM customers WHERE bot_id=? AND handle!='owner-preview'", [botId])!.n;
  return Response.json({ data, total, limit, offset });
}
