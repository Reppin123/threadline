// Activation funnel (definitions: launch/production/METRICS.md). Reads the SQLite DB read-only; never writes, never migrates.
//   node --experimental-strip-types scripts/metrics.ts                  last 30 days, text
//   node --experimental-strip-types scripts/metrics.ts --days 7 --json  machine-readable
//   THREADLINE_DB=/path/to/restored.db node ... scripts/metrics.ts     against a downloaded snapshot (prod data stays in prod)
// Internal accounts are excluded with METRICS_EXCLUDE (regex on email, default: our own test/demo domains).
import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const days = Number(args[args.indexOf("--days") + 1]) || 30;
const asJson = args.includes("--json");
const dbPath = process.env.THREADLINE_DB || join(ROOT, "data", "threadline.db");
if (!existsSync(dbPath)) { console.error(`no database at ${dbPath}`); process.exit(1); }
const exclude = new RegExp(process.env.METRICS_EXCLUDE || "@(threadline\\.dev|example\\.(com|org)|test\\.local)$|^(demo|test|smoke)[+@]", "i");

const db = new DatabaseSync(dbPath, { readOnly: true });
const has = (t: string) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE name=?").get(t);
const MESSAGING = "('imessage','telegram','whatsapp')";

// One row per user: timestamp of each funnel step (NULL = not reached). All times UTC text, comparable.
const rows = db.prepare(`
  SELECT u.id, u.email, u.plan, u.created_at AS signup,
    (SELECT MIN(b.created_at) FROM bots b WHERE b.user_id = u.id) AS bot_created,
    (SELECT MIN(v.created_at) FROM bot_versions v JOIN bots b ON b.id = v.bot_id WHERE b.user_id = u.id) AS bot_built,
    (SELECT MIN(t) FROM (
        SELECT MIN(e.created_at) t FROM events e JOIN bots b ON b.id = e.bot_id WHERE b.user_id = u.id AND e.type = 'deploy'
        UNION ALL
        SELECT MIN(c.updated_at) AS t FROM channels c JOIN bots b ON b.id = c.bot_id WHERE b.user_id = u.id AND c.status = 'live' AND c.channel IN ${MESSAGING})
    ) AS deployed,
    (SELECT MIN(t) FROM (
        ${has("billed_conversations") ? "SELECT MIN(bc.created_at) t FROM billed_conversations bc WHERE bc.user_id = u.id UNION ALL" : ""}
        SELECT MIN(cv.started_at) AS t FROM conversations cv JOIN bots b ON b.id = cv.bot_id
         WHERE b.user_id = u.id AND cv.is_test = 0 AND cv.channel IN ${MESSAGING}
           AND EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = cv.id AND m.role = 'assistant'))
    ) AS first_real_message,
    (SELECT e.data_json FROM events e WHERE e.type = 'signup' AND json_extract(e.data_json, '$.userId') = u.id LIMIT 1) AS signup_event
  FROM users u
  WHERE u.created_at >= datetime('now', ?)
  ORDER BY u.created_at`).all(`-${days} days`) as any[];

const users = rows.filter((r) => !exclude.test(r.email));
const STEPS = ["signup", "bot_created", "bot_built", "deployed", "first_real_message"] as const;
const hours = (a: string, b: string) => (Date.parse(b.replace(" ", "T") + (b.includes("Z") ? "" : "Z")) - Date.parse(a.replace(" ", "T") + (a.includes("Z") ? "" : "Z"))) / 36e5;
const median = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

const funnel = STEPS.map((step, i) => {
  const reached = users.filter((u) => u[step]);
  const prev = i === 0 ? users.length : users.filter((u) => u[STEPS[i - 1]]).length;
  return {
    step, users: reached.length,
    ofSignups: users.length ? +(reached.length / users.length * 100).toFixed(1) : 0,
    ofPrevious: prev ? +(reached.length / prev * 100).toFixed(1) : 0,
    medianHoursFromSignup: i === 0 ? 0 : (() => { const m = median(reached.map((u) => hours(u.signup, u[step]))); return m === null ? null : +m.toFixed(2); })(),
  };
});
const methods: Record<string, number> = {};
for (const u of users) { const m = u.signup_event ? JSON.parse(u.signup_event).method ?? "unknown" : "untracked"; methods[m] = (methods[m] ?? 0) + 1; }
const paid = users.filter((u) => u.plan && u.plan !== "free").length;

// Weekly cohorts (ISO week of signup)
const week = (s: string) => { const d = new Date(s.replace(" ", "T") + (s.includes("Z") ? "" : "Z")); const day = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - day); return d.toISOString().slice(0, 10); };
const cohorts: Record<string, Record<string, number>> = {};
for (const u of users) { const c = (cohorts[week(u.signup)] ??= Object.fromEntries(STEPS.map((s) => [s, 0]))); for (const s of STEPS) if (u[s]) c[s]++; }

const out = { db: dbPath, windowDays: days, excludedInternal: rows.length - users.length, funnel, paid, signupMethods: methods, weeklyCohorts: cohorts };
if (asJson) { console.log(JSON.stringify(out, null, 2)); process.exit(0); }

console.log(`Activation funnel, signups in the last ${days} days (${users.length} users, ${out.excludedInternal} internal excluded)\n`);
console.log("STEP                 USERS  %SIGNUPS  %PREV   MEDIAN h FROM SIGNUP");
for (const f of funnel) console.log(`${f.step.padEnd(20)} ${String(f.users).padStart(5)}  ${String(f.ofSignups).padStart(7)}%  ${String(f.ofPrevious).padStart(5)}%  ${f.medianHoursFromSignup ?? "-"}`);
console.log(`\npaid now: ${paid}   signup methods: ${Object.entries(methods).map(([k, v]) => `${k}=${v}`).join(" ") || "-"}`);
console.log("\nweek of       " + STEPS.map((s) => s.slice(0, 9).padStart(10)).join(""));
for (const [w, c] of Object.entries(cohorts)) console.log(`${w}   ` + STEPS.map((s) => String(c[s]).padStart(10)).join(""));
