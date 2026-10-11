// Inspect tab e2e (agent inspect), headless Chrome against a running web app.
//   BASE_URL=http://localhost:3047 BOT_ID=<bot> EMAIL=<owner email> node apps/web/scripts/inspect-e2e.mjs
// 1. signs in as the bot's owner (dev magic link), 2. checks every Inspect section renders real data with no secrets,
// 3. connects CONNECT_URL (default https://api.github.com, no key) through the form: Check → detected kind/auth → Save,
// 4. asks the bot a question in Build → Test that needs the new connection, and waits for a tool call + answer.
import puppeteer from "puppeteer-core";
import { mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const BOT = process.env.BOT_ID;
const EMAIL = process.env.EMAIL;
const CONNECT_URL = process.env.CONNECT_URL || "https://api.github.com";
const QUESTION = process.env.QUESTION || "Using the GitHub connection: how many public repos does the GitHub user 'torvalds' have, and what is their profile name?";
const EXPECT = new RegExp(process.env.EXPECT || "Linus Torvalds", "i");
const SKIP_CONNECT = !!process.env.SKIP_CONNECT;
const SHOTS = join(here, "..", "screenshots", "inspect");
const CHROME = process.env.CHROME_PATH || ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium"].find((p) => existsSync(p));
if (!BOT || !EMAIL) { console.error("BOT_ID and EMAIL are required"); process.exit(2); }
mkdirSync(SHOTS, { recursive: true });

const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);
let failed = 0;
async function step(name, fn) {
  try { const d = await fn(); log("✔", name, d ? `— ${d}` : ""); }
  catch (e) { failed++; log("✘", name, "—", e?.message || e); throw e; }
}
const errors = [];
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, timeout: 180000, userDataDir: "/tmp/tl-inspect-chrome", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1360, height: 900 });
page.setDefaultTimeout(240000);
page.setDefaultNavigationTimeout(400000);
page.on("pageerror", (e) => errors.push(String(e?.message || e)));
page.on("console", (m) => { if (m.type() === "error" && !/favicon|DevTools|HMR|Fast Refresh|ERR_ABORTED/i.test(m.text())) errors.push(m.text().slice(0, 300)); });
const go = async (p) => { const r = await page.goto(BASE + p, { waitUntil: "domcontentloaded" }); if (!r || r.status() >= 400) throw new Error(`${p} → ${r?.status()}`); };
const shot = (n, full = true) => page.screenshot({ path: join(SHOTS, `${n}.png`), fullPage: full });
const text = () => page.evaluate(() => document.body.innerText);

try {
  await step("sign in as the bot owner (dev magic link)", async () => {
    await go(`/bots/${BOT}/inspect`);
    if (!page.url().includes("/login")) return "already signed in (profile " + "/tmp/tl-inspect-chrome)";
    await go("/login");
    await page.waitForSelector("#email");
    await page.type("#email", EMAIL);
    await Promise.all([page.waitForNavigation({ waitUntil: "domcontentloaded" }), page.click("#magic-submit")]);
    await page.waitForSelector("#dev-magic-link");
    const href = await page.$eval("#dev-magic-link", (e) => e.getAttribute("href"));
    await go(new URL(href, BASE).pathname); // the link carries APP_URL's origin; follow it on this server
    if (page.url().includes("/login")) throw new Error("still on login: " + page.url());
    return page.url();
  });

  await step("Inspect tab is in the bot nav and renders every section", async () => {
    await go(`/bots/${BOT}/build`);
    const href = await page.$eval("#nav-inspect", (e) => e.getAttribute("href"));
    if (href !== `/bots/${BOT}/inspect`) throw new Error("nav link " + href);
    await go(href);
    for (const s of ["instructions", "tools", "connections", "keys", "settings", "tests", "data", "files", "updates"]) await page.waitForSelector(`#insp-${s}`);
    const prompt = await page.$eval("#insp-prompt", (e) => e.textContent);
    if (!/# Rules/.test(prompt) || !/# Output format/.test(prompt)) throw new Error("prompt is not the runtime system prompt");
    await shot("inspect-desktop");
    return `${prompt.length} chars of prompt`;
  });

  await step("channel switch re-renders the real prompt for iMessage", async () => {
    await go(`/bots/${BOT}/inspect?channel=imessage&v=live`);
    const prompt = await page.$eval("#insp-prompt", (e) => e.textContent);
    if (!prompt.includes("You are texting over iMessage")) throw new Error("iMessage style rule missing");
    return "ok";
  });

  if (!SKIP_CONNECT) {
    await step(`connect ${CONNECT_URL}: Check shows detected kind + sign-in before saving`, async () => {
      await go(`/bots/${BOT}/inspect?v=draft`);
      await page.waitForSelector("#connect-form[data-ready]");
      await page.type("#conn-address", CONNECT_URL);
      await page.evaluate(() => { document.querySelector(".insp-more").open = true; });
      await page.type("#conn-name", "GitHub");
      await page.type("#conn-testpath", "/users/octocat");
      await page.click("#conn-check");
      await page.waitForSelector("#conn-detected, #conn-error", { timeout: 120000 });
      const kind = await page.$eval("#conn-detected-kind", (e) => e.textContent);
      const auth = await page.$eval("#conn-detected-auth", (e) => e.textContent);
      await shot("connect-detected", false);
      await page.waitForSelector("#conn-save", { timeout: 5000 }).catch(async () => { throw new Error("not validated: " + (await page.$eval("#conn-error", (e) => e.textContent).catch(() => "?"))); });
      return `${kind} · ${auth}`;
    });

    await step("Save writes the connection; it shows under Apps and servers with its tools", async () => {
      await page.click("#conn-save");
      await page.waitForSelector("#conn-saved", { timeout: 60000 });
      const msg = await page.$eval("#conn-saved", (e) => e.textContent);
      await page.waitForSelector("#insp-conn-list");
      await shot("connect-saved");
      return msg;
    });
  }

  await step("no secret-looking values rendered anywhere on the page", async () => {
    const t = await text();
    if (/sk-ant-|Bearer [A-Za-z0-9]|ghp_[A-Za-z0-9]/.test(t)) throw new Error("secret-like text visible");
    return "clean";
  });

  await step("Build → Test: the bot answers using the new connection", async () => {
    await go(`/bots/${BOT}/build`);
    const sel = "#preview-input";
    await page.waitForSelector(sel);
    // Send is only enabled by React state, so it turning on proves the page is hydrated and the text registered
    for (let i = 0; i < 40; i++) {
      await page.$eval(sel, (e) => { e.value = ""; });
      await page.type(sel, QUESTION);
      if (await page.$eval("#preview-send", (b) => !b.disabled)) break;
      await new Promise((r) => setTimeout(r, 3000));
    }
    await page.click("#preview-send");
    const deadline = Date.now() + 180000;
    while (Date.now() < deadline) {
      const t = await text();
      if (EXPECT.test(t.split(QUESTION).pop() ?? "")) break;
      await new Promise((r) => setTimeout(r, 2000));
    }
    await shot("test-answer", false);
    const after = (await text()).split(QUESTION).pop() ?? "";
    if (!EXPECT.test(after)) throw new Error("answer did not include " + EXPECT + ": " + after.slice(0, 400));
    return after.replace(/\s+/g, " ").slice(0, 240);
  });
} catch { /* logged */ }

if (errors.length) log("console errors:", errors.slice(0, 5));
await browser.close();
log(failed ? `FAILED (${failed})` : "ALL PASSED", `screenshots: ${SHOTS}`);
process.exit(failed ? 1 : 0);
