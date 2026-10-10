// Abuse & safety guards (owned by agent production; see launch/production/RUNBOOK.md "Kill switch & limits").
// Everything is env-tunable and checked at call time, so a restart with new env changes behaviour without a code change.
//
//   THREADLINE_KILL     comma list of scopes to switch OFF: all | signups | builds | llm | inbound | outbound
//   Signups/logins      SIGNUP_IP_PER_10MIN (5), SIGNUP_EMAIL_PER_10MIN (3), SIGNUP_GLOBAL_PER_HOUR (100), LOGIN_IP_PER_10MIN (20)
//   Builds (crawls)     BUILDS_PER_DAY_<PLAN> (free 5, starter 20, growth 50, scale 200); pages per crawl: THREADLINE_CRAWL_MAX (40)
//   Messages            MSG_SENDER_PER_MIN (12), MSG_SENDER_PER_HOUR (120), MSG_BOT_PER_MIN (300)
//   LLM spend           LLM_CAP_DAY_<PLAN> / LLM_CAP_MONTH_<PLAN> USD per account; LLM_CAP_GLOBAL_DAY (250) across everyone
import { get, run } from "@threadline/db";
import { planOf } from "./billing.ts";

export type KillScope = "signups" | "builds" | "llm" | "inbound" | "outbound";

export function killed(scope: KillScope): boolean {
  const v = (process.env.THREADLINE_KILL || "").toLowerCase().split(",").map((s) => s.trim());
  return v.includes("all") || v.includes(scope);
}

const num = (name: string, def: number) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && process.env[name] !== "" && process.env[name] !== undefined ? v : def;
};

// ---------- fixed-window counter ----------
let _hits = 0;
/** Counts one hit for `key` in the current window. Returns the count including this hit. */
export function hit(key: string, windowSec: number, nowMs = Date.now()): number {
  const start = Math.floor(nowMs / 1000 / windowSec) * windowSec;
  const r = get<{ count: number }>(
    `INSERT INTO rate_limits(key, window_start, count) VALUES (?, ?, 1)
     ON CONFLICT(key) DO UPDATE SET count = CASE WHEN window_start = excluded.window_start THEN count + 1 ELSE 1 END,
                                    window_start = excluded.window_start
     RETURNING count`, [key, start]);
  if (++_hits % 500 === 0) { try { run("DELETE FROM rate_limits WHERE window_start < ?", [Math.floor(nowMs / 1000) - 2 * 86400]); } catch {} }
  return r?.count ?? 1;
}
/** Current count without incrementing. */
export function peek(key: string, windowSec: number, nowMs = Date.now()): number {
  const start = Math.floor(nowMs / 1000 / windowSec) * windowSec;
  return get<{ count: number }>("SELECT count FROM rate_limits WHERE key=? AND window_start=?", [key, start])?.count ?? 0;
}

export type Verdict = { ok: true } | { ok: false; reason: string; retryAfterSec: number };
const deny = (reason: string, windowSec: number, nowMs = Date.now()): Verdict =>
  ({ ok: false, reason, retryAfterSec: windowSec - (Math.floor(nowMs / 1000) % windowSec) });

// ---------- signups / logins ----------
/** kind: "magic" (email link request), "signup" (password signup), "login" (password login), "oauth" (Google callback).
 *  ip may be "unknown". isNewUser: no account exists for this email yet (only matters for magic/signup/oauth). */
export function allowAuth(kind: "magic" | "signup" | "login" | "oauth", ip: string, email: string, isNewUser: boolean): Verdict {
  const creates = isNewUser && kind !== "login";
  if (creates && killed("signups")) return { ok: false, reason: "signups_paused", retryAfterSec: 3600 };
  if (kind === "oauth") {
    if (creates && peek("signups-global", 3600) >= num("SIGNUP_GLOBAL_PER_HOUR", 100)) return deny("capacity", 3600);
    return { ok: true };
  }
  if (kind === "login") {
    if (hit(`login-ip:${ip}`, 600) > num("LOGIN_IP_PER_10MIN", 20)) return deny("rate", 600);
    if (hit(`login-email:${email}`, 600) > num("LOGIN_EMAIL_PER_10MIN", 10)) return deny("rate", 600);
    return { ok: true };
  }
  if (hit(`auth-ip:${ip}`, 600) > num("SIGNUP_IP_PER_10MIN", 5)) return deny("rate", 600);
  if (hit(`auth-email:${email}`, 600) > num("SIGNUP_EMAIL_PER_10MIN", 3)) return deny("rate", 600);
  if (creates && peek("signups-global", 3600) >= num("SIGNUP_GLOBAL_PER_HOUR", 100)) return deny("capacity", 3600);
  return { ok: true };
}
/** Call once a brand-new account was actually created (feeds the global hourly cap). */
export function countSignup() { hit("signups-global", 3600); }

/** Client IP behind Cloudflare (Worker passes the original headers through to the container). */
export function clientIp(h: { get(name: string): string | null }): string {
  return h.get("cf-connecting-ip") || h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

// ---------- builds (each build crawls up to THREADLINE_CRAWL_MAX pages + ~3 LLM calls) ----------
export class LimitError extends Error {
  code: string;
  constructor(message: string, code: string) { super(message); this.name = new.target.name; this.code = code; }
}
const BUILDS_DEFAULT: Record<string, number> = { free: 5, starter: 20, growth: 50, scale: 200 };
const planOfUser = (userId: string): string => planOf(userId).id;
export function assertBuildAllowed(userId: string) {
  if (killed("builds")) throw new LimitError("Building is paused for maintenance. Try again in a few minutes.", "builds_paused");
  const plan = planOfUser(userId);
  const max = num(`BUILDS_PER_DAY_${plan.toUpperCase()}`, BUILDS_DEFAULT[plan]);
  if (hit(`build:${userId}`, 86400) > max) throw new LimitError(`Daily build limit reached (${max} builds a day on your plan). It resets at 00:00 UTC.`, "build_limit");
}

// ---------- inbound messages per bot ----------
export type MessageVerdict = { ok: true } | { ok: false; notify: boolean; reason: "sender_rate" | "bot_rate" | "paused" };
/** Per customer per bot, and per bot overall. notify=true exactly once per window so the customer hears why. */
export function admitMessage(botId: string, handle: string): MessageVerdict {
  if (killed("inbound")) return { ok: false, notify: false, reason: "paused" };
  const perMin = num("MSG_SENDER_PER_MIN", 12), perHour = num("MSG_SENDER_PER_HOUR", 120), botMin = num("MSG_BOT_PER_MIN", 300);
  const m = hit(`msg:${botId}:${handle}`, 60);
  if (m > perMin) return { ok: false, notify: m === perMin + 1, reason: "sender_rate" };
  const h = hit(`msgh:${botId}:${handle}`, 3600);
  if (h > perHour) return { ok: false, notify: h === perHour + 1, reason: "sender_rate" };
  if (hit(`msgbot:${botId}`, 60) > botMin) return { ok: false, notify: false, reason: "bot_rate" };
  return { ok: true };
}
export const SLOW_DOWN_TEXT = "You're sending messages faster than I can keep up. Give me a minute and try again.";

// ---------- LLM spend cap ----------
// Defaults sit well above the worst-case COGS in launch/gtm/PRICING.md §2 (e.g. Growth: 1,500 conv x $0.048 = $72/mo)
// so they only trip on abuse or a runaway loop.
const CAP_DAY: Record<string, number> = { free: 2, starter: 10, growth: 40, scale: 150 };
const CAP_MONTH: Record<string, number> = { free: 8, starter: 60, growth: 250, scale: 1000 };
export class SpendCapError extends LimitError {}
const spentCache = new Map<string, { at: number; day: number; month: number }>();
const globalCache = { at: 0, day: 0 };

export function spendOf(userId: string, nowMs = Date.now()) {
  const d = new Date(nowMs).toISOString();
  const day = d.slice(0, 10), month = d.slice(0, 7) + "-01";
  const r = get<{ day: number; month: number }>(
    `SELECT COALESCE(SUM(CASE WHEN created_at >= ? THEN cost_usd END),0) AS day, COALESCE(SUM(cost_usd),0) AS month
       FROM usage WHERE user_id=? AND created_at >= ?`, [day, userId, month]);
  return { day: r?.day ?? 0, month: r?.month ?? 0 };
}
export function capsOf(userId: string) {
  const plan = planOfUser(userId), P = plan.toUpperCase();
  return { plan, day: num(`LLM_CAP_DAY_${P}`, CAP_DAY[plan]), month: num(`LLM_CAP_MONTH_${P}`, CAP_MONTH[plan]) };
}
/** Throws SpendCapError when the bot owner (or everyone together) is over the cap. Cached 15s per user to keep it cheap. */
export function assertLlmAllowed(botId: string | null | undefined, nowMs = Date.now()) {
  if (killed("llm")) throw new SpendCapError("AI replies are paused for maintenance.", "llm_paused");
  if (nowMs - globalCache.at > 15_000) {
    globalCache.day = get<{ s: number }>("SELECT COALESCE(SUM(cost_usd),0) s FROM usage WHERE created_at >= ?", [new Date(nowMs).toISOString().slice(0, 10)])?.s ?? 0;
    globalCache.at = nowMs;
  }
  if (globalCache.day >= num("LLM_CAP_GLOBAL_DAY", 250)) throw new SpendCapError("Daily AI budget reached for the whole service.", "llm_global_cap");
  if (!botId) return;
  const userId = get<{ user_id: string }>("SELECT user_id FROM bots WHERE id=?", [botId])?.user_id;
  if (!userId) return;
  let s = spentCache.get(userId);
  if (!s || nowMs - s.at > 15_000) { s = { at: nowMs, ...spendOf(userId, nowMs) }; spentCache.set(userId, s); }
  const caps = capsOf(userId);
  if (s.day >= caps.day) throw new SpendCapError(`Daily AI spend cap reached ($${caps.day}).`, "llm_day_cap");
  if (s.month >= caps.month) throw new SpendCapError(`Monthly AI spend cap reached ($${caps.month}).`, "llm_month_cap");
}
export function _resetCaches() { spentCache.clear(); globalCache.at = 0; }
