// Builds pitch/deck.html (images inlined, self-contained) and pitch/deck.pdf (one slide per page).
//   node pitch/scripts/build.mjs [--no-pdf]
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const tmp = mkdtempSync(join(tmpdir(), "tl-pitch-"));
let html = readFileSync(join(root, "src", "deck.src.html"), "utf8");

html = html.replace(/src="assets\/([\w-]+)\.png"/g, (_, name) => {
  const src = join(root, "assets", name + ".png");
  if (!existsSync(src)) throw new Error("missing asset " + src);
  const out = join(tmp, name + ".jpg");
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "82", "-Z", "1800", src, "--out", out], { stdio: "ignore" });
  return `src="data:image/jpeg;base64,${readFileSync(out).toString("base64")}"`;
});
writeFileSync(join(root, "deck.html"), html);
console.log("wrote pitch/deck.html", (html.length / 1e6).toFixed(2), "MB");

if (!process.argv.includes("--no-pdf")) {
  const require = createRequire(join(root, "../apps/web/package.json"));
  const puppeteer = require("puppeteer-core");
  const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.goto(pathToFileURL(join(root, "deck.html")).href, { waitUntil: "load" });
  await page.emulateMediaType("print");
  await page.evaluateHandle("document.fonts.ready");
  // Layout check: content must stay inside the slide and clear of the source line at the bottom.
  const problems = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll(".slide").forEach((s, i) => {
      const sr = s.getBoundingClientRect();
      const src = s.querySelector(".src");
      const limit = src ? src.getBoundingClientRect().top - 4 : sr.bottom - 24;
      s.querySelectorAll("*").forEach((el) => {
        if (el.closest(".src,.num,aside,.shot")) return;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        if (r.right > sr.right - 40 || r.bottom > limit) out.push(`slide ${i + 1}: <${el.tagName.toLowerCase()} class="${el.className}"> ${el.textContent.trim().slice(0, 40)}`);
        if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow === "hidden" && !el.classList.contains("slide")) out.push(`slide ${i + 1}: clipped ${el.className}`);
      });
    });
    return [...new Set(out)];
  });
  if (problems.length) console.log("LAYOUT PROBLEMS:\n" + problems.join("\n")); else console.log("layout check: ok");
  await page.pdf({ path: join(root, "deck.pdf"), width: "1280px", height: "720px", printBackground: true, preferCSSPageSize: true });
  await browser.close();
  console.log("wrote pitch/deck.pdf");
}
