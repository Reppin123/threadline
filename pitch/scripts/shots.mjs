// Real screenshots of the running app for the deck.
//   node pitch/scripts/shots.mjs   (BASE_URL defaults to http://localhost:3000; EMAIL = existing user with a live bot)
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../../apps/web/package.json"));
const puppeteer = require("puppeteer-core");
const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const EMAIL = process.env.EMAIL;
const BOT = process.env.BOT;
const OUT = join(here, "..", "assets");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
page.setDefaultNavigationTimeout(120000);
const go = (p) => page.goto(BASE + p, { waitUntil: "domcontentloaded" }).then(() => sleep(3500));
const shot = async (name) => { await sleep(1200); await page.screenshot({ path: join(OUT, name + ".png") }); console.log("shot", name, page.url()); };

await go("/"); await shot("landing");
if (EMAIL) {
  await go("/signup");
  await page.type("#email", EMAIL);
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2" }), page.click("#magic-submit")]);
  await page.waitForSelector("#dev-magic-link");
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2" }), page.click("#dev-magic-link")]);
  await go("/dashboard"); await shot("dashboard");
  await go("/bots/new"); await sleep(3000); await shot("wizard");
  if (BOT) {
    for (const [p, n] of [["build", "builder"], ["deploy", "deploy"], ["stats", "stats"], ["conversations", "conversations"], ["data", "data"], ["versions", "versions"]]) {
      await go(`/bots/${BOT}/${p}`); await shot(n);
    }
  }
}
await browser.close();
