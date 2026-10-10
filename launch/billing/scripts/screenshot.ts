// Screenshots of the Billing page (Starter with overage) and the dashboard banner (Free at capacity), from the built app.
//   node --experimental-strip-types launch/billing/scripts/screenshot.ts   (after NEXT_DIST_DIR=.next-billing next build)
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../../..");
const DB = `/tmp/tl-billing-shot-${process.pid}.db`;
const PORT = 3078, BASE = `http://127.0.0.1:${PORT}`, AUTH_SECRET = "billing-shot";
process.env.THREADLINE_DB = DB;
const { run, id } = await import("../../../packages/db/src/index.ts");
const period = new Date().toISOString().slice(0, 7);
function owner(email: string, plan: string, conversations: number, overage = 0) {
  const uid = id("usr_");
  run("INSERT INTO users(id,email,name,plan) VALUES (?,?,?,?)", [uid, email, "Aki", plan]);
  run("INSERT INTO bots(id,user_id,name,slug,join_code,source_kind,source_json,status) VALUES (?,?,?,?,?,?,?,?)", [id("bot_"), uid, "Sanitea", "s-" + uid.toLowerCase(), "j-" + uid.toLowerCase(), "idea", "{}", "live"]);
  run("INSERT INTO usage_counters(user_id,period,conversations,overage) VALUES (?,?,?,?)", [uid, period, conversations, overage]);
  const sid = "sess_" + id();
  run("INSERT INTO sessions(id,user_id,expires_at) VALUES (?,?,?)", [sid, uid, new Date(Date.now() + 864e5).toISOString()]);
  return { uid, cookie: `${sid}.${createHmac("sha256", AUTH_SECRET).update(sid).digest("base64url")}` };
}
const starter = owner("starter@shot.test", "starter", 312, 12);
run("INSERT INTO subscriptions(user_id,stripe_customer_id,stripe_subscription_id,plan,interval,status,overage_price_id,current_period_end) VALUES (?,?,?,?,?,?,?,?)",
  [starter.uid, "cus_shot", "sub_shot", "starter", "month", "active", "price_ov", new Date(Date.now() + 20 * 864e5).toISOString()]);
const free = owner("free@shot.test", "free", 50);

const web = spawn(resolve(ROOT, "apps/web/node_modules/.bin/next"), ["start", "-p", String(PORT), "-H", "127.0.0.1"], {
  cwd: resolve(ROOT, "apps/web"), stdio: "ignore",
  env: { ...process.env, NODE_ENV: "production", NEXT_DIST_DIR: ".next-billing", THREADLINE_DB: DB, AUTH_SECRET, APP_URL: BASE, STRIPE_SECRET_KEY: "sk_test_shot", STRIPE_WEBHOOK_SECRET: "whsec_shot" },
});
try {
  for (let i = 0; i < 100; i++) { try { await fetch(`${BASE}/login`); break; } catch { await new Promise((r) => setTimeout(r, 200)); } }
  const puppeteer = createRequire(resolve(ROOT, "packages/core/package.json"))("puppeteer-core");
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  for (const [who, path, file] of [[starter, "/billing", "billing-starter.png"], [free, "/dashboard", "dashboard-free-at-capacity.png"], [free, "/billing", "billing-free.png"]] as const) {
    await page.setCookie({ name: "tl_session", value: who.cookie, domain: "127.0.0.1", path: "/" });
    await page.goto(BASE + path, { waitUntil: "networkidle0" });
    await page.screenshot({ path: resolve(ROOT, "launch/billing/screenshots", file), fullPage: true });
    console.log("saved", file);
  }
  await browser.close();
} finally {
  web.kill("SIGTERM");
  for (const s of ["", "-wal", "-shm"]) rmSync(DB + s, { force: true });
}
