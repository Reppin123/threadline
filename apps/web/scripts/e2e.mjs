// End-to-end check of the whole web app in headless Chrome.
//   node apps/web/scripts/e2e.mjs            (BASE_URL defaults to http://localhost:3000)
// Env: BASE_URL, CHROME_PATH, SITE_URL (website to build from), HEADFUL=1, BUILD_TIMEOUT_MS, CHAT_TIMEOUT_MS, CHECKS_TIMEOUT_MS
import puppeteer from "puppeteer-core";
import { mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const SITE = process.env.SITE_URL || "https://sanitea.vercel.app";
const SHOTS = join(here, "..", "screenshots");
const BUILD_TIMEOUT = Number(process.env.BUILD_TIMEOUT_MS || 15 * 60e3);
const CHAT_TIMEOUT = Number(process.env.CHAT_TIMEOUT_MS || 4 * 60e3);
const CHECKS_TIMEOUT = Number(process.env.CHECKS_TIMEOUT_MS || 20 * 60e3);
const CHROME = process.env.CHROME_PATH || ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium", "/usr/bin/google-chrome"].find((p) => existsSync(p));
mkdirSync(SHOTS, { recursive: true });

const results = [];
const consoleErrors = [];
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);
async function step(name, fn) {
  const s = Date.now();
  try {
    const detail = await fn();
    results.push({ name, ok: true, ms: Date.now() - s, detail });
    log("✔", name, detail ? `— ${typeof detail === "string" ? detail : JSON.stringify(detail)}` : "");
    return detail;
  } catch (e) {
    results.push({ name, ok: false, ms: Date.now() - s, error: String(e?.message || e) });
    log("✘", name, "—", e?.message || e);
    throw e;
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (page, name) => page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: false });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: process.env.HEADFUL ? false : true, args: ["--no-sandbox", "--window-size=1440,900"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.setDefaultTimeout(30000);
const ignore = /favicon|Download the React DevTools|\[HMR\]|\[Fast Refresh\]|webpack-hmr|net::ERR_ABORTED/i;
function watch(p) {
  p.on("console", (m) => { if (m.type() === "error" && !ignore.test(m.text())) consoleErrors.push({ url: p.url(), text: m.text().slice(0, 300) }); });
  p.on("pageerror", (e) => consoleErrors.push({ url: p.url(), text: "pageerror: " + String(e?.message || e).slice(0, 300) }));
}
watch(page);
async function go(path) {
  const r = await page.goto(BASE + path, { waitUntil: "networkidle2", timeout: 120000 });
  if (!r || r.status() >= 400) throw new Error(`${path} → HTTP ${r?.status()}`);
  return r;
}
async function textOf(sel) { return page.$eval(sel, (e) => e.textContent?.trim() ?? ""); }

let botId = null;
let exitCode = 0;
try {
  await step("landing page loads (desktop + mobile screenshots)", async () => {
    await go("/");
    await shot(page, "landing-desktop");
    await page.screenshot({ path: join(SHOTS, "landing-desktop-full.png"), fullPage: true });
    const m = await browser.newPage();
    watch(m);
    await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await m.goto(BASE + "/", { waitUntil: "networkidle2" });
    await m.screenshot({ path: join(SHOTS, "landing-mobile.png") });
    await m.screenshot({ path: join(SHOTS, "landing-mobile-full.png"), fullPage: true });
    const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await m.close();
    if (overflow > 1) throw new Error(`mobile horizontal overflow ${overflow}px`);
    return "ok";
  });

  await step("SEO + legal pages, sitemap, robots", async () => {
    const paths = ["/imessage-api", "/messaging-api", "/telegram-ai-agent", "/whatsapp-ai-agent", "/privacy", "/terms", "/sitemap.xml", "/robots.txt", "/login", "/signup"];
    for (const p of paths) {
      const r = await fetch(BASE + p);
      if (r.status !== 200) throw new Error(`${p} → ${r.status}`);
    }
    const dash = await fetch(BASE + "/dashboard", { redirect: "manual" });
    if (![303, 307, 302].includes(dash.status)) throw new Error(`/dashboard unauthenticated → ${dash.status}, expected redirect`);
    return `${paths.length} routes 200, /dashboard → login`;
  });

  const email = `e2e+${Date.now()}@threadline.test`;
  await step("hero idea → sign up via dev magic link → wizard prefilled", async () => {
    await go("/");
    await page.waitForSelector("#hero-idea");
    await page.click("#hero-idea");
    await page.type("#hero-idea", "Let my tea shop's customers reorder their favourite blend by text");
    await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2" }), page.click("#hero-submit")]);
    if (!page.url().includes("/signup")) throw new Error("expected /signup, got " + page.url());
    await page.type("#email", email);
    await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2" }), page.click("#magic-submit")]);
    await page.waitForSelector("#dev-magic-link");
    await shot(page, "auth-check");
    await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2" }), page.click("#dev-magic-link")]);
    if (!page.url().includes("/bots/new")) throw new Error("expected /bots/new after sign-in, got " + page.url());
    await page.waitForFunction(() => document.querySelector("#wizard-answer")?.value?.includes("tea shop") || document.body.innerText.includes("tea shop"), { timeout: 60000 });
    await shot(page, "wizard-prefilled");
    return email;
  });

  await step(`wizard: build from website ${SITE}`, async () => {
    await go("/bots/new");
    await page.waitForSelector('[data-chip="Existing website or app"], [data-chip*="website" i]');
    const chip = (await page.$('[data-chip="Existing website or app"]')) || (await page.$('[data-chip*="website" i]'));
    await chip.click();
    for (let i = 0; i < 12; i++) {
      await page.waitForFunction(() => !document.querySelector(".typing") && (document.querySelector("#build-bot") || document.querySelector("#wizard-question")), { timeout: 180000 });
      if (await page.$("#build-bot")) break;
      const q = (await textOf("#wizard-question")).toLowerCase();
      const chips = await page.$$(".wz-pick .chip");
      if (/url|address|website|link|site/.test(q) && !/order|track|payment/.test(q)) {
        await page.type("#wizard-answer", SITE);
        await page.keyboard.press("Enter");
      } else if (chips.length) {
        const multi = (await textOf(".wz-pick .label")).toLowerCase().includes("all");
        if (multi) {
          for (const c of chips.slice(0, Math.min(3, chips.length))) await c.click();
          await page.click("#wizard-send");
        } else await chips[0].click();
      } else {
        await page.type("#wizard-answer", "My customers. Answer questions, recommend teas and take orders.");
        await page.keyboard.press("Enter");
      }
      await sleep(300);
    }
    await shot(page, "wizard-ready");
    await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2", timeout: 120000 }), page.click("#build-bot")]);
    const m = page.url().match(/\/bots\/([^/]+)\/build/);
    if (!m) throw new Error("expected build page, got " + page.url());
    botId = m[1];
    return botId;
  });

  await step("build finishes (live progress) → builder", async () => {
    const seen = new Set();
    const end = Date.now() + BUILD_TIMEOUT;
    while (Date.now() < end) {
      if (await page.$("#builder-chat")) break;
      const p = await page.$("#build-progress");
      if (p) {
        const label = await page.$eval("#build-progress", (e) => e.querySelector("p")?.textContent ?? "");
        if (!seen.has(label)) { seen.add(label); log("   build:", label); if (seen.size === 1) await shot(page, "build-progress"); }
        if (await page.$eval("#build-progress", (e) => e.textContent.includes("hit a snag"))) throw new Error("build failed: " + label);
      }
      await sleep(1500);
    }
    if (!(await page.$("#builder-chat"))) throw new Error("build did not finish in time");
    await shot(page, "builder");
    return `${seen.size} progress states`;
  });

  await step("playground: message → reply", async () => {
    const before = await page.$$eval('#preview-thread .bub[data-role="them"]', (e) => e.length);
    await page.type("#preview-input", "Hi! What teas do you sell, and how much is your most popular one?");
    await page.click("#preview-send");
    await page.waitForFunction((n) => document.querySelectorAll('#preview-thread .bub[data-role="them"]').length > n, { timeout: CHAT_TIMEOUT }, before);
    await page.waitForFunction(() => !document.querySelector("#preview-thread .typing"), { timeout: CHAT_TIMEOUT });
    const reply = await page.$$eval('#preview-thread .bub[data-role="them"]', (e) => e.map((x) => x.textContent).slice(-3).join(" | "));
    await page.click("#skin-telegram"); await shot(page, "builder-telegram");
    await page.click("#skin-whatsapp"); await shot(page, "builder-whatsapp");
    await page.click("#skin-imessage"); await shot(page, "builder-imessage");
    return reply.slice(0, 200);
  });

  await step("builder chat: ask for a change", async () => {
    const before = await page.$$eval("#builder-chat .bmsg.assistant", (e) => e.length);
    await page.type("#builder-input", "Always ask for the customer's name before taking an order.");
    await page.keyboard.press("Enter");
    await page.waitForFunction((n) => document.querySelectorAll("#builder-chat .bmsg.assistant .txt").length > n, { timeout: CHAT_TIMEOUT }, before);
    return (await page.$$eval("#builder-chat .bmsg.assistant .txt", (e) => e.at(-1).textContent)).slice(0, 160);
  });

  await step("open every bot tab", async () => {
    const tabs = ["data", "data?tab=tables", "data?tab=scheduled", "data?tab=customers", "conversations", "versions", "stats", "deploy"];
    for (const t of tabs) {
      await go(`/bots/${botId}/${t}`);
      await page.waitForSelector("main#main");
      const bad = await page.evaluate(() => /Application error|Unhandled Runtime Error|This page could not be found/i.test(document.body.innerText));
      if (bad) throw new Error(`/${t} rendered an error`);
      await shot(page, `tab-${t.replace(/\W+/g, "-")}`);
    }
    const dl = await page.evaluate(async (id) => (await fetch(`/api/app/bots/${id}/export`)).status, botId);
    if (dl !== 200) throw new Error("export → " + dl);
    return `${tabs.length} tabs + export`;
  });

  await step("connect iMessage → join code + QR", async () => {
    await go(`/bots/${botId}/deploy`);
    await page.click("#connect-imessage");
    await page.waitForSelector("#join-code", { timeout: 30000 });
    await page.waitForSelector("#imessage-qr");
    const code = await textOf("#join-code");
    const qrOk = await page.$eval("#imessage-qr", (img) => img.complete && img.naturalWidth > 100);
    if (!qrOk) throw new Error("QR image not rendered");
    const href = await page.$eval("#sms-link", (a) => a.getAttribute("href"));
    if (!href.startsWith("sms:")) throw new Error("bad sms link " + href);
    await shot(page, "deploy-imessage");
    return code;
  });

  await step("deploy to customers", async () => {
    await page.click("#deploy-btn");
    await page.waitForSelector("#deploy-toast", { timeout: 120000 });
    const t = await textOf("#deploy-toast");
    if (!/Deployed v\d+/.test(t)) throw new Error(t);
    await page.waitForFunction(() => document.querySelector("#deploy-status")?.textContent?.includes("Live"), { timeout: 30000 });
    return t;
  });

  await step("run the checks", async () => {
    await go(`/bots/${botId}/deploy`);
    await page.click("#run-checks");
    await page.waitForFunction(() => {
      const s = document.querySelector("#checks-status")?.textContent || "";
      const b = document.querySelector("#run-checks");
      return /passing|Error/.test(s) && b && !b.disabled || (b && !b.disabled && /again|No checks/.test(document.querySelector("#checks")?.textContent || "") && !/Starting|Running/.test(s));
    }, { timeout: CHECKS_TIMEOUT, polling: 1500 });
    await shot(page, "deploy-checks");
    return await textOf("#checks-status");
  });

  let apiKey;
  await step("create API key in Settings", async () => {
    await page.click("#open-settings");
    await page.waitForSelector("#settings-modal");
    await page.click("#create-key");
    await page.waitForSelector("#new-api-key", { timeout: 30000 });
    apiKey = await textOf("#new-api-key");
    if (!apiKey.startsWith("tl_live_")) throw new Error("unexpected key " + apiKey);
    await shot(page, "settings");
    await page.keyboard.press("Escape");
    return apiKey.slice(0, 12) + "…";
  });

  await step("public API: POST message (+ idempotency) and GET reads", async () => {
    const h = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `e2e-${Date.now()}` };
    const body = JSON.stringify({ to: "imessage:+15555550123", prompt: "Tell them their order is ready for pickup", send_at: new Date(Date.now() + 3600e3).toISOString() });
    const r1 = await fetch(`${BASE}/api/v1/bots/${botId}/messages`, { method: "POST", headers: h, body });
    const j1 = await r1.json();
    if (r1.status !== 202 || !j1.id) throw new Error(`POST → ${r1.status} ${JSON.stringify(j1)}`);
    const r2 = await fetch(`${BASE}/api/v1/bots/${botId}/messages`, { method: "POST", headers: h, body });
    const j2 = await r2.json();
    if (r2.status !== 200 || j2.id !== j1.id) throw new Error(`idempotent replay → ${r2.status} ${JSON.stringify(j2)}`);
    const bad = await fetch(`${BASE}/api/v1/bots/${botId}/messages`, { method: "POST", headers: { ...h, Authorization: "Bearer nope" }, body });
    if (bad.status !== 401) throw new Error("bad key → " + bad.status);
    for (const p of ["customers", "conversations"]) {
      const r = await fetch(`${BASE}/api/v1/bots/${botId}/${p}`, { headers: { Authorization: `Bearer ${apiKey}` } });
      if (r.status !== 200) throw new Error(`GET ${p} → ${r.status}`);
    }
    const cust = await (await fetch(`${BASE}/api/v1/bots/${botId}/customers`, { headers: { Authorization: `Bearer ${apiKey}` } })).json();
    if (!cust.data.some((c) => c.handle === "+15555550123")) throw new Error("customer not created");
    const tables = await fetch(`${BASE}/api/v1/bots/${botId}/tables/Orders/rows`, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (![200, 404].includes(tables.status)) throw new Error("tables → " + tables.status);
    await go(`/bots/${botId}/data?tab=scheduled`);
    if (!(await page.evaluate(() => document.body.innerText.includes("order is ready")))) throw new Error("scheduled message not listed in Data");
    await shot(page, "data-scheduled");
    return `scheduled ${j1.id}, tables ${tables.status}`;
  });

  await step("dashboard shows the bot", async () => {
    await go("/dashboard");
    await page.waitForSelector(`[data-bot-id="${botId}"]`);
    await shot(page, "dashboard");
    const m = await browser.newPage();
    await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const cookies = await page.cookies();
    await m.setCookie(...cookies);
    for (const p of ["/dashboard", `/bots/${botId}/build`, `/bots/${botId}/deploy`, `/bots/${botId}/stats`]) {
      await m.goto(BASE + p, { waitUntil: "networkidle2" });
      await m.screenshot({ path: join(SHOTS, `mobile-${p.split("/").pop()}.png`) });
      const ov = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (ov > 1) throw new Error(`mobile overflow ${ov}px on ${p}`);
    }
    await m.close();
    return "ok";
  });

  await step("log out", async () => {
    await go("/dashboard");
    await page.evaluate(() => document.querySelector('form[action="/auth/logout"]').submit());
    await page.waitForNavigation({ waitUntil: "networkidle2" });
    const r = await page.goto(BASE + "/dashboard", { waitUntil: "networkidle2" });
    if (!page.url().includes("/login")) throw new Error("still signed in: " + page.url());
    return "ok";
  });
} catch {
  exitCode = 1;
}

if (consoleErrors.length) {
  results.push({ name: "no browser console errors", ok: false, error: `${consoleErrors.length} errors`, detail: consoleErrors.slice(0, 15) });
  exitCode = 1;
} else results.push({ name: "no browser console errors", ok: true });

await browser.close();
const passed = results.filter((r) => r.ok).length;
console.log("\n" + "─".repeat(60));
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.error ? "  — " + r.error : ""}`);
if (consoleErrors.length) console.log("\nConsole errors:\n" + consoleErrors.slice(0, 15).map((e) => `  ${e.url}: ${e.text}`).join("\n"));
console.log(`\n${passed}/${results.length} passed in ${((Date.now() - t0) / 1000).toFixed(0)}s · bot ${botId ?? "-"} · screenshots in ${SHOTS}`);
process.exit(exitCode);
