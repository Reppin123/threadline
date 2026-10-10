// Plans, monthly message metering and plan gates. Pure DB logic, no Stripe calls (see billing-stripe.ts).
// A "message" = one customer message the bot answers on a real channel, or one bot-initiated (scheduled/API) message sent.
// Playground and simulated-user checks never count: they are billed against the trial credit instead.
import { get, run, logEvent } from "@threadline/db";

export type PlanId = "free" | "pro" | "business";

export interface Plan {
  id: PlanId;
  name: string;
  priceUsd: number | null;          // monthly, null = custom
  messagesPerMonth: number | null;  // null = unlimited (fair use)
  bots: number | null;              // null = unlimited
  channels: string[];               // channels a bot may be live on
  lookupKey?: string;               // Stripe price lookup_key
  blurb: string;
}

// Source of truth for limits. Keep launch/billing/PLANS.md in sync.
export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free", name: "Free", priceUsd: 0, messagesPerMonth: 100, bots: 1,
    channels: ["telegram", "web", "terminal"],
    blurb: "Telegram and the playground, 100 messages a month, 1 bot.",
  },
  pro: {
    id: "pro", name: "Pro", priceUsd: 29, messagesPerMonth: 2000, bots: 3,
    channels: ["imessage", "telegram", "web", "terminal"], lookupKey: "threadline_pro_monthly",
    blurb: "iMessage on the shared Threadline line plus Telegram, 2,000 messages a month, 3 bots.",
  },
  business: {
    id: "business", name: "Business", priceUsd: null, messagesPerMonth: null, bots: null,
    channels: ["imessage", "telegram", "whatsapp", "web", "terminal"],
    blurb: "A dedicated iMessage number for your brand, custom volume, priority support.",
  },
};

export const CHANNEL_NAMES: Record<string, string> = { imessage: "iMessage", telegram: "Telegram", whatsapp: "WhatsApp", web: "Web", terminal: "Terminal" };

export function asPlanId(p: string | null | undefined): PlanId {
  return p === "pro" || p === "business" ? p : "free";
}

/** Effective plan. users.plan is kept in sync by the Stripe webhook; BILLING_DEFAULT_PLAN lifts everyone without a
 *  paid plan (pilots, demos, self-hosting) and never lowers a paid one. */
export function planOf(userId: string): Plan {
  const u = get<{ plan: string }>("SELECT plan FROM users WHERE id=?", [userId]);
  const own = asPlanId(u?.plan);
  const floor = asPlanId(process.env.BILLING_DEFAULT_PLAN);
  const rank: Record<PlanId, number> = { free: 0, pro: 1, business: 2 };
  return PLANS[rank[floor] > rank[own] ? floor : own];
}

export function ownerOf(botId: string): string | undefined {
  return get<{ user_id: string }>("SELECT user_id FROM bots WHERE id=?", [botId])?.user_id;
}

/** Calendar month in UTC, e.g. "2026-10". Allowances reset at 00:00 UTC on the 1st. */
export function periodKey(d = new Date()): string {
  return d.toISOString().slice(0, 7);
}
export function periodResetsAt(d = new Date()): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString();
}

export function messagesUsed(userId: string, period = periodKey()): number {
  return get<{ messages: number }>("SELECT messages FROM message_counters WHERE user_id=? AND period=?", [userId, period])?.messages ?? 0;
}

export interface UsageSummary {
  plan: Plan; period: string; resetsAt: string;
  used: number; limit: number | null; left: number | null; pct: number;
  over: boolean; nearLimit: boolean; blocked: number;
  bots: number; botLimit: number | null;
  imessageBotsOffPlan: number;      // bots live on a channel the plan doesn't include (e.g. after a downgrade)
}

export function usageSummary(userId: string): UsageSummary {
  const plan = planOf(userId);
  const period = periodKey();
  const row = get<{ messages: number; blocked: number }>("SELECT messages, blocked FROM message_counters WHERE user_id=? AND period=?", [userId, period]);
  const used = row?.messages ?? 0;
  const limit = plan.messagesPerMonth;
  const bots = get<{ n: number }>("SELECT COUNT(*) n FROM bots WHERE user_id=?", [userId])!.n;
  const off = get<{ n: number }>(
    `SELECT COUNT(DISTINCT c.bot_id) n FROM channels c JOIN bots b ON b.id=c.bot_id WHERE b.user_id=? AND c.status='live'
       AND c.channel NOT IN (${plan.channels.map(() => "?").join(",")})`, [userId, ...plan.channels])!.n;
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return {
    plan, period, resetsAt: periodResetsAt(), used, limit, left: limit === null ? null : Math.max(0, limit - used), pct,
    over: limit !== null && used >= limit, nearLimit: limit !== null && used >= limit * 0.8 && used < limit,
    blocked: row?.blocked ?? 0, bots, botLimit: plan.bots, imessageBotsOffPlan: off,
  };
}

export type Gate = { ok: true; plan: Plan } | { ok: false; plan: Plan; reason: "quota" | "channel" | "bots"; message: string };

export function channelAllowed(plan: Plan, channel: string): boolean {
  return plan.channels.includes(channel);
}

/** Can this owner put a bot live on `channel`? (web Deploy page) */
export function canUseChannel(userId: string, channel: string): Gate {
  const plan = planOf(userId);
  if (channelAllowed(plan, channel)) return { ok: true, plan };
  const need = channel === "whatsapp" ? "Business" : "Pro";
  return { ok: false, plan, reason: "channel", message: `${CHANNEL_NAMES[channel] ?? channel} is on the ${need} plan. Upgrade on the Billing page to turn it on.` };
}

/** Can this owner create another bot? */
export function canCreateBot(userId: string): Gate {
  const plan = planOf(userId);
  if (plan.bots === null) return { ok: true, plan };
  const n = get<{ n: number }>("SELECT COUNT(*) n FROM bots WHERE user_id=?", [userId])!.n;
  if (n < plan.bots) return { ok: true, plan };
  return { ok: false, plan, reason: "bots", message: `The ${plan.name} plan includes ${plan.bots} bot${plan.bots === 1 ? "" : "s"}. Delete one or upgrade on the Billing page to add more.` };
}

/** Read-only check: is there allowance left for one more message? */
export function canSendMessage(userId: string): Gate {
  const plan = planOf(userId);
  if (plan.messagesPerMonth === null || messagesUsed(userId) < plan.messagesPerMonth) return { ok: true, plan };
  return { ok: false, plan, reason: "quota", message: `You've used all ${plan.messagesPerMonth.toLocaleString("en-US")} messages on the ${plan.name} plan this month. Upgrade on the Billing page, or wait for the reset on the 1st.` };
}

/** Atomically count one message against the bot owner's monthly allowance. Returns a failed gate (nothing counted)
 *  when the plan doesn't include the channel or the allowance is used up. */
export function consumeMessage(botId: string, channel: string): Gate {
  const userId = ownerOf(botId);
  if (!userId) return { ok: true, plan: PLANS.free };   // unknown bot: let the caller's own checks handle it
  const plan = planOf(userId);
  const period = periodKey();
  if (!channelAllowed(plan, channel)) {
    bumpBlocked(userId, period);
    logEvent(botId, "plan_channel_blocked", { channel, plan: plan.id });
    return { ok: false, plan, reason: "channel", message: `${CHANNEL_NAMES[channel] ?? channel} is not on the ${plan.name} plan.` };
  }
  run("INSERT INTO message_counters(user_id, period, messages) VALUES (?,?,0) ON CONFLICT(user_id, period) DO NOTHING", [userId, period]);
  const limit = plan.messagesPerMonth;
  const res = limit === null
    ? run("UPDATE message_counters SET messages = messages + 1 WHERE user_id=? AND period=?", [userId, period])
    : run("UPDATE message_counters SET messages = messages + 1 WHERE user_id=? AND period=? AND messages < ?", [userId, period, limit]);
  if (Number(res.changes) === 1) {
    if (limit !== null && messagesUsed(userId, period) === Math.ceil(limit * 0.8)) logEvent(botId, "quota_warning", { plan: plan.id, limit });
    return { ok: true, plan };
  }
  if (bumpBlocked(userId, period) === 1) logEvent(botId, "quota_exceeded", { plan: plan.id, limit });
  return { ok: false, plan, reason: "quota", message: `Monthly limit of ${limit} messages reached on the ${plan.name} plan.` };
}

function bumpBlocked(userId: string, period: string): number {
  run(`INSERT INTO message_counters(user_id, period, messages, blocked) VALUES (?,?,0,1)
       ON CONFLICT(user_id, period) DO UPDATE SET blocked = blocked + 1`, [userId, period]);
  return get<{ blocked: number }>("SELECT blocked FROM message_counters WHERE user_id=? AND period=?", [userId, period])!.blocked;
}

/** What the customer sees when the bot can't answer for plan reasons. Returns null if this customer was already told today. */
export function overLimitReply(botId: string, handle: string, botName: string, reason: "quota" | "channel" | "bots"): string | null {
  const day = new Date().toISOString().slice(0, 10);
  const res = run("INSERT INTO quota_notices(bot_id, handle, day) VALUES (?,?,?) ON CONFLICT DO NOTHING", [botId, handle, day]);
  if (Number(res.changes) !== 1) return null;
  return reason === "quota"
    ? `Thanks for your message! ${botName} has hit its monthly message limit, so it can't reply right now. The team has been told and will get back to you soon.`
    : `Thanks for your message! ${botName} isn't available on this app right now. The team has been told and will get back to you soon.`;
}
