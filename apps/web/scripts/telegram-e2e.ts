// Telegram end-to-end on an isolated stack (no real Telegram, nothing shared with the dev servers):
//   fake Bot API (in-process) + web `next dev` on :3010 + gateway on :3110, both on a temp DB, driven in headless Chrome.
// Deploy page → bad token error → good token → t.me link + QR → customer /start + question via the fake API
// → gateway replies from core → Conversations shows Telegram → disconnect → gateway stops polling.
//   pnpm --filter @threadline/gateway exec tsx ../web/scripts/telegram-e2e.ts
import { spawn, type ChildProcess } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "../../..");
const DB = "/tmp/tl-telegram-e2e.db";
const WEB_PORT = Number(process.env.E2E_WEB_PORT || 3010), GW_PORT = Number(process.env.E2E_GATEWAY_PORT || 3110);
const BASE = `http://localhost:${WEB_PORT}`;
const SHOTS = join(here, "..", "screenshots");
mkdirSync(SHOTS, { recursive: true });
for (const s of ["", "-wal", "-shm"]) rmSync(DB + s, { force: true });

const AUTH_SECRET = "telegram-e2e-" + randomBytes(8).toString("hex");
Object.assign(process.env, { THREADLINE_DB: DB, AUTH_SECRET, THREADLINE_ENCRYPTION_KEY: AUTH_SECRET, THREADLINE_LLM: process.env.THREADLINE_LLM || "offline" });

const { FakeTelegram } = await import("../../gateway/scripts/fake-telegram.ts");
const { run, get, id } = await import("@threadline/db");
const { core } = await import("@threadline/core");

const tg = new FakeTelegram();
const apiBase = await tg.start();
const GOOD = "7123456789:AAHk4m2Qx9Lz0e1Rr8TtYyUuIiOoPpAaSsD";
tg.addBot(GOOD, "sanitea_e2e_bot");

const t0 = Date.now();
const log = (...a: unknown[]) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
async function step<T>(name: string, fn: () => Promise<T>) {
  try { const d = await fn(); log("✔", name, d ? `— ${typeof d === "string" ? d : JSON.stringify(d)}` : ""); return d; }
  catch (e) { failures++; log("✘", name, "—", e instanceof Error ? e.message : e); throw e; }
}
function expect(c: unknown, msg: string): asserts c { if (!c) throw new Error(msg); }
async function until(cond: () => boolean | Promise<boolean>, ms: number, what: string) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await cond()) return; await sleep(200); }
  throw new Error(`timed out waiting for ${what}`);
}

// ---- fixtures: user + session + a built, deployed bot (offline core unless THREADLINE_LLM says otherwise) ----
const userId = id("u_");
run("INSERT INTO users(id, email, name) VALUES (?,?,?)", [userId, "telegram-e2e@threadline.local", "E2E Owner"]);
const sid = randomBytes(24).toString("base64url");
run("INSERT INTO sessions(id,user_id,expires_at) VALUES (?,?,?)", [sid, userId, new Date(Date.now() + 864e5).toISOString()]);
const cookie = sid + "." + createHmac("sha256", AUTH_SECRET).update(sid).digest("base64url");
const bot = await core.createBot(userId, { kind: "idea", idea: "Tea shop that sells loose-leaf green and black tea and tracks orders" });
await core.buildBot(bot.botId);
await core.deploy(bot.botId);
log("bot", bot.botId);

// ---- processes ----
const children: ChildProcess[] = [];
function startProc(name: string, cmd: string, args: string[], cwd: string, env: Record<string, string>) {
  const c = spawn(cmd, args, { cwd, env: { ...process.env, ...env }, stdio: ["pipe", "pipe", "pipe"], detached: true });
  const out: string[] = [];
  c.stdout!.on("data", (d) => out.push(String(d)));
  c.stderr!.on("data", (d) => out.push(String(d)));
  children.push(c);
  return { c, out };
}
const env = { TELEGRAM_API_BASE: apiBase, NEXT_TELEMETRY_DISABLED: "1" };
const web = startProc("web", "node_modules/.bin/next", ["dev", "-p", String(WEB_PORT)], join(ROOT, "apps/web"), { ...env, NEXT_DIST_DIR: ".next-telegram-e2e", APP_URL: BASE });
const gw = startProc("gateway", "node_modules/.bin/tsx", ["src/main.ts"], join(ROOT, "apps/gateway"), {
  ...env, GATEWAY_MODE: "terminal", GATEWAY_TERMINAL_UI: "plain", GATEWAY_EXIT_ON_EOF: "0", GATEWAY_PORT: String(GW_PORT),
  GATEWAY_TELEGRAM_SYNC_MS: "1000", GATEWAY_TELEGRAM_POLL_TIMEOUT: "2", GATEWAY_BUBBLE_DELAY_SCALE: "0", GATEWAY_LOG: "",
});
const cleanup = () => {
  for (const c of children) { try { process.kill(-c.pid!, "SIGTERM"); } catch {} }
  tg.stop();
  // next dev rewrites these two for a non-default distDir; restore them (see COORDINATION 16:31)
  spawn("git", ["checkout", "--", "apps/web/tsconfig.json", "apps/web/next-env.d.ts"], { cwd: ROOT, stdio: "ignore" });
};
process.on("SIGINT", () => { cleanup(); process.exit(130); });

const CHROME = process.env.CHROME_PATH || ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium"].find((p) => existsSync(p));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox", "--window-size=1440,900"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.setDefaultTimeout(30_000);
const consoleErrors: string[] = [];
page.on("pageerror", (e) => consoleErrors.push(String((e as Error)?.message ?? e)));
const CHAT = 5550001;

try {
  await step("gateway up (/health on :" + GW_PORT + ")", async () => {
    await until(async () => (await fetch(`http://localhost:${GW_PORT}/health`).catch(() => null))?.ok === true, 60_000, "gateway health");
  });
  await step("web up on :" + WEB_PORT, async () => {
    await until(async () => !!(await fetch(`${BASE}/login`).catch(() => null))?.ok, 120_000, "web /login");
  });
  await page.setCookie({ name: "tl_session", value: cookie, domain: "localhost", path: "/" });
  const deployUrl = `${BASE}/bots/${bot.botId}/deploy`;

  await step("Deploy page shows the Telegram card", async () => {
    await page.goto(deployUrl, { waitUntil: "networkidle2", timeout: 180_000 });
    await page.waitForSelector("#connect-telegram");
    return await page.$eval("#telegram-status", (e) => e.textContent);
  });

  await step("3 steps shown; malformed token → inline error, nothing stored", async () => {
    await page.click("#connect-telegram");
    await page.waitForSelector("#telegram-form ol li");
    const steps = await page.$$eval("#telegram-form ol li", (els) => els.map((e) => e.textContent));
    expect(steps.length === 3 && /BotFather/.test(steps[0]!) && /\/newbot/.test(steps[1]!), JSON.stringify(steps));
    await page.type("#telegram-token", "hello");
    await page.click("#telegram-connect");
    await page.waitForSelector("#telegram-error");
    const err = await page.$eval("#telegram-error", (e) => e.textContent);
    expect(/doesn't look like a bot token/.test(err!), err!);
    expect(!get("SELECT 1 FROM channels WHERE bot_id=? AND channel='telegram'", [bot.botId]), "nothing stored");
    return err;
  });

  await step("well-formed but wrong token → getMe 401 → 'isn't valid' error", async () => {
    await page.$eval("#telegram-token", (e) => ((e as HTMLInputElement).value = ""));
    await page.click("#telegram-token", { clickCount: 3 });
    await page.type("#telegram-token", "7000000000:AAWRONGWRONGWRONGWRONGWRONGWRONGWRO");
    await page.click("#telegram-connect");
    await page.waitForFunction(() => /isn't valid/.test(document.querySelector("#telegram-error")?.textContent ?? ""));
    await page.screenshot({ path: join(SHOTS, "telegram-token-error.png") });
    return await page.$eval("#telegram-error", (e) => e.textContent);
  });

  await step("paste the whole BotFather message → validated, stored ENCRYPTED, card shows @username + t.me link + QR", async () => {
    await page.click("#telegram-token", { clickCount: 3 });
    await page.keyboard.press("Backspace");
    await page.type("#telegram-token", `Done! Use this token to access the HTTP API:\n${GOOD}\nKeep your token secure`.replace(/\n/g, " "));
    await page.click("#telegram-connect");
    await page.waitForSelector("#telegram-share", { timeout: 60_000 });
    const link = await page.$eval("#telegram-link", (e) => (e as HTMLAnchorElement).href);
    const status = await page.$eval("#telegram-status", (e) => e.textContent);
    const qr = await page.$eval("#telegram-qr", (e) => (e as HTMLImageElement).src.slice(0, 22));
    expect(link === "https://t.me/sanitea_e2e_bot" && /@sanitea_e2e_bot/.test(status!) && qr.startsWith("data:image/png"), `${link} ${status} ${qr}`);
    const row = get<{ status: string; config_json: string; line_handle: string }>("SELECT status, config_json, line_handle FROM channels WHERE bot_id=? AND channel='telegram'", [bot.botId])!;
    expect(row.status === "live" && row.config_json.startsWith("v1:") && !row.config_json.includes(GOOD) && row.line_handle === "@sanitea_e2e_bot", JSON.stringify({ ...row, config_json: row.config_json.slice(0, 10) }));
    await page.screenshot({ path: join(SHOTS, "telegram-connected.png"), fullPage: true });
    return link;
  });

  await step("gateway picks the token up without a restart (getMe → deleteWebhook → getUpdates)", async () => {
    await until(() => tg.pollers(GOOD) > 0, 15_000, "getUpdates");
    const h = await (await fetch(`http://localhost:${GW_PORT}/health`)).json() as { providers: { name: string; status: string; username?: string }[] };
    const p = h.providers.find((x) => x.name === `telegram:${bot.botId}`);
    expect(p?.status === "connected" && p.username === "sanitea_e2e_bot", JSON.stringify(h.providers));
    return p;
  });

  await step("customer taps Start → greeting", async () => {
    tg.text(GOOD, CHAT, "/start");
    await until(() => tg.textsTo(GOOD, CHAT).length >= 1, 20_000, "greeting");
    return tg.textsTo(GOOD, CHAT)[0];
  });

  await step("customer asks a question → typing… → reply from core.chat (channel telegram)", async () => {
    const before = tg.textsTo(GOOD, CHAT).length;
    tg.text(GOOD, CHAT, "hi! do you sell green tea?");
    await until(() => tg.textsTo(GOOD, CHAT).length > before, 90_000, "reply");
    await sleep(1500);
    expect(tg.actions.some((a) => a.token === GOOD && a.action === "typing"), "typing action");
    const conv = get<{ channel: string; handle: string; display_name: string | null }>(
      "SELECT c.channel, cu.handle, cu.display_name FROM conversations c JOIN customers cu ON cu.id=c.customer_id WHERE c.bot_id=? AND c.channel='telegram'", [bot.botId]);
    expect(conv?.handle === String(CHAT), JSON.stringify(conv));
    return tg.textsTo(GOOD, CHAT).slice(before).join(" | ").slice(0, 200);
  });

  await step("Conversations inbox lists the Telegram chat with a Telegram filter", async () => {
    await page.goto(`${BASE}/bots/${bot.botId}/conversations`, { waitUntil: "networkidle2", timeout: 120_000 });
    const body = await page.$eval("main", (e) => e.textContent ?? "");
    expect(/Telegram/.test(body) && body.includes("green tea"), body.slice(0, 300));
    await page.screenshot({ path: join(SHOTS, "telegram-conversations.png") });
  });

  await step("mobile Deploy page renders the Telegram share card", async () => {
    await page.setViewport({ width: 390, height: 844, isMobile: true });
    await page.goto(deployUrl, { waitUntil: "networkidle2" });
    await page.waitForSelector("#telegram-share");
    await page.screenshot({ path: join(SHOTS, "telegram-mobile.png"), fullPage: true });
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(deployUrl, { waitUntil: "networkidle2" });
  });

  await step("Turn off Telegram → token wiped, gateway stops polling, no more replies", async () => {
    await page.click("#telegram-disconnect");
    await page.waitForSelector("#connect-telegram", { timeout: 30_000 });
    const row = get<{ status: string; config_json: string | null }>("SELECT status, config_json FROM channels WHERE bot_id=? AND channel='telegram'", [bot.botId])!;
    expect(row.status === "off" && row.config_json === null, JSON.stringify(row));
    await sleep(4500);                                   // one sync (1s) + an in-flight long poll (2s)
    const polls = tg.pollers(GOOD), sent = tg.sent.length;
    tg.text(GOOD, CHAT, "anyone?");
    await sleep(3000);
    expect(tg.pollers(GOOD) === polls && tg.sent.length === sent, `polls ${polls}→${tg.pollers(GOOD)} sent ${sent}→${tg.sent.length}`);
  });

  await step("no page errors", async () => { expect(!consoleErrors.length, consoleErrors.join("\n")); });
} catch {
  console.log("--- gateway log tail ---\n" + gw.out.join("").split("\n").slice(-25).join("\n"));
  console.log("--- web log tail ---\n" + web.out.join("").split("\n").slice(-25).join("\n"));
} finally {
  await browser.close().catch(() => {});
  cleanup();
}
console.log(failures ? `\nFAIL (${failures})` : "\nPASS — telegram e2e");
process.exit(failures ? 1 : 0);
