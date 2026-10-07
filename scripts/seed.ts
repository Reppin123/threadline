// Seed the dev DB: demo user (demo@threadline.dev, password printed) + a Sanitea website bot enqueued for build.
// Idempotent: re-running resets the demo password and reuses the existing Sanitea bot (re-enqueues its build only if it
// isn't ready, or always with --rebuild). Run: pnpm seed   [--rebuild] [--url https://example.com]
import { randomBytes, scryptSync } from "node:crypto";
import { get, run, id, enqueueJob, json, dbPath } from "../packages/db/src/index.ts";
import { core } from "../packages/core/src/index.ts";

const args = process.argv.slice(2);
const REBUILD = args.includes("--rebuild");
const URL_ARG = args.includes("--url") ? args[args.indexOf("--url") + 1] : "https://sanitea.vercel.app";
const EMAIL = process.env.SEED_EMAIL || "demo@threadline.dev";
const PASSWORD = process.env.SEED_PASSWORD || "demo-" + randomBytes(5).toString("base64url");

// Same format as apps/web/lib/auth.ts hashPassword().
function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

let user = get<{ id: string }>("SELECT id FROM users WHERE email=?", [EMAIL]);
if (user) {
  run("UPDATE users SET password_hash=? WHERE id=?", [hashPassword(PASSWORD), user.id]);
} else {
  user = { id: id("u_") };
  run("INSERT INTO users(id,email,name,password_hash) VALUES (?,?,?,?)", [user.id, EMAIL, "Demo Owner", hashPassword(PASSWORD)]);
}

const host = new URL(URL_ARG).host;
let bot = get<{ id: string; status: string; join_code: string; slug: string }>(
  "SELECT id,status,join_code,slug FROM bots WHERE user_id=? AND source_kind='website' AND source_json LIKE ? ORDER BY created_at LIMIT 1",
  [user.id, `%${host}%`],
);
let created = false;
if (!bot) {
  const r = await core.createBot(user.id, { kind: "website", url: URL_ARG });
  bot = { id: r.botId, status: "draft", join_code: r.joinCode, slug: r.slug };
  created = true;
}

let jobId: string | null = null;
if (created || REBUILD || !["ready", "live"].includes(bot.status)) {
  const pending = get<{ id: string }>("SELECT id FROM jobs WHERE type='build_bot' AND status IN ('queued','running') AND payload_json LIKE ?", [`%${bot.id}%`]);
  if (pending) jobId = pending.id;
  else {
    run("UPDATE bots SET status='building', build_progress_json=? WHERE id=?", [json.str({ step: "read_source", label: "Queued — starting the build", pct: 2 }), bot.id]);
    jobId = enqueueJob("build_bot", { botId: bot.id });
  }
}

console.log(`
Seeded ${dbPath()}
  login     ${EMAIL}
  password  ${PASSWORD}
  bot       ${bot.id}  (${URL_ARG})  slug=${bot.slug}  join code=${bot.join_code}  ${created ? "created" : "existing, status=" + bot.status}
  build     ${jobId ? `job ${jobId} queued — the worker (pnpm start:all) picks it up` : "already built (use --rebuild to rebuild)"}
`);
