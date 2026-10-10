// Plans, per-conversation metering and plan gates. Pure DB logic, no Stripe calls (see billing-stripe.ts).
// Pricing is gtm's decision (launch/gtm/PRICING.md §3). The meter is a CONVERSATION: one customer thread on one channel with
// at least one bot reply; a new one starts after 6h of silence (core's openConversation rule). Playground, simulated-user
// checks and Free-plan iMessage test phones never count.
import { get, all, run, tx, logEvent } from "@threadline/db";

export type PlanId = "free" | "starter" | "growth" | "scale";
export type Interval = "month" | "year";

export interface Plan {
  id: PlanId;
  name: string;
  priceUsd: number | null;               // monthly list price; null = custom
  yearlyPerMonthUsd: number | null;      // billed yearly, per month
  includedConversations: number | null;  // per calendar month; null = unlimited
  overageUsd: number | null;             // per conversation past the included ones; null = hard stop
  bots: number | null;                   // null = unlimited
  channels: string[];                    // channels a bot may answer customers on
  imessageTestPhones: number;            // Free: iMessage only to the owner's first N phones (never counted)
  api: boolean;
  selfServe: boolean;                    // sold through Stripe Checkout
  lookupKeys?: { month: string; year: string; overage: string };
  blurb: string;
}

const WEB = ["web", "terminal"];
// Source of truth for limits. Keep launch/billing/PLANS.md in sync.
export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free", name: "Free", priceUsd: 0, yearlyPerMonthUsd: null, includedConversations: 50, overageUsd: null, bots: 1,
    channels: ["telegram", ...WEB], imessageTestPhones: 5, api: false, selfServe: false,
    blurb: "1 bot, 50 conversations a month, Telegram live, iMessage to you and 5 test phones.",
  },
  starter: {
    id: "starter", name: "Starter", priceUsd: 29, yearlyPerMonthUsd: 24, includedConversations: 300, overageUsd: 0.15, bots: 1,
    channels: ["imessage", "telegram", ...WEB], imessageTestPhones: 0, api: true, selfServe: true,
    lookupKeys: { month: "threadline_starter_monthly", year: "threadline_starter_yearly", overage: "threadline_starter_overage" },
    blurb: "1 bot, 300 conversations a month, iMessage (shared Threadline numbers) and Telegram, API.",
  },
  growth: {
    id: "growth", name: "Growth", priceUsd: 149, yearlyPerMonthUsd: 124, includedConversations: 1500, overageUsd: 0.10, bots: 3,
    channels: ["imessage", "telegram", "whatsapp", ...WEB], imessageTestPhones: 0, api: true, selfServe: true,
    lookupKeys: { month: "threadline_growth_monthly", year: "threadline_growth_yearly", overage: "threadline_growth_overage" },
    blurb: "3 bots, 1,500 conversations a month, iMessage, Telegram and WhatsApp when it ships, helpdesk handoff.",
  },
  scale: {
    id: "scale", name: "Scale", priceUsd: 599, yearlyPerMonthUsd: null, includedConversations: 6000, overageUsd: 0.08, bots: null,
    channels: ["imessage", "telegram", "whatsapp", ...WEB], imessageTestPhones: 0, api: true, selfServe: false,
    blurb: "From $599/mo: 6,000+ conversations, unlimited bots, a dedicated iMessage number included, Slack support.",
  },
};

export const ADDONS = {
  extraBot: { name: "Extra bot", priceUsd: 19, lookupKey: "threadline_extra_bot_monthly" },
  dedicatedNumber: { name: "Dedicated iMessage number", priceUsd: 399, lookupKey: "threadline_dedicated_number_monthly" },
} as const;

export const CHANNEL_NAMES: Record<string, string> = { imessage: "iMessage", telegram: "Telegram", whatsapp: "WhatsApp", web: "Web", terminal: "Terminal" };
const RANK: Record<PlanId, number> = { free: 0, starter: 1, growth: 2, scale: 3 };

/** Accepts the old placeholder names too (pro → starter, business → scale). */
export function asPlanId(p: string | null | undefined): PlanId {
  if (p === "starter" || p === "growth" || p === "scale") return p;
  if (p === "pro") return "starter";
  if (p === "business" || p === "enterprise") return "scale";
  return "free";
}

/** Effective plan. users.plan is kept in sync by the Stripe webhook (or set by hand for Scale). BILLING_DEFAULT_PLAN lifts
 *  everyone below it (pilots, demos, self-hosting) and never lowers a paid plan. */
export function planOf(userId: string): Plan {
  const own = asPlanId(get<{ plan: string }>("SELECT plan FROM users WHERE id=?", [userId])?.plan);
  const floor = asPlanId(process.env.BILLING_DEFAULT_PLAN);
  return PLANS[RANK[floor] > RANK[own] ? floor : own];
}

interface SubLimits { overage_price_id: string | null; extra_bots: number; status: string }
function subOf(userId: string): SubLimits | undefined {
  return get<SubLimits>("SELECT overage_price_id, extra_bots, status FROM subscriptions WHERE user_id=?", [userId]);
}

export interface Limits { plan: Plan; bots: number | null; overage: boolean }
/** Plan + add-ons. Overage is only allowed when it can be billed: a Stripe subscription with the metered overage item,
 *  or Scale (contracted, invoiced by hand). Otherwise the included conversations are a hard stop. */
export function limitsOf(userId: string): Limits {
  const plan = planOf(userId);
  const sub = subOf(userId);
  const active = !!sub && ["active", "trialing", "past_due"].includes(sub.status);
  const overage = plan.overageUsd !== null && (plan.id === "scale" || (active && !!sub!.overage_price_id));
  return { plan, bots: plan.bots === null ? null : plan.bots + (active ? sub!.extra_bots : 0), overage };
}

export function ownerOf(botId: string): string | undefined {
  return get<{ user_id: string }>("SELECT user_id FROM bots WHERE id=?", [botId])?.user_id;
}

/** Calendar month in UTC, e.g. "2026-10". Included conversations reset at 00:00 UTC on the 1st. */
export function periodKey(d = new Date()): string {
  return d.toISOString().slice(0, 7);
}
export function periodResetsAt(d = new Date()): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString();
}

export function conversationsUsed(userId: string, period = periodKey()): number {
  return get<{ conversations: number }>("SELECT conversations FROM usage_counters WHERE user_id=? AND period=?", [userId, period])?.conversations ?? 0;
}

export interface UsageSummary {
  plan: Plan; period: string; resetsAt: string;
  used: number; included: number | null; left: number | null; pct: number;
  overage: number; overageEnabled: boolean; overageCostUsd: number;
  over: boolean;          // at/over the included conversations AND new ones are refused
  nearLimit: boolean; blocked: number;
  bots: number; botLimit: number | null;
  botsOffPlan: number;    // bots live on a channel the plan doesn't include (e.g. after a downgrade)
}

export function usageSummary(userId: string): UsageSummary {
  const { plan, bots: botLimit, overage: overageEnabled } = limitsOf(userId);
  const period = periodKey();
  const row = get<{ conversations: number; overage: number; blocked: number }>("SELECT conversations, overage, blocked FROM usage_counters WHERE user_id=? AND period=?", [userId, period]);
  const used = row?.conversations ?? 0;
  const included = plan.includedConversations;
  const bots = get<{ n: number }>("SELECT COUNT(*) n FROM bots WHERE user_id=?", [userId])!.n;
  const offChannels = plan.imessageTestPhones ? [...plan.channels, "imessage"] : plan.channels;
  const off = get<{ n: number }>(
    `SELECT COUNT(DISTINCT c.bot_id) n FROM channels c JOIN bots b ON b.id=c.bot_id WHERE b.user_id=? AND c.status='live'
       AND c.channel NOT IN (${offChannels.map(() => "?").join(",")})`, [userId, ...offChannels])!.n;
  const pct = included ? Math.min(100, Math.round((used / included) * 100)) : 0;
  const atIncluded = included !== null && used >= included;
  const overage = row?.overage ?? 0;
  return {
    plan, period, resetsAt: periodResetsAt(), used, included, left: included === null ? null : Math.max(0, included - used), pct,
    overage, overageEnabled, overageCostUsd: Math.round(overage * (plan.overageUsd ?? 0) * 100) / 100,
    over: atIncluded && !overageEnabled, nearLimit: included !== null && used >= included * 0.8 && !(atIncluded && !overageEnabled),
    blocked: row?.blocked ?? 0, bots, botLimit, botsOffPlan: off,
  };
}

export type Gate = { ok: true; plan: Plan } | { ok: false; plan: Plan; reason: "quota" | "channel" | "bots" | "api"; message: string };

const upgradeFor = (channel: string) => (channel === "whatsapp" ? "Growth" : "Starter");

/** Can this owner put a bot live for customers on `channel`? (web Deploy page) */
export function canUseChannel(userId: string, channel: string): Gate {
  const plan = planOf(userId);
  if (plan.channels.includes(channel)) return { ok: true, plan };
  return { ok: false, plan, reason: "channel", message: `${CHANNEL_NAMES[channel] ?? channel} for customers starts on the ${upgradeFor(channel)} plan. Upgrade on the Billing page to turn it on.` };
}

/** Free plan: iMessage only for test phones (owner invites up to N handles per bot). */
export function canUseTestChannel(userId: string, channel: string): boolean {
  return channel === "imessage" && planOf(userId).imessageTestPhones > 0;
}

export function canCreateBot(userId: string): Gate {
  const { plan, bots } = limitsOf(userId);
  if (bots === null) return { ok: true, plan };
  const n = get<{ n: number }>("SELECT COUNT(*) n FROM bots WHERE user_id=?", [userId])!.n;
  if (n < bots) return { ok: true, plan };
  return { ok: false, plan, reason: "bots", message: `Your ${plan.name} plan includes ${bots} bot${bots === 1 ? "" : "s"}. Delete one, add an extra bot ($${ADDONS.extraBot.priceUsd}/mo) or upgrade on the Billing page.` };
}

export function canUseApi(userId: string): Gate {
  const plan = planOf(userId);
  if (plan.api) return { ok: true, plan };
  return { ok: false, plan, reason: "api", message: "The API starts on the Starter plan. Upgrade on the Billing page." };
}

/** Read-only: could this owner start one more conversation? (API scheduling, banners) */
export function canStartConversation(userId: string): Gate {
  const { plan, overage } = limitsOf(userId);
  if (overage || plan.includedConversations === null || conversationsUsed(userId) < plan.includedConversations) return { ok: true, plan };
  return { ok: false, plan, reason: "quota", message: `You've used all ${plan.includedConversations.toLocaleString("en-US")} conversations on the ${plan.name} plan this month. Upgrade on the Billing page, or wait for the reset on the 1st.` };
}

/** The conversation core.chat / composeOutbound will append to (same 6h rule as core's openConversation), if any. */
export function activeConversationId(botId: string, channel: string, handle: string): string | undefined {
  return get<{ id: string }>(
    `SELECT cv.id FROM conversations cv JOIN customers cu ON cu.id = cv.customer_id
      WHERE cv.bot_id=? AND cv.channel=? AND cu.channel=? AND cu.handle=? AND cv.is_test=0 AND cv.last_message_at >= datetime('now','-6 hours')
      ORDER BY cv.last_message_at DESC LIMIT 1`, [botId, channel, channel, handle])?.id;
}

/** Free plan iMessage: is `handle` one of the bot's first N iMessage contacts (owner + test phones)? */
export function isTestPhone(botId: string, handle: string, n: number): boolean {
  if (n <= 0) return false;
  const first = all<{ handle: string }>(
    `SELECT handle FROM (SELECT sender_handle AS handle, bound_at AS at FROM line_routes WHERE bot_id=? AND channel='imessage'
       UNION SELECT handle, first_seen AS at FROM customers WHERE bot_id=? AND channel='imessage') GROUP BY handle ORDER BY MIN(at) LIMIT ?`,
    [botId, botId, n]);
  return first.some((r) => r.handle === handle);
}

export type Admit =
  | { ok: true; plan: Plan; billable: boolean }
  | { ok: false; plan: Plan; reason: "quota" | "channel"; message: string };

/** Before a bot turn (inbound reply or bot-initiated message): may it run, and will it start a billable conversation?
 *  Nothing is counted here; call recordConversation() with the conversation id once the bot has actually replied. */
export function admitTurn(botId: string, channel: string, handle: string): Admit {
  const userId = ownerOf(botId);
  if (!userId) return { ok: true, plan: PLANS.free, billable: false };   // unknown bot: the caller's own checks handle it
  const { plan, overage } = limitsOf(userId);
  const period = periodKey();
  if (!plan.channels.includes(channel)) {
    if (canUseTestChannel(userId, channel) && isTestPhone(botId, handle, plan.imessageTestPhones)) return { ok: true, plan, billable: false };
    bumpBlocked(userId, period);
    logEvent(botId, "plan_channel_blocked", { channel, plan: plan.id });
    return { ok: false, plan, reason: "channel", message: `${CHANNEL_NAMES[channel] ?? channel} for customers is not on the ${plan.name} plan.` };
  }
  if (!WEB.includes(channel)) {
    const active = activeConversationId(botId, channel, handle);
    if (active && get("SELECT 1 FROM billed_conversations WHERE conversation_id=?", [active])) return { ok: true, plan, billable: false };
  }
  const included = plan.includedConversations;
  if (included === null || overage || conversationsUsed(userId, period) < included) return { ok: true, plan, billable: true };
  if (bumpBlocked(userId, period) === 1) logEvent(botId, "quota_exceeded", { plan: plan.id, included });
  return { ok: false, plan, reason: "quota", message: `All ${included} conversations on the ${plan.name} plan are used this month.` };
}

/** Count a conversation once (idempotent per conversation id). Returns whether it was new and whether it is overage. */
export function recordConversation(botId: string, conversationId: string, channel: string): { counted: boolean; overage: boolean } {
  const userId = ownerOf(botId);
  if (!userId || !conversationId) return { counted: false, overage: false };
  const { plan, overage: overageEnabled } = limitsOf(userId);
  const period = periodKey();
  return tx(() => {
    if (get("SELECT 1 FROM billed_conversations WHERE conversation_id=?", [conversationId])) return { counted: false, overage: false };
    run("INSERT INTO usage_counters(user_id, period) VALUES (?,?) ON CONFLICT(user_id, period) DO NOTHING", [userId, period]);
    const used = conversationsUsed(userId, period);
    const included = plan.includedConversations;
    const isOverage = included !== null && used >= included && overageEnabled;
    run("INSERT INTO billed_conversations(conversation_id, user_id, bot_id, channel, period, overage) VALUES (?,?,?,?,?,?)",
      [conversationId, userId, botId, channel, period, isOverage ? 1 : 0]);
    run("UPDATE usage_counters SET conversations = conversations + 1, overage = overage + ? WHERE user_id=? AND period=?", [isOverage ? 1 : 0, userId, period]);
    if (included !== null && used + 1 === Math.ceil(included * 0.8)) logEvent(botId, "quota_warning", { plan: plan.id, included });
    if (included !== null && used + 1 === included) logEvent(botId, "quota_reached", { plan: plan.id, included, overage: overageEnabled });
    return { counted: true, overage: isOverage };
  });
}

function bumpBlocked(userId: string, period: string): number {
  run(`INSERT INTO usage_counters(user_id, period, blocked) VALUES (?,?,1)
       ON CONFLICT(user_id, period) DO UPDATE SET blocked = blocked + 1`, [userId, period]);
  return get<{ blocked: number }>("SELECT blocked FROM usage_counters WHERE user_id=? AND period=?", [userId, period])!.blocked;
}

/** What the customer sees when the bot can't answer for plan reasons ("at capacity, hands off").
 *  Returns null if this customer was already told today. */
export function overLimitReply(botId: string, handle: string, botName: string, reason: "quota" | "channel"): string | null {
  const day = new Date().toISOString().slice(0, 10);
  const res = run("INSERT INTO quota_notices(bot_id, handle, day) VALUES (?,?,?) ON CONFLICT DO NOTHING", [botId, handle, day]);
  if (Number(res.changes) !== 1) return null;
  return reason === "quota"
    ? `Thanks for your message! ${botName} is at capacity right now, so a person from the team will get back to you soon.`
    : `Thanks for your message! ${botName} isn't available on this app right now. The team has been told and will get back to you soon.`;
}
