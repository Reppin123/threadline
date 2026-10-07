// Read models for the logged-in app. All queries are scoped to the signed-in user.
import "server-only";
import { notFound } from "next/navigation";
import { all, get, json } from "@/lib/db";
import type { BotProfile, BuildProgress } from "@threadline/core";

export interface BotRow {
  id: string; user_id: string; name: string; slug: string; join_code: string; source_kind: string; source_json: string; status: string;
  build_progress_json: string | null; profile_json: string | null; mock_mode: number; web_access: number; languages: string;
  current_version_id: string | null; draft_dirty: number; created_at: string; updated_at: string; wizard_json: string | null;
}

export function getBot(userId: string, botId: string): BotRow {
  const b = get<BotRow>("SELECT * FROM bots WHERE id=? AND user_id=?", [botId, userId]);
  if (!b) notFound();
  return b;
}
export function profileOf(b: BotRow): Partial<BotProfile> {
  return json.parse<Partial<BotProfile>>(b.profile_json, {});
}
export function progressOf(b: BotRow): BuildProgress | null {
  return json.parse<BuildProgress | null>(b.build_progress_json, null);
}
export function listBotsBasic(userId: string) {
  return all<{ id: string; name: string; status: string }>("SELECT id,name,status FROM bots WHERE user_id=? ORDER BY created_at DESC", [userId]);
}

export function channelsOf(botId: string) {
  return all<{ channel: string; status: string; line_handle: string | null; config_json: string | null; updated_at: string }>(
    "SELECT channel,status,line_handle,config_json,updated_at FROM channels WHERE bot_id=?",
    [botId],
  );
}
export function liveChannels(botId: string): string[] {
  return channelsOf(botId).filter((c) => c.status === "live").map((c) => c.channel);
}

export function lastNDays(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) out.push(new Date(d.getTime() - i * 864e5).toISOString().slice(0, 10));
  return out;
}

export function chatsPerDay(botId: string, days = 14): number[] {
  const rows = all<{ d: string; n: number }>(
    "SELECT date(started_at) d, count(*) n FROM conversations WHERE bot_id=? AND is_test=0 AND date(started_at) >= date('now', ?) GROUP BY d",
    [botId, `-${days - 1} days`],
  );
  const m = new Map(rows.map((r) => [r.d, r.n]));
  return lastNDays(days).map((d) => m.get(d) ?? 0);
}

export function botCardStats(botId: string) {
  const week = get<{ n: number }>("SELECT count(*) n FROM conversations WHERE bot_id=? AND is_test=0 AND started_at >= datetime('now','-7 days')", [botId])!.n;
  const spent = get<{ s: number }>("SELECT COALESCE(SUM(cost_usd),0) s FROM usage WHERE bot_id=? AND date(created_at) >= date('now','start of month')", [botId])!.s;
  const scheduled = get<{ n: number }>("SELECT count(*) n FROM scheduled_messages WHERE bot_id=? AND status='scheduled'", [botId])!.n;
  const problems = get<{ n: number }>("SELECT count(*) n FROM conversations WHERE bot_id=? AND is_test=0 AND (problem=1 OR couldnt_answer=1) AND started_at >= datetime('now','-7 days')", [botId])!.n;
  return { week, spent, scheduled, problems, perDay: chatsPerDay(botId) };
}

export function trialOf(userId: string) {
  const u = get<{ trial_credit_usd: number; plan: string }>("SELECT trial_credit_usd, plan FROM users WHERE id=?", [userId])!;
  const used = get<{ s: number }>("SELECT COALESCE(SUM(cost_usd),0) s FROM usage WHERE user_id=?", [userId])!.s;
  const recent = get<{ s: number }>("SELECT COALESCE(SUM(cost_usd),0) s FROM usage WHERE user_id=? AND created_at >= datetime('now','-14 days')", [userId])!.s;
  const credit = u.trial_credit_usd ?? 1.5;
  const left = Math.max(0, credit - used);
  const perDay = recent / 14;
  const daysLeft = perDay > 0 ? Math.floor(left / perDay) : null;
  const pct = credit > 0 ? Math.min(100, Math.round((used / credit) * 100)) : 100;
  return { credit, used, left, pct, daysLeft, plan: u.plan };
}

export function money(n: number) {
  if (n > 0 && n < 0.01) return "<$0.01";
  return "$" + n.toFixed(2);
}

export const CHANNEL_LABEL: Record<string, string> = { imessage: "iMessage", telegram: "Telegram", whatsapp: "WhatsApp", web: "Web", terminal: "Terminal" };

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = Date.parse(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  if (Number.isNaN(t)) return iso;
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = Date.parse(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  return Number.isNaN(t) ? iso : new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
