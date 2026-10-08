// Telegram bot tokens: validated with getMe, stored encrypted in channels(bot_id,'telegram').config_json. Server-only.
// The gateway (apps/gateway/src/telegram.ts) long-polls every live token; nothing here talks to customers.
import { all, decryptJson } from "@/lib/db";

export const TOKEN_RE = /^\d{5,15}:[A-Za-z0-9_-]{30,50}$/;

export interface TelegramMe { id: number; username: string; first_name: string }
export type VerifyResult = { ok: true; me: TelegramMe } | { ok: false; error: string };

const apiBase = () => (process.env.TELEGRAM_API_BASE || "https://api.telegram.org").replace(/\/+$/, "");

/** Accepts the whole BotFather message too: pulls the token out of it. */
export function extractToken(input: string): string {
  const m = /\d{5,15}:[A-Za-z0-9_-]{30,50}/.exec(input);
  return (m ? m[0] : input).trim();
}

export async function verifyTelegramToken(token: string): Promise<VerifyResult> {
  if (!TOKEN_RE.test(token)) {
    return { ok: false, error: "That doesn't look like a bot token. BotFather sends it after /newbot — it looks like 123456789:AAH4k…" };
  }
  let body: { ok?: boolean; result?: TelegramMe & { is_bot?: boolean }; error_code?: number; description?: string };
  try {
    const res = await fetch(`${apiBase()}/bot${token}/getMe`, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
    body = await res.json();
  } catch {
    return { ok: false, error: "Couldn't reach Telegram to check the token. Try again in a moment." };
  }
  if (body.ok && body.result?.username) return { ok: true, me: { id: body.result.id, username: body.result.username, first_name: body.result.first_name } };
  if (body.error_code === 401 || body.error_code === 404) {
    return { ok: false, error: "Telegram says this token isn't valid. It may have been revoked — copy it again from @BotFather (/mybots → your bot → API Token)." };
  }
  return { ok: false, error: `Telegram didn't accept the token${body.description ? ` (${body.description})` : ""}.` };
}

export interface TelegramConfig { token?: string; username?: string; tgBotId?: number; name?: string; connectedAt?: string }
export const telegramConfig = (configJson: string | null | undefined): TelegramConfig => {
  try { return decryptJson<TelegramConfig>(configJson, {}); } catch { return {}; }
};

/** Another Threadline bot already polling this Telegram bot? (Two pollers on one token knock each other off.) */
export function tokenUsedElsewhere(token: string, botId: string): string | null {
  const rows = all<{ bot_id: string; config_json: string | null }>(
    "SELECT bot_id, config_json FROM channels WHERE channel='telegram' AND status='live' AND bot_id<>?", [botId]);
  return rows.find((r) => telegramConfig(r.config_json).token === token)?.bot_id ?? null;
}
