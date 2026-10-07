// Public API helpers: Bearer key auth (sha256 lookup), JSON errors.
import "server-only";
import { createHash } from "node:crypto";
import { get, run } from "@threadline/db";

export interface ApiAuth { keyId: string; userId: string; botId: string; canReadNotes: boolean }

export function apiError(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}

/** Returns the auth context, or a Response to send back. */
export function authorize(req: Request, botId: string): ApiAuth | Response {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(\S+)$/i);
  if (!m) return apiError(401, "unauthorized", "Send your key as 'Authorization: Bearer <key>'.");
  const hash = createHash("sha256").update(m[1]!).digest("hex");
  const k = get<{ id: string; user_id: string; bot_id: string | null; can_read_notes: number }>("SELECT id,user_id,bot_id,can_read_notes FROM api_keys WHERE key_hash=?", [hash]);
  if (!k) return apiError(401, "unauthorized", "That API key isn't valid (it may have been revoked).");
  if (k.bot_id && k.bot_id !== botId) return apiError(403, "forbidden", "This key only works for another bot.");
  const bot = get<{ id: string }>("SELECT id FROM bots WHERE id=? AND user_id=?", [botId, k.user_id]);
  if (!bot) return apiError(404, "not_found", "No bot with that id on this account.");
  run("UPDATE api_keys SET last_used_at=datetime('now') WHERE id=?", [k.id]);
  return { keyId: k.id, userId: k.user_id, botId, canReadNotes: !!k.can_read_notes };
}

export function pageParams(req: Request) {
  const u = new URL(req.url);
  const limit = Math.min(200, Math.max(1, Number(u.searchParams.get("limit")) || 50));
  const offset = Math.max(0, Number(u.searchParams.get("offset")) || 0);
  return { limit, offset, url: u };
}
