// Test vs live data isolation, end to end in headless Chrome against a running web app.
//   BASE_URL=http://localhost:3007 THREADLINE_DB=<the server's DB> node apps/web/scripts/testdata-e2e.mjs
// (THREADLINE_DB lets the run put the test owner on Starter, which the public API needs. Never point it at data/threadline.db.)
// Builds an idea bot from scratch, test-chats an order in Build, checks Data → Tables "Customers | Test data",
// clears test data, then writes a real row through POST /api/v1/bots/:id/tables/:name/rows and checks it shows under Customers.
import puppeteer from "puppeteer-core";
import { mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const SHOTS = join(here, "..", "screenshots", "testdata");
const CHROME = process.env.CHROME_PATH || ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium", "/usr/bin/google-chrome"].find((p) => existsSync(p));
const TIMEOUT = Number(process.env.CHAT_TIMEOUT_MS || 4 * 60e3);
mkdirSync(SHOTS, { recursive: true });

const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
async function step(name, fn) {
  try { const d = await fn(); log("✔", name, d ? `— ${typeof d === "string" ? d : JSON.stringify(d)}` : ""); return d; }
  catch (e) { failed++; log("✘", name, "—", e?.message || e); await shot(`fail-${name.replace(/\W+/g, "-").slice(0, 40)}`).catch(() => {}); throw e; }
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: process.env.HEADFUL ? false : true, args: ["--no-sandbox", "--window-size=1440,900"], timeout: 120000 });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.setDefaultTimeout(90000);
page.setDefaultNavigationTimeout(300000);
page.on("dialog", (d) => d.accept()); // the Clear test data confirm()
const shot = (name) => page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });
async function go(path) {
  const r = await page.goto(BASE + path, { waitUntil: "networkidle2" });
  if (!r || r.status() >= 400) throw new Error(`${path} → HTTP ${r?.status()}`);
}
/** Reads the Data → Tables view for one mode: test badge, and the Orders section's row count + rendered rows. */
async function tablesView(botId, mode) {
  await go(`/bots/${botId}/data?tab=tables${mode === "test" ? "&rows=test" : ""}`);
  return page.evaluate(() => {
    const badge = Number(document.querySelector("[data-test-count]")?.getAttribute("data-test-count") ?? NaN);
    const sec = [...document.querySelectorAll("section[data-table]")].find((s) => /order/i.test(s.getAttribute("data-table") || ""));
    return {
      badge,
      pressed: document.querySelector('[data-rows][aria-pressed="true"]')?.getAttribute("data-rows"),
      table: sec?.getAttribute("data-table") ?? null,
      count: sec ? Number(sec.getAttribute("data-rows-count")) : 0,
      rendered: sec ? sec.querySelectorAll("tbody tr").length - (sec.querySelector("tbody td.muted[colspan]") ? 1 : 0) : 0,
      text: sec?.innerText.slice(0, 400) ?? "",
      hint: document.querySelector("#which-rows p")?.textContent ?? "",
    };
  });
}

let botId, apiKey, tableName;
try {
  await step("sign up via dev magic link", async () => {
    await go("/signup");
    await page.type("#email", `testdata+${Date.now()}@threadline.test`);
    await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2" }), page.click("#magic-submit")]);
    await page.waitForSelector("#dev-magic-link");
    await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2" }), page.click("#dev-magic-link")]);
    return page.url().replace(BASE, "");
  });

  await step("wizard: idea-only bot → build", async () => {
    await go("/bots/new");
    // Re-read the state every pass: under load the dev server can reload the page mid-wizard and drop a click.
    let typed = false;
    for (let i = 0; i < 20 && !(await page.$("#build-bot")); i++) {
      const ready = await page.waitForFunction(() => !document.querySelector(".typing") && (document.querySelector("#build-bot") || document.querySelector("#wizard-question") || document.querySelector("[data-chip]")), { timeout: 90000 }).then(() => true, () => false);
      if (!ready || (await page.$("#build-bot"))) continue;
      const idea = await page.$('[data-chip="Just an idea"]');
      const chips = await page.$$(".wz-pick .chip");
      if (idea) await idea.click();
      else if (!typed || !chips.length) {
        await page.type("#wizard-answer", "A small coffee roaster. Customers text to order bags of beans (name, beans, quantity, grind). Keep a list of orders. Recommend beans from our menu.");
        await page.keyboard.press("Enter");
        typed = true;
      } else {
        const multi = (await page.$eval(".wz-pick .label", (e) => e.textContent || "").catch(() => "")).toLowerCase().includes("all");
        if (multi) { for (const c of chips.slice(0, 3)) await c.click(); await page.click("#wizard-send"); } else await chips[0].click();
      }
      await sleep(1500);
    }
    await shot("wizard-ready");
    await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2", timeout: 300000 }), page.click("#build-bot")]);
    botId = page.url().match(/\/bots\/([^/]+)\/build/)?.[1];
    if (!botId) throw new Error("expected build page, got " + page.url());
    const end = Date.now() + 15 * 60e3;
    while (Date.now() < end && !(await page.$("#builder-chat"))) {
      if (await page.$eval("#build-progress", (e) => e.textContent.includes("hit a snag")).catch(() => false)) throw new Error("build failed");
      await sleep(1500);
    }
    if (!(await page.$("#builder-chat"))) throw new Error("build did not finish");
    await shot("builder");
    return botId;
  });

  await step("Data before testing: Orders table exists, Customers 0, Test data 0", async () => {
    const v = await tablesView(botId, "live");
    if (!v.table) throw new Error("no Orders-like table: " + JSON.stringify(v));
    tableName = v.table;
    if (v.count !== 0 || v.badge !== 0) throw new Error(JSON.stringify(v));
    return { table: tableName, customers: v.count, test: v.badge };
  });

  await step("builder: take orders into the Orders table (not the pretend create_order tool)", async () => {
    await go(`/bots/${botId}/build`);
    await page.waitForSelector("#builder-input");
    const before = await page.$$eval("#builder-chat .bmsg.assistant .txt", (e) => e.length);
    await page.type("#builder-input", "When a customer places an order, save it as a row in the Orders table. Remove the create_order tool so orders only go into the Orders table.");
    await page.keyboard.press("Enter");
    await page.waitForFunction((n) => document.querySelectorAll("#builder-chat .bmsg.assistant .txt").length > n, { timeout: TIMEOUT }, before);
    return (await page.$$eval("#builder-chat .bmsg.assistant .txt", (e) => e.at(-1).textContent)).slice(0, 200);
  });

  await step("Build playground: test-chat an order into existence", async () => {
    await go(`/bots/${botId}/build`);
    await page.waitForSelector("#preview-input");
    const msgs = [
      "Hi, I'd like to order 2 bags of Ethiopia Yirgacheffe, whole bean. My name is Sam Test, phone 5550101. Please add it to your Orders list.",
      "Yes, that's all correct. Please save it to the Orders list now.",
      "Yes, confirmed. Record it in the Orders list.",
      "Everything is correct. Please save the order row in the Orders list now.",
      "Yes. Save it to Orders.",
    ];
    for (const m of msgs) {
      const before = await page.$$eval('#preview-thread .bub[data-role="them"]', (e) => e.length);
      await page.type("#preview-input", m);
      await page.click("#preview-send");
      await page.waitForFunction((n) => document.querySelectorAll('#preview-thread .bub[data-role="them"]').length > n, { timeout: TIMEOUT }, before);
      await page.waitForFunction(() => !document.querySelector("#preview-thread .typing"), { timeout: TIMEOUT });
      const v = await page.evaluate(async (id) => (await fetch(`/bots/${id}/data?tab=tables&rows=test`)).text(), botId);
      if (/data-test-count="[1-9]/.test(v)) break;
    }
    await shot("playground-order");
    return (await page.$$eval('#preview-thread .bub[data-role="them"]', (e) => e.map((x) => x.textContent).slice(-2).join(" | "))).slice(0, 220);
  });

  await step("order shows under Test data (count 1) and NOT under Customers (count 0)", async () => {
    const t = await tablesView(botId, "test");
    await shot("tables-test-data");
    if (t.pressed !== "test" || t.badge < 1 || t.count < 1 || t.rendered !== t.count) throw new Error("test view: " + JSON.stringify(t));
    if (!/Real customers never see it/.test(t.hint)) throw new Error("missing Flow copy: " + t.hint);
    const c = await tablesView(botId, "live");
    await shot("tables-customers");
    if (c.pressed !== "live" || c.count !== 0 || c.rendered !== 0) throw new Error("customers view: " + JSON.stringify(c));
    await go(`/bots/${botId}/data?tab=saved&rows=test`);
    const saved = await page.evaluate(() => ({ badge: document.querySelector("[data-test-count]")?.getAttribute("data-test-count"), clear: !!document.querySelector("[data-clear-test]"), card: document.querySelector("[data-saved7d]")?.textContent }));
    await shot("saved-test-data");
    if (saved.badge !== String(t.badge) || !saved.clear) throw new Error("saved view (test): " + JSON.stringify(saved));
    await go(`/bots/${botId}/data`);
    const tile = await page.$$eval(".tile", (ts) => ts.map((t) => t.innerText.replace(/\s+/g, " ")).join(" / "));
    await shot("saved-customers");
    return { test: t.count, badge: t.badge, customers: c.count, savedCard: saved.card, tiles: tile };
  });

  await step("Clear test data (confirm) → gone", async () => {
    await go(`/bots/${botId}/data?tab=tables&rows=test`);
    await page.waitForSelector("[data-clear-test]");
    await page.click("[data-clear-test]");
    await page.waitForFunction(() => document.querySelector("[data-test-count]")?.getAttribute("data-test-count") === "0", { timeout: 30000 });
    await shot("tables-test-cleared");
    const t = await tablesView(botId, "test");
    if (t.badge !== 0 || t.count !== 0) throw new Error(JSON.stringify(t));
    const empty = await page.evaluate(() => document.body.innerText.includes("No test data"));
    if (!empty) throw new Error("expected the 'No test data' empty state");
    return t;
  });

  if (process.env.THREADLINE_DB) await step("owner is on Starter (the API's plan) — set directly in the run's own test DB", async () => {
    const { DatabaseSync } = await import("node:sqlite");
    const d = new DatabaseSync(process.env.THREADLINE_DB);
    d.prepare("UPDATE users SET plan='starter' WHERE id=(SELECT user_id FROM bots WHERE id=?)").run(botId);
    d.close();
    return "starter";
  });

  await step("create API key in Settings", async () => {
    await go(`/bots/${botId}/data`);
    await page.click("#open-settings");
    await page.waitForSelector("#settings-modal");
    await page.click("#create-key");
    await page.waitForSelector("#new-api-key", { timeout: 30000 });
    apiKey = await page.$eval("#new-api-key", (e) => e.textContent.trim());
    if (!apiKey.startsWith("tl_live_")) throw new Error("unexpected key");
    await page.keyboard.press("Escape");
    return apiKey.slice(0, 12) + "…";
  });

  await step("real write via POST /api/v1/bots/:id/tables/:name/rows → shows under Customers", async () => {
    const h = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
    const url = `${BASE}/api/v1/bots/${botId}/tables/${encodeURIComponent(tableName)}/rows`;
    const bad = await fetch(url, { method: "POST", headers: h, body: JSON.stringify({ data: [] }) });
    if (bad.status !== 422) throw new Error("bad body → " + bad.status);
    const r = await fetch(url, { method: "POST", headers: h, body: JSON.stringify({ data: { Item: "Ethiopia Yirgacheffe", Quantity: 1, "Customer name": "Real Rita", Status: "New" } }) });
    const j = await r.json();
    if (r.status !== 201 || !j.data?.id) throw new Error(`POST → ${r.status} ${JSON.stringify(j)}`);
    const g = await (await fetch(url, { headers: h })).json();
    const gt = await (await fetch(url + "?rows=test", { headers: h })).json();
    if (g.rows !== "live" || !g.data.some((x) => x.id === j.data.id) || gt.data.length !== 0) throw new Error("GET: " + JSON.stringify({ g, gt }));
    const c = await tablesView(botId, "live");
    await shot("tables-customers-after-api");
    if (c.count !== 1 || !c.text.includes("Real Rita")) throw new Error(JSON.stringify(c));
    const t = await tablesView(botId, "test");
    if (t.badge !== 0) throw new Error("API row leaked into Test data: " + JSON.stringify(t));
    return { status: r.status, id: j.data.id, customers: c.count, test: t.badge };
  });

  await step("mobile: toggle fits at 390px", async () => {
    await page.setViewport({ width: 390, height: 844, isMobile: true });
    await tablesView(botId, "live");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await shot("mobile-tables");
    await page.setViewport({ width: 1440, height: 900 });
    if (overflow > 2) throw new Error(`page scrolls sideways by ${overflow}px`);
    return "no horizontal overflow";
  });
} catch {
  /* logged in step() */
} finally {
  await browser.close();
  log(failed ? `FAILED (${failed})` : "ALL PASSED", botId ? `bot ${botId}` : "", `screenshots: ${SHOTS}`);
  process.exit(failed ? 1 : 0);
}
