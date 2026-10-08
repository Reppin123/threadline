"use server";
import { revalidatePath } from "next/cache";
import { encryptJson, get, logEvent, run } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getBot } from "@/lib/data";
import { extractToken, tokenUsedElsewhere, verifyTelegramToken } from "@/lib/telegram";

export type ConnectTelegramResult = { ok: true; username: string } | { ok: false; error: string };

export async function connectTelegram(botId: string, input: string): Promise<ConnectTelegramResult> {
  const user = await requireUser();
  getBot(user.id, botId);
  const token = extractToken(input);
  const v = await verifyTelegramToken(token);
  if (!v.ok) return v;
  if (tokenUsedElsewhere(token, botId)) {
    return { ok: false, error: `@${v.me.username} is already connected to another Threadline bot. Turn Telegram off there first, or create a new bot with /newbot.` };
  }
  const config = encryptJson({ token, username: v.me.username, tgBotId: v.me.id, name: v.me.first_name, connectedAt: new Date().toISOString() });
  run(
    `INSERT INTO channels(bot_id,channel,status,line_handle,config_json,updated_at) VALUES (?,'telegram','live',?,?,datetime('now'))
     ON CONFLICT(bot_id,channel) DO UPDATE SET status='live', line_handle=excluded.line_handle, config_json=excluded.config_json, updated_at=excluded.updated_at`,
    [botId, `@${v.me.username}`, config],
  );
  const b = get<{ current_version_id: string | null; status: string }>("SELECT current_version_id,status FROM bots WHERE id=?", [botId])!;
  if (b.current_version_id && b.status === "ready") run("UPDATE bots SET status='live' WHERE id=?", [botId]);
  logEvent(botId, "channel_connected", { channel: "telegram", username: v.me.username });
  revalidatePath(`/bots/${botId}`, "layout");
  return { ok: true, username: v.me.username };
}

/** Turns the channel off and forgets the token; the gateway stops polling within a few seconds. */
export async function disconnectTelegram(botId: string) {
  const user = await requireUser();
  getBot(user.id, botId);
  run("UPDATE channels SET status='off', config_json=NULL, updated_at=datetime('now') WHERE bot_id=? AND channel='telegram'", [botId]);
  if (!get("SELECT 1 FROM channels WHERE bot_id=? AND status='live'", [botId])) run("UPDATE bots SET status='ready' WHERE id=? AND status='live'", [botId]);
  logEvent(botId, "channel_disconnected", { channel: "telegram" });
  revalidatePath(`/bots/${botId}`, "layout");
}
