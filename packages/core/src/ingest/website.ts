// Website crawler: robots + sitemap first, else BFS same-origin; Shopify/WooCommerce JSON; headless fallback for JS shells.
import { extractPage, looksLikeShell, fmtPrice, type PageExtract, type Product } from "./extract.ts";

export const UA = "ThreadlineBot/0.1 (+https://threadline.app/bot; builds a customer-service assistant for the site owner)";

export interface CrawlResult {
  pages: PageExtract[];
  products: Product[];          // de-duplicated across pages + platform JSON
  platform: "shopify" | "woocommerce" | null;
  errors: string[];
}
export interface CrawlOpts { maxPages?: number; concurrency?: number; timeoutMs?: number; onPage?: (url: string, n: number) => void }

export async function fetchText(url: string, timeoutMs = 10_000, accept = "text/html,application/xhtml+xml,*/*"): Promise<{ status: number; text: string; type: string; url: string }> {
  const r = await fetch(url, { headers: { "user-agent": UA, accept }, redirect: "follow", signal: AbortSignal.timeout(timeoutMs) });
  return { status: r.status, text: await r.text(), type: r.headers.get("content-type") ?? "", url: r.url || url };
}

export interface RobotsRule { allow: boolean; path: string; re: RegExp }
/** robots.txt per RFC 9309: groups of consecutive user-agent lines, `*` wildcards, `$` anchors, longest match wins, Allow beats Disallow on ties. */
export function parseRobots(txt: string, origin = "") {
  const sitemaps: string[] = [];
  const groups: { agents: string[]; rules: RobotsRule[] }[] = [];
  let cur: { agents: string[]; rules: RobotsRule[] } | null = null;
  let lastWasAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const i = line.indexOf(":");
    if (i < 0) continue;
    const key = line.slice(0, i).trim().toLowerCase();
    const v = line.slice(i + 1).trim();
    if (key === "user-agent") {
      if (!lastWasAgent || !cur) { cur = { agents: [], rules: [] }; groups.push(cur); }
      cur.agents.push(v.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (key === "sitemap" && v) { try { sitemaps.push(new URL(v, origin || undefined).toString()); } catch { /* bad */ } }
    else if ((key === "disallow" || key === "allow") && cur && v) {
      const re = new RegExp("^" + v.replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"));
      cur.rules.push({ allow: key === "allow", path: v, re });
    }
  }
  const mine = groups.filter((g) => g.agents.some((a) => a.includes("threadline")));
  const rules = (mine.length ? mine : groups.filter((g) => g.agents.includes("*"))).flatMap((g) => g.rules);
  const allowed = (pathAndQuery: string) => {
    let best: RobotsRule | null = null;
    for (const r of rules) if (r.re.test(pathAndQuery) && (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow))) best = r;
    return !best || best.allow;
  };
  return { allowed, sitemaps, rules };
}

async function sitemapUrls(url: string, origin: string, depth = 0): Promise<string[]> {
  if (depth > 2) return [];
  try {
    const r = await fetchText(url, 10_000, "application/xml,text/xml,*/*");
    if (r.status !== 200) return [];
    const locs = [...r.text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));
    if (/<sitemapindex/i.test(r.text)) {
      const nested = await Promise.all(locs.slice(0, 8).map((l) => sitemapUrls(l, origin, depth + 1)));
      return nested.flat();
    }
    const bare = (h: string) => h.replace(/^www\./, "");
    const host = bare(new URL(origin).hostname);
    return locs.filter((l) => { try { return bare(new URL(l).hostname) === host; } catch { return false; } });
  } catch { return []; }
}

// Prefer pages that carry facts customers ask about.
function priority(u: string) {
  const p = new URL(u).pathname.toLowerCase();
  if (p === "/" || p === "") return 0;
  if (/faq|shipping|return|refund|delivery|contact|about|story|pricing|policy|terms/.test(p)) return 1;
  if (/product|shop|menu|collection|service|plan/.test(p)) return 2;
  if (/blog|journal|news|post/.test(p)) return 4;
  return 3;
}
const SKIP = /\.(png|jpe?g|gif|webp|svg|pdf|zip|mp4|mp3|css|js|ico|woff2?)(\?|$)/i;

export async function crawlWebsite(startUrl: string, opts: CrawlOpts = {}): Promise<CrawlResult> {
  const maxPages = opts.maxPages ?? Number(process.env.THREADLINE_CRAWL_MAX || 40);
  const conc = opts.concurrency ?? 4;
  let start = new URL(/^https?:\/\//i.test(startUrl) ? startUrl : `https://${startUrl}`);
  const errors: string[] = [];
  // follow the start URL's redirects (www ↔ apex, http → https, /en-us …) so links on the real host count as same-site
  const declaredOrigin = start.origin;
  try { const r = await fetch(start, { method: "GET", headers: { "user-agent": UA }, redirect: "follow", signal: AbortSignal.timeout(15_000) }); if (r.url) start = new URL(r.url); r.body?.cancel().catch(() => {}); }
  catch (e) { errors.push(`start: ${(e as Error).message}`); }
  const origin = start.origin;
  const bare = (h: string) => h.replace(/^www\./, "");
  const sameSite = (u: string) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) && bare(x.hostname) === bare(start.hostname); } catch { return false; } };
  const toOrigin = (u: string) => { const x = new URL(u); x.protocol = start.protocol; x.host = start.host; return x.toString(); };

  let robots = parseRobots("", origin);
  try {
    const r = await fetchText(origin + "/robots.txt", 8000, "text/plain");
    if (r.status === 200 && !/html/i.test(r.type)) robots = parseRobots(r.text, origin);
  } catch (e) { errors.push("robots: " + (e as Error).message); }
  let sitemaps = robots.sitemaps;
  const allowed = (u: string) => { const x = new URL(u); return robots.allowed(x.pathname + x.search); };
  let robotsBlocked = 0;

  if (!sitemaps.length) sitemaps = [origin + "/sitemap.xml"];
  const fromSitemap = (await Promise.all(sitemaps.slice(0, 4).map((s) => sitemapUrls(s, origin)))).flat();

  // Platform JSON (catalog truth for Shopify/Woo). Some headless storefronts keep the JSON on the declared host.
  let platform = await detectPlatform(origin);
  if (!platform.kind && declaredOrigin !== origin) platform = await detectPlatform(declaredOrigin);
  const products: Product[] = [...platform.products];

  const norm = (u: string) => { const x = new URL(u); x.hash = ""; x.search = ""; return x.toString().replace(/\/$/, "") || x.toString(); };
  const queue: string[] = [];
  const seen = new Set<string>();
  const push = (u: string) => {
    try {
      if (SKIP.test(u) || !sameSite(u)) return;
      u = toOrigin(u);
      if (!allowed(u)) { robotsBlocked++; return; }
      const n = norm(u);
      if (seen.has(n)) return;
      seen.add(n); queue.push(n);
    } catch { /* bad url */ }
  };
  push(start.toString());
  [...new Set(fromSitemap)].sort((a, b) => priority(a) - priority(b)).forEach(push);

  const pages: PageExtract[] = [];
  const t0 = Date.now();
  const useBfs = fromSitemap.length === 0;
  let headlessBudget = Number(process.env.THREADLINE_HEADLESS_MAX || 25);
  let emptyPages = 0;
  holdHeadless();
  const retried = new Set<string>();
  async function worker() {
    while (queue.length && pages.length < maxPages) {
      const u = queue.shift()!;
      try {
        const r = await fetchText(u, opts.timeoutMs ?? 20_000);
        if (r.status >= 500 && !retried.has(u)) { retried.add(u); queue.push(u); continue; }
        if (r.status >= 400 || !/html/i.test(r.type)) continue;
        let ex = extractPage(r.text, u);
        if (looksLikeShell(r.text, ex) && headlessBudget-- > 0) {
          const html = await renderHeadless(u).catch((e) => { errors.push(`headless ${u}: ${e.message}`); return null; });
          if (html) ex = extractPage(html, u);
        }
        if (pages.length >= maxPages) break;
        if (ex.text.length < 40 && !ex.products.length && !ex.faqs.length) { emptyPages++; continue; } // unrendered shell: nothing to learn
        pages.push(ex);
        opts.onPage?.(u, pages.length);
        if (process.env.THREADLINE_DEBUG) console.error(`[crawl] ${pages.length} ${u} ${Date.now() - t0}ms`);
        if (useBfs || queue.length < 5) ex.links.sort((a, b) => priority(a) - priority(b)).forEach(push);
      } catch (e) {
        // slow/cold servers: retry once at the back of the queue
        if (!retried.has(u)) { retried.add(u); queue.push(u); }
        else errors.push(`${u}: ${(e as Error).message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: conc }, worker)).finally(releaseHeadless);
  if (!pages.length) errors.unshift(robotsBlocked && seen.size === 0
    ? `${start.hostname}'s robots.txt blocks crawlers (only search engines are allowed) — paste the key pages as text, or describe the business as an idea`
    : `no readable pages at ${origin} (${seen.size} URL${seen.size === 1 ? "" : "s"} tried${emptyPages ? `, ${emptyPages} rendered empty` : ""}${robotsBlocked ? `, ${robotsBlocked} blocked by robots.txt` : ""})`);

  for (const p of pages) products.push(...p.products);
  return { pages, products: dedupeProducts(products), platform: platform.kind, errors };
}

function dedupeProducts(list: Product[]) {
  const by = new Map<string, Product>();
  for (const p of list) {
    if (!p.name) continue;
    const k = p.name.toLowerCase();
    const prev = by.get(k);
    if (!prev) by.set(k, p);
    else by.set(k, { ...p, ...Object.fromEntries(Object.entries(prev).filter(([, v]) => v !== undefined)) } as Product);
  }
  return [...by.values()];
}

async function detectPlatform(origin: string): Promise<{ kind: "shopify" | "woocommerce" | null; products: Product[] }> {
  try {
    const r = await fetchText(origin + "/products.json?limit=250", 8000, "application/json");
    if (r.status === 200 && r.type.includes("json")) {
      const j = JSON.parse(r.text);
      if (Array.isArray(j.products)) {
        // Shopify Markets geo-converts prices to the visitor's currency; pin the shop's own currency so the bot quotes real prices.
        let currency: string | undefined;
        try { const m = await fetchText(origin + "/meta.json", 6000, "application/json"); if (m.status === 200) currency = JSON.parse(m.text).currency; } catch { /* optional */ }
        let all: any[] = j.products;
        if (currency) {
          all = [];
          for (let page = 1; page <= 4; page++) {
            const pr = await fetchText(`${origin}/products.json?limit=250&page=${page}&currency=${currency}`, 10_000, "application/json").catch(() => null);
            const pj = pr && pr.status === 200 ? (() => { try { return JSON.parse(pr.text); } catch { return null; } })() : null;
            if (!pj?.products?.length) break;
            all.push(...pj.products);
            if (pj.products.length < 250) break;
          }
          if (!all.length) { all = j.products; currency = undefined; }
        }
        return {
          kind: "shopify",
          products: all.map((p: any) => ({
            name: p.title, url: `${origin}/products/${p.handle}`, currency,
            description: String(p.body_html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400),
            price: fmtPrice(p.variants?.[0]?.price, currency), availability: p.variants?.some((v: any) => v.available) ? "InStock" : "OutOfStock",
            variants: p.variants?.length > 1 ? p.variants.slice(0, 12).map((v: any) => `${v.title}: ${fmtPrice(v.price, currency)}${v.available === false ? " (sold out)" : ""}`) : undefined,
          })),
        };
      }
    }
  } catch { /* not shopify */ }
  try {
    const r = await fetchText(origin + "/wp-json/wc/store/products?per_page=100", 8000, "application/json");
    if (r.status === 200 && r.type.includes("json")) {
      const j = JSON.parse(r.text);
      if (Array.isArray(j)) {
        return {
          kind: "woocommerce",
          products: j.map((p: any) => {
            const minor = p.prices?.currency_minor_unit ?? 2;
            const price = p.prices?.price ? Number(p.prices.price) / 10 ** minor : undefined;
            return {
              name: p.name, url: p.permalink, price: fmtPrice(price, p.prices?.currency_code),
              description: String(p.short_description || p.description || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400),
              availability: p.is_in_stock ? "InStock" : "OutOfStock",
            };
          }),
        };
      }
    }
  } catch { /* not woo */ }
  return { kind: null, products: [] };
}

// ───────── headless Chrome (puppeteer-core + system Chrome) for client-rendered shells ─────────
const CHROME_PATHS = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
].filter(Boolean) as string[];

let browserP: Promise<any> | null = null;
// Several crawls (parallel builds) share one Chrome; only the last one out closes it.
let headlessUsers = 0;
function holdHeadless() { headlessUsers++; }
async function releaseHeadless() { headlessUsers = Math.max(0, headlessUsers - 1); if (headlessUsers === 0) await closeHeadless(); }
export async function renderHeadless(url: string): Promise<string> {
  const { existsSync } = await import("node:fs");
  const exe = CHROME_PATHS.find((p) => existsSync(p));
  if (!exe) throw new Error("no Chrome found (set CHROME_PATH)");
  const puppeteer: any = (await import("puppeteer-core")).default;
  browserP ??= puppeteer.launch({ executablePath: exe, headless: true, args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] });
  let browser = await browserP;
  if (!browser.connected) { browserP = puppeteer.launch({ executablePath: exe, headless: true, args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] }); browser = await browserP; }
  const page = await browser.newPage();
  try {
    await page.setUserAgent(UA);
    // SPAs that poll forever never reach networkidle; wait for the DOM, then for real text to render.
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25_000 });
    await page.waitForFunction(() => (document.body?.innerText ?? "").trim().length > 400, { timeout: 10_000, polling: 300 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 600));
    return await page.content();
  } finally {
    await page.close().catch(() => {});
  }
}
export async function closeHeadless() {
  if (!browserP) return;
  const b = await browserP.catch(() => null);
  browserP = null;
  await b?.close().catch(() => {});
}
