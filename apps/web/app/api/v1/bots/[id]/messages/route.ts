// POST /api/v1/bots/:id/messages — schedule an outbound message the bot writes itself from `prompt`.
// The gateway's outbound worker delivers it at send_at (default: now).
import { get, id as newId, run, logEvent } from "@/lib/db";
import { apiError, authorize } from "@/lib/api";
import { billing } from "@/lib/billing";

export const runtime = "nodejs";
const CHANNELS = ["imessage", "telegram", "whatsapp", "web", "terminal"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: botId } = await params;
  const auth = authorize(req, botId);
  if (auth instanceof Response) return auth;
  let body: any;
  try { body = await req.json(); } catch { return apiError(400, "bad_json", "Body must be JSON."); }
  const to = String(body?.to ?? "");
  const prompt = String(body?.prompt ?? "").trim();
  const m = to.match(/^([a-z]+):(.+)$/i);
  if (!m || !CHANNELS.includes(m[1]!.toLowerCase())) return apiError(422, "invalid_to", `'to' must look like "imessage:+15551234567" (channels: ${CHANNELS.join(", ")}).`);
  if (!prompt) return apiError(422, "invalid_prompt", "'prompt' is required: tell the bot what to say.");
  if (prompt.length > 4000) return apiError(422, "invalid_prompt", "'prompt' is over 4000 characters.");
  const channel = m[1]!.toLowerCase();
  const handle = m[2]!.trim();
  // billing: plan must include the channel and have allowance left (the gateway counts the message when it sends).
  const owner = billing.ownerOf(botId);
  if (owner) {
    const ch = billing.canUseChannel(owner, channel);
    if (!ch.ok) return apiError(403, "plan_channel", ch.message);
    const q = billing.canSendMessage(owner);
    if (!q.ok) return apiError(402, "quota_exceeded", q.message);
  }
  let sendAt = new Date();
  if (body.send_at != null) {
    const t = new Date(body.send_at);
    if (Number.isNaN(t.getTime())) return apiError(422, "invalid_send_at", "'send_at' must be an ISO 8601 time.");
    sendAt = t;
  }
  const idem = req.headers.get("idempotency-key")?.slice(0, 200) || null;
  if (idem) {
    const prev = get<any>("SELECT id,status,send_at,channel,created_at FROM scheduled_messages WHERE bot_id=? AND idempotency_key=?", [botId, idem]);
    if (prev) return Response.json({ id: prev.id, status: prev.status, send_at: prev.send_at, to, idempotent_replay: true }, { status: 200 });
  }
  let cust = get<{ id: string }>("SELECT id FROM customers WHERE bot_id=? AND channel=? AND handle=?", [botId, channel, handle]);
  if (!cust) {
    cust = { id: newId("cu_") };
    run("INSERT INTO customers(id,bot_id,channel,handle) VALUES (?,?,?,?)", [cust.id, botId, channel, handle]);
  }
  const mid = newId("sm_");
  try {
    run("INSERT INTO scheduled_messages(id,bot_id,customer_id,channel,prompt,send_at,idempotency_key) VALUES (?,?,?,?,?,?,?)", [mid, botId, cust.id, channel, prompt, sendAt.toISOString(), idem]);
  } catch (e) {
    const prev = idem && get<any>("SELECT id,status,send_at FROM scheduled_messages WHERE bot_id=? AND idempotency_key=?", [botId, idem]);
    if (prev) return Response.json({ id: prev.id, status: prev.status, send_at: prev.send_at, to, idempotent_replay: true }, { status: 200 });
    throw e;
  }
  logEvent(botId, "api_message_scheduled", { channel, keyId: auth.keyId });
  return Response.json({ id: mid, status: "scheduled", send_at: sendAt.toISOString(), to }, { status: 202 });
}
