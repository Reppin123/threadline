// Scheduled-message engine (owned by agent "scheduler"; migration 0007). Matches Flow's `scheduled` table:
// one-shot or recurring (daily / weekly on days / monthly on a day-of-month) at a wall-clock time in a timezone,
// with next_run_at / last_run_at / last_status / last_note / run_count / skip_count.
//
// Who sends what:
//  - real channels (imessage/telegram/whatsapp): the gateway outbound loop sends rows whose send_at is due and
//    marks them sent/failed. sweepScheduled() (run by apps/worker) then records the run and, for recurring rows,
//    rolls send_at = next_run_at forward and puts the row back to 'scheduled'.
//  - test rows (is_test=1, created from Build → Test, channel 'web'): never reach a channel. sweepScheduled()
//    and sendNow() deliver them straight into the test conversation via deliverTest().
import { run, get, all, id, logEvent } from "@threadline/db";
import { complete } from "./llm.ts";
import { loadConfig } from "./config.ts";
import { getMemories } from "./memory.ts";
import { openConversation } from "./runtime.ts";

export type Repeat = "daily" | "weekly" | "monthly";
export interface Recurrence { repeat: Repeat | null; days: string | null; atTime: string | null; timezone: string }
export interface ParsedSchedule extends Recurrence { first: Date; note: string | null }
export interface ScheduleInput { when?: string; repeat?: string; days?: string; time?: string; timezone?: string }

export interface ScheduledRow {
  id: string; bot_id: string; customer_id: string; channel: string; prompt: string; text: string | null; status: string;
  send_at: string; repeat: Repeat | null; days: string | null; at_time: string | null; timezone: string;
  first_run_at: string | null; next_run_at: string | null; last_run_at: string | null; last_status: string | null; last_note: string | null;
  run_count: number; skip_count: number; is_test: number; attempts: number; error: string | null; sent_at: string | null; created_at: string;
}

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const REAL_CHANNELS = new Set(["imessage", "telegram", "whatsapp"]);

// ───────── timezone math (Intl only, no deps) ─────────
export function validTimezone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz.trim()) return false;
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; }
}
const fmtCache = new Map<string, Intl.DateTimeFormat>();
function local(d: Date, tz: string) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23" });
    fmtCache.set(tz, f);
  }
  const p: Record<string, number> = {};
  for (const x of f.formatToParts(d)) if (x.type !== "literal") p[x.type] = Number(x.value);
  const y = p.year!, m = p.month!, day = p.day!;
  return { y, m, d: day, h: p.hour! % 24, mi: p.minute!, s: p.second!, wd: new Date(Date.UTC(y, m - 1, day)).getUTCDay() };
}
function offsetMs(d: Date, tz: string) {
  const p = local(d, tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(d.getTime() / 1000) * 1000;
}
/** Wall-clock time in tz → instant. Day/month overflow is fine (Date.UTC normalises). */
export function zoned(y: number, m: number, d: number, h: number, mi: number, tz: string): Date {
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const o1 = offsetMs(new Date(guess), tz);
  let t = guess - o1;
  const o2 = offsetMs(new Date(t), tz);
  if (o2 !== o1) t = guess - o2;
  return new Date(t);
}
const hm = (t: string | null | undefined) => { const [h, mi] = (t || "09:00").split(":").map(Number); return [h || 0, mi || 0] as const; };
const pad = (n: number) => String(n).padStart(2, "0");

// ───────── recurrence ─────────
/** First occurrence strictly after `after`. */
export function nextOccurrence(rec: Recurrence, after: Date): Date {
  const tz = validTimezone(rec.timezone) ? rec.timezone : "UTC";
  const p = local(after, tz);
  const [h, mi] = hm(rec.atTime);
  if (rec.repeat === "monthly") {
    const want = Math.min(31, Math.max(1, Number(rec.days) || p.d));
    for (let k = 0; k < 25; k++) {
      const dim = new Date(Date.UTC(p.y, p.m - 1 + k + 1, 0)).getUTCDate();
      const c = zoned(p.y, p.m + k, Math.min(want, dim), h, mi, tz);
      if (c > after) return c;
    }
  }
  const set = rec.repeat === "weekly" ? new Set(parseDays(rec.days ?? "") ?? [DAYS[p.wd]]) : null;
  for (let i = 0; i < 15; i++) {
    const wd = (p.wd + i) % 7;
    if (set && !set.has(DAYS[wd])) continue;
    const c = zoned(p.y, p.m, p.d + i, h, mi, tz);
    if (c > after) return c;
  }
  return new Date(after.getTime() + 86400e3);   // unreachable for valid input; never wedge
}

function parseDays(s: string): string[] | null {
  const out = new Set<string>();
  const re = /\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*\b/gi;
  for (const m of s.matchAll(re)) out.add(m[1]!.toLowerCase());
  if (/\bweekdays?\b/i.test(s)) ["mon", "tue", "wed", "thu", "fri"].forEach((d) => out.add(d));
  if (/\bweekends?\b/i.test(s)) ["sat", "sun"].forEach((d) => out.add(d));
  return out.size ? DAYS.filter((d) => out.has(d)) : null;
}

/** "every Monday at 09:00 (America/New_York)" */
export function describeRecurrence(rec: Recurrence): string {
  if (!rec.repeat) return "once";
  const at = `at ${rec.atTime ?? "09:00"}${rec.timezone && rec.timezone !== "UTC" ? ` (${rec.timezone})` : " UTC"}`;
  if (rec.repeat === "daily") return `every day ${at}`;
  if (rec.repeat === "monthly") return `every month on day ${rec.days || "?"} ${at}`;
  const ds = parseDays(rec.days ?? "") ?? [];
  const label = ds.join(",") === "mon,tue,wed,thu,fri" ? "weekday" : ds.map((d) => DAY_NAMES[DAYS.indexOf(d as any)]).join(", ");
  return `every ${label || "week"} ${at}`;
}

// ───────── natural-language parsing ─────────
function parseTime(raw: string): string | null {
  const t = raw.toLowerCase();
  let m = t.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?m\.?|p\.?m\.?)(?![a-z])/);
  if (m) {
    let h = Number(m[1]) % 12;
    if (m[3]!.startsWith("p")) h += 12;
    return `${pad(h)}:${pad(Number(m[2] ?? 0))}`;
  }
  m = t.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (m) return `${pad(Number(m[1]))}:${m[2]}`;
  m = t.match(/\bat\s+(\d{1,2})\b(?!\s*(?:st|nd|rd|th|min|hour|day|week|month|%))/);
  if (m && Number(m[1]) <= 23) return `${pad(Number(m[1]))}:00`;
  if (/\bnoon\b|\bmidday\b/.test(t)) return "12:00";
  if (/\bmidnight\b/.test(t)) return "00:00";
  if (/\bmorning\b/.test(t)) return "09:00";
  if (/\bafternoon\b/.test(t)) return "14:00";
  if (/\bevening\b/.test(t)) return "18:00";
  if (/\btonight\b|\bnight\b/.test(t)) return "20:00";
  return null;
}

const WORD_NUM: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, fifteen: 15, twenty: 20, thirty: 30 };

function normRepeat(r: unknown): Repeat | null | undefined {
  const s = String(r ?? "").toLowerCase().trim();
  if (!s) return undefined;
  if (/^(none|once|no|null|one[- ]?off|never)$/.test(s)) return null;
  if (/day|daily/.test(s) && !/week|month/.test(s)) return "daily";
  if (/week/.test(s)) return "weekly";
  if (/month/.test(s)) return "monthly";
  return undefined;
}

function detectRepeat(lower: string): { repeat: Repeat | null; days: string[] | null; dom: number | null; note: string | null } {
  let repeat: Repeat | null = null, days: string[] | null = null, dom: number | null = null, note: string | null = null;
  const every = /\b(every|each)\b/.test(lower);
  const named = parseDays(lower.replace(/\bweekdays?\b|\bweekends?\b/g, ""));
  const plural = /\b(sun|mon|tues|wednes|thurs|fri|satur)days\b/.test(lower);
  if (/\bevery\s*other\b|\bevery\s+\d+\s+(day|week|month)s?\b|\bfortnightly\b|\bbiweekly\b/.test(lower)) note = "custom intervals aren't supported; using the nearest of daily/weekly/monthly";
  if (/\b(every|each)\s+(day|morning|evening|night|afternoon)\b|\bdaily\b|\beveryday\b|\bevery\s+\d+\s+days?\b/.test(lower)) repeat = "daily";
  else if (/\b(every|each)\s+weekdays?\b|\bweekdays\b|\bmon(day)?\s*(-|to|through|thru)\s*fri(day)?\b/.test(lower)) { repeat = "weekly"; days = ["mon", "tue", "wed", "thu", "fri"]; }
  else if (/\b(every|each)\s+weekends?\b|\bweekends\b/.test(lower)) { repeat = "weekly"; days = ["sun", "sat"]; }
  else if (named && (every || plural)) { repeat = "weekly"; days = named; }
  else if (/\b(every|each)\s+(other\s+)?week\b|\bweekly\b|\bfortnightly\b|\bbiweekly\b|\bevery\s+\d+\s+weeks?\b/.test(lower)) { repeat = "weekly"; days = named; }
  else if (/\b(every|each)\s+(other\s+)?month\b|\bmonthly\b|\bevery\s+\d+\s+months?\b/.test(lower)) {
    repeat = "monthly";
    const m = lower.match(/\b(\d{1,2})(?:st|nd|rd|th)\b/) ?? lower.match(/\bon\s+(?:the\s+)?(\d{1,2})\b/);
    if (m && Number(m[1]) >= 1 && Number(m[1]) <= 31) dom = Number(m[1]);
  }
  return { repeat, days, dom, note: repeat ? note : null };
}
function isoWallTime(when: string, tz: string): string | null {
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(when)) { const d = new Date(when); if (isNaN(+d)) return null; const p = local(d, tz); return `${pad(p.h)}:${pad(p.mi)}`; }
  const m = when.match(/[T ](\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : null;
}

/**
 * Natural language (or ISO) → schedule. Never throws: an unparseable `when` falls back to 24h from now with a note,
 * so delivery is never blocked by phrasing (the note ends up in scheduled_messages.last_note).
 */
export function parseSchedule(input: ScheduleInput, opts: { now?: Date; defaultTimezone?: string; context?: string } = {}): ParsedSchedule {
  const now = opts.now ?? new Date();
  const notes: string[] = [];
  const when = String(input.when ?? "").trim();
  const lower = when.toLowerCase();
  let tz = "UTC";
  if (validTimezone(input.timezone)) tz = input.timezone.trim();
  else {
    if (input.timezone) notes.push(`unknown timezone "${input.timezone}"`);
    if (validTimezone(opts.defaultTimezone)) tz = opts.defaultTimezone;
  }
  const iso = /^\d{4}-\d{2}-\d{2}/.test(when);
  const time = (input.time && parseTime(input.time)) || (!iso ? parseTime(lower) : null);

  // ── recurrence ──
  let repeat = normRepeat(input.repeat);
  let days: string[] | null = input.days ? parseDays(input.days) : null;
  let dom: number | null = input.days && /^\d{1,2}$/.test(input.days.trim()) ? Number(input.days) : null;
  let time2 = time;
  if (repeat === undefined) {
    let d = detectRepeat(lower);
    // The model sometimes flattens "every Monday at 9am" into one ISO date. The customer's own words decide.
    const ctx = String(opts.context ?? "").toLowerCase();
    if (!d.repeat && ctx) {
      const c = detectRepeat(ctx);
      if (c.repeat) {
        d = c;
        notes.push("repeat taken from the customer's message");
        if (!time2) time2 = parseTime(ctx) ?? (iso ? isoWallTime(when, tz) : null);
      }
    }
    repeat = d.repeat; days = days ?? d.days; dom = dom ?? d.dom;
    if (d.note) notes.push(d.note);
  }
  if (repeat === "monthly" && dom == null) {
    const m = lower.match(/\b(\d{1,2})(?:st|nd|rd|th)\b/) ?? lower.match(/\bon\s+(?:the\s+)?(\d{1,2})\b/);
    if (m && Number(m[1]) >= 1 && Number(m[1]) <= 31) dom = Number(m[1]);
  }

  if (repeat) {
    let atTime = time2;
    if (!atTime) { atTime = "09:00"; notes.push("no time given; using 09:00"); }
    const p = local(now, tz);
    const rec: Recurrence = {
      repeat, timezone: tz, atTime,
      days: repeat === "weekly" ? (days ?? [DAYS[p.wd]]).join(",") : repeat === "monthly" ? String(dom ?? p.d) : null,
    };
    return { ...rec, first: nextOccurrence(rec, now), note: notes.length ? notes.join("; ") : null };
  }

  const one = parseOneOff(when, lower, time, tz, now);
  if (!one) notes.push(`couldn't understand "${when.slice(0, 80)}"; defaulted to 24 hours from now`);
  let first = one ?? new Date(now.getTime() + 86400e3);
  if (first.getTime() <= now.getTime()) { notes.push("requested time was in the past; sending in 1 minute"); first = new Date(now.getTime() + 60e3); }
  return { repeat: null, days: null, atTime: null, timezone: tz, first, note: notes.length ? notes.join("; ") : null };
}

function parseOneOff(when: string, lower: string, time: string | null, tz: string, now: Date): Date | null {
  const p = local(now, tz);
  const at = (y: number, m: number, d: number, t: string | null) => { const [h, mi] = t ? hm(t) : [p.h, p.mi]; return zoned(y, m, d, h, mi, tz); };
  // ISO: with an offset/Z it's absolute; without, it's wall-clock in tz.
  if (/^\d{4}-\d{2}-\d{2}/.test(when)) {
    if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(when)) { const d = new Date(when); return isNaN(+d) ? null : d; }
    const m = when.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/)!;
    return zoned(+m[1]!, +m[2]!, +m[3]!, m[4] ? +m[4] : hm(time)[0], m[5] ? +m[5] : hm(time)[1], tz);
  }
  const rel = lower.match(/\bin\s+(\d+(?:\.\d+)?|an?|one|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|twenty|thirty)\s*(minute|min|hour|hr|day|week|month)s?\b/);
  if (rel) {
    const n = WORD_NUM[rel[1]!] ?? Number(rel[1]);
    const unit = rel[2]!;
    if (unit.startsWith("min")) return new Date(now.getTime() + n * 60e3);
    if (unit.startsWith("h")) return new Date(now.getTime() + n * 3600e3);
    const addDays = unit === "day" ? n : unit === "week" ? n * 7 : 0;
    const addMonths = unit === "month" ? n : 0;
    if (!time) {
      if (addMonths) { const dim = new Date(Date.UTC(p.y, p.m - 1 + addMonths + 1, 0)).getUTCDate(); return at(p.y, p.m + addMonths, Math.min(p.d, dim), null); }
      return new Date(now.getTime() + addDays * 86400e3);
    }
    return at(p.y, p.m + addMonths, p.d + addDays, time);
  }
  if (/\bday after tomorrow\b/.test(lower)) return at(p.y, p.m, p.d + 2, time ?? "09:00");
  if (/\btomorrow\b|\btmrw?\b/.test(lower)) return at(p.y, p.m, p.d + 1, time ?? "09:00");
  if (/\bnext week\b/.test(lower)) return at(p.y, p.m, p.d + 7, time);
  if (/\bnext month\b/.test(lower)) return at(p.y, p.m + 1, p.d, time);
  const md = lower.match(new RegExp(`\\b(${MONTHS.join("|")})[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?`))
    ?? lower.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTHS.join("|")})[a-z]*(?:,?\\s+(\\d{4}))?`));
  if (md) {
    const monthFirst = isNaN(Number(md[1]));
    const mon = MONTHS.indexOf((monthFirst ? md[1] : md[2])!.slice(0, 3)) + 1;
    const day = Number(monthFirst ? md[2] : md[1]);
    let y = md[3] ? Number(md[3]) : p.y;
    let d = at(y, mon, day, time ?? "09:00");
    if (!md[3] && d <= now) d = at(++y, mon, day, time ?? "09:00");
    return d;
  }
  const wd = parseDays(lower.replace(/\bweekdays?\b|\bweekends?\b/g, ""));
  if (wd) {
    const target = DAYS.indexOf(wd[0] as any);
    let ahead = (target - p.wd + 7) % 7;
    if (ahead === 0 && !(time && at(p.y, p.m, p.d, time) > now)) ahead = 7;
    return at(p.y, p.m, p.d + ahead, time ?? "09:00");
  }
  if (/\btonight\b/.test(lower)) { const d = at(p.y, p.m, p.d, time ?? "20:00"); return d > now ? d : null; }
  if (time) { const d = at(p.y, p.m, p.d, time); return d > now ? d : at(p.y, p.m, p.d + 1, time); }
  const d = new Date(when);
  return isNaN(+d) || !/\d/.test(when) ? null : d;
}

// ───────── persistence ─────────
const iso = (d: Date) => d.toISOString();
/** SQLite datetime('now') text ("YYYY-MM-DD HH:MM:SS", UTC) or ISO → ISO. */
const sqlIso = (s: string | null) => { if (!s) return null; const d = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(s) ? s : s.replace(" ", "T") + "Z"); return isNaN(+d) ? null : d.toISOString(); };
export const recurrenceOf = (r: Pick<ScheduledRow, "repeat" | "days" | "at_time" | "timezone">): Recurrence =>
  ({ repeat: r.repeat ?? null, days: r.days ?? null, atTime: r.at_time ?? null, timezone: r.timezone || "UTC" });

export function getScheduled(rowId: string) { return get<ScheduledRow>("SELECT * FROM scheduled_messages WHERE id=?", [rowId]); }

/** The occurrence after the pending one (for the "· next …" part of the test chip). */
export function followingRun(r: ScheduledRow): string | null {
  if (!r.repeat || r.status === "cancelled") return null;
  const cur = new Date(r.next_run_at ?? r.send_at);
  return iso(nextOccurrence(recurrenceOf(r), cur));
}

export function insertScheduled(o: { botId: string; customerId: string; channel: string; prompt: string; schedule: ParsedSchedule; isTest: boolean }) {
  const sid = id("sm_");
  const first = iso(o.schedule.first);
  run(`INSERT INTO scheduled_messages(id,bot_id,customer_id,channel,prompt,send_at,repeat,days,at_time,timezone,first_run_at,next_run_at,last_note,is_test)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [sid, o.botId, o.customerId, o.channel, o.prompt, first, o.schedule.repeat, o.schedule.days, o.schedule.atTime, o.schedule.timezone, first, first, o.schedule.note, o.isTest ? 1 : 0]);
  return sid;
}

/**
 * Record one run of a row that is currently `fromStatus` (sending | sent | failed). Recurring rows advance to the
 * next occurrence after max(now, the slot that just ran) and go back to 'scheduled' even when the send failed,
 * so one bad send never wedges a reminder. One-shot rows end as sent/failed. Returns false if someone else moved it.
 */
export function recordRun(r: ScheduledRow, fromStatus: string, outcome: { ok: boolean; note?: string | null; at?: string | null }): boolean {
  const at = outcome.at || iso(new Date());
  const note = outcome.ok ? null : String(outcome.note ?? "send failed").slice(0, 500);
  if (r.repeat) {
    const slot = new Date(r.next_run_at ?? r.send_at);
    const base = new Date(Math.max(Date.now(), +slot || 0));
    const next = iso(nextOccurrence(recurrenceOf(r), base));
    return Number(run(`UPDATE scheduled_messages SET status='scheduled', send_at=?, next_run_at=?, last_run_at=?, last_status=?, last_note=?,
        run_count=run_count+?, skip_count=skip_count+?, text=NULL, attempts=0, next_attempt_at=NULL, error=NULL,
        sent_at=CASE WHEN ? THEN ? ELSE sent_at END
      WHERE id=? AND status=?`,
      [next, next, at, outcome.ok ? "sent" : "failed", note, outcome.ok ? 1 : 0, outcome.ok ? 0 : 1, outcome.ok ? 1 : 0, at, r.id, fromStatus]).changes) === 1;
  }
  return Number(run(`UPDATE scheduled_messages SET status=?, next_run_at=NULL, last_run_at=?, last_status=?, last_note=COALESCE(?, last_note),
      run_count=run_count+?, skip_count=skip_count+?, sent_at=CASE WHEN ? THEN COALESCE(sent_at, ?) ELSE sent_at END, error=COALESCE(?, error)
    WHERE id=? AND status=?`,
    [outcome.ok ? "sent" : "failed", at, outcome.ok ? "sent" : "failed", note, outcome.ok ? 1 : 0, outcome.ok ? 0 : 1, outcome.ok ? 1 : 0, at, note, r.id, fromStatus]).changes) === 1;
}

/** Same claim the gateway uses: scheduled → sending, exactly once. */
function claim(rowId: string) {
  return Number(run(`UPDATE scheduled_messages SET status='sending', attempts=attempts+1, next_attempt_at=strftime('%Y-%m-%d %H:%M:%f','now')
    WHERE id=? AND status='scheduled'`, [rowId]).changes) === 1;
}

/** Compose the scheduled message and append it to the TEST conversation (Build → Test preview). */
export async function deliverTest(r: ScheduledRow): Promise<string> {
  const { config } = loadConfig(r.bot_id, { isTest: true });
  const conv = openConversation(r.bot_id, r.customer_id, r.channel, true);
  const memories = getMemories(r.customer_id);
  const recent = all<{ role: string; content: string }>(
    "SELECT role, content FROM messages WHERE conversation_id=? AND role IN ('user','assistant') ORDER BY created_at DESC, rowid DESC LIMIT 8", [conv.id]).reverse();
  const res = await complete({
    system: `You are ${config.profile.name}. Persona: ${config.profile.persona}\nBusiness: ${config.profile.businessSummary}\nWrite ONE short proactive message to a customer: this is a reminder/follow-up they asked for earlier. Plain text, no markdown, no greeting fluff, no placeholders like [name]. Facts about them: ${JSON.stringify(memories)}. Only state facts given in the instruction or business info. Output only the message text.`,
    messages: [{ role: "user", content: `Recent conversation:\n${recent.map((m) => `${m.role}: ${m.content}`).join("\n") || "(none)"}\n\nScheduled instruction: ${r.prompt}` }],
    botId: r.bot_id, category: "tests", tier: "fast", maxTokens: 300,
    offline: () => ({ text: r.prompt }),
  });
  const text = res.text.trim().replace(/^"|"$/g, "").replace(/\*\*(.+?)\*\*/g, "$1") || r.prompt;
  run("INSERT INTO messages(id,conversation_id,role,content) VALUES (?,?,?,?)", [id("m_"), conv.id, "assistant", text]);
  run("UPDATE conversations SET last_message_at=datetime('now') WHERE id=?", [conv.id]);
  run("UPDATE scheduled_messages SET text=? WHERE id=?", [text, r.id]);
  return text;
}

async function runTestRow(r: ScheduledRow): Promise<{ ok: boolean; text?: string; error?: string }> {
  if (!claim(r.id)) return { ok: false, error: "already being sent" };
  try {
    const text = await deliverTest(r);
    recordRun(r, "sending", { ok: true });
    logEvent(r.bot_id, "scheduled_sent", { id: r.id, channel: r.channel, isTest: true, repeat: r.repeat });
    return { ok: true, text };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    recordRun(r, "sending", { ok: false, note: msg });
    logEvent(r.bot_id, "scheduled_failed", { id: r.id, isTest: true, error: msg.slice(0, 300) });
    return { ok: false, error: msg };
  }
}

/**
 * "Send now" (test chip). Test rows are delivered into the test chat right here through the same path the worker
 * sweep uses. Real-channel rows are made due now so the gateway sends them on its next tick; the sweep then records
 * the run and rolls a recurring row to its following occurrence.
 */
export async function sendNow(rowId: string): Promise<{ ok: boolean; mode?: "delivered" | "queued"; text?: string; error?: string; row?: ScheduledRow }> {
  const r = getScheduled(rowId);
  if (!r) return { ok: false, error: "not found" };
  if (r.status !== "scheduled") return { ok: false, error: `it's ${r.status}, not scheduled`, row: r };
  if (r.is_test || !REAL_CHANNELS.has(r.channel)) {
    const res = await runTestRow(r);
    return { ...res, mode: "delivered", row: getScheduled(rowId) };
  }
  run("UPDATE scheduled_messages SET send_at=?, next_attempt_at=NULL WHERE id=? AND status='scheduled'", [iso(new Date()), rowId]);
  return { ok: true, mode: "queued", row: getScheduled(rowId) };
}

export function cancelScheduled(rowId: string): boolean {
  return Number(run("UPDATE scheduled_messages SET status='cancelled', next_run_at=NULL WHERE id=? AND status='scheduled'", [rowId]).changes) === 1;
}

/**
 * One sweep (apps/worker calls this every few seconds):
 *  1. rows the gateway finished (sent/failed) that haven't been recorded → recordRun (recurring ones go back to 'scheduled');
 *  2. due test rows → delivered into the test chat.
 */
export async function sweepScheduled(limit = 25): Promise<{ recorded: number; rolled: number; delivered: number; failed: number }> {
  const out = { recorded: 0, rolled: 0, delivered: 0, failed: 0 };
  const done = all<ScheduledRow>(
    `SELECT * FROM scheduled_messages WHERE status IN ('sent','failed') AND (repeat IS NOT NULL OR (run_count = 0 AND skip_count = 0))
      ORDER BY julianday(send_at) LIMIT 200`);
  for (const r of done) {
    if (recordRun(r, r.status, { ok: r.status === "sent", note: r.error, at: sqlIso(r.sent_at) })) {
      out.recorded++;
      if (r.repeat) out.rolled++;
    }
  }
  const due = all<ScheduledRow>(
    `SELECT * FROM scheduled_messages WHERE is_test = 1 AND status = 'scheduled' AND julianday(send_at) <= julianday('now')
      ORDER BY julianday(send_at) LIMIT ?`, [limit]);
  for (const r of due) {
    const res = await runTestRow(r);
    if (res.ok) out.delivered++; else if (res.error !== "already being sent") out.failed++;
  }
  return out;
}

/** Shape the chip/UI reads. */
export function chipView(r: ScheduledRow) {
  return {
    id: r.id, status: r.status, prompt: r.prompt, repeat: r.repeat, days: r.days, at_time: r.at_time, timezone: r.timezone,
    next_run_at: r.status === "scheduled" ? (r.next_run_at ?? r.send_at) : null, following_run_at: followingRun(r),
    last_run_at: r.last_run_at, last_status: r.last_status, last_note: r.last_note, run_count: r.run_count, skip_count: r.skip_count,
    is_test: !!r.is_test, describe: describeRecurrence(recurrenceOf(r)),
  };
}
export type ChipView = ReturnType<typeof chipView>;
