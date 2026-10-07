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

function parseRobots(txt: string) {
  const disallow: string[] = [];
  const sitemaps: string[] = [];
  let applies = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const [k, ...rest] = line.split(":");
    const v = rest.join(":").trim();
    if (!k) continue;
    const key = k.toLowerCase();
    if (key === "user-agent") applies = v === "*" || /threadline/i.test(v);
    else if (key === "disallow" && applies && v) disallow.push(v);
    else if (key === "sitemap" && v) sitemaps.push(v);
  }
  return { disallow, sitemaps };
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
    return locs.filter((l) => l.startsWith(origin));
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
  const start = new URL(startUrl);
  const origin = start.origin;
  const errors: string[] = [];

  let disallow: string[] = [];
  let sitemaps: string[] = [];
  try {
    const r = await fetchText(origin + "/robots.txt", 8000, "text/plain");
    if (r.status === 200) ({ disallow, sitemaps } = parseRobots(r.text));
  } catch (e) { errors.push("robots: " + (e as Error).message); }
  const allowed = (u: string) => { const p = new URL(u).pathname; return !disallow.some((d) => p.startsWith(d.replace(/\*.*$/, ""))); };

  if (!sitemaps.length) sitemaps = [origin + "/sitemap.xml"];
  const fromSitemap = (await Promise.all(sitemaps.map((s) => sitemapUrls(s, origin)))).flat();

  // Platform JSON (catalog truth for Shopify/Woo)
  const platform = await detectPlatform(origin);
  const products: Product[] = [...platform.products];

  const norm = (u: string) => { const x = new URL(u); x.hash = ""; x.search = ""; return x.toString().replace(/\/$/, "") || x.toString(); };
  const queue: string[] = [];
  const seen = new Set<string>();
  const push = (u: string) => {
    try {
      if (SKIP.test(u) || !u.startsWith(origin) || !allowed(u)) return;
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
  let headlessBudget = 10;
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
  await Promise.all(Array.from({ length: conc }, worker));
  await closeHeadless();

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
        return {
          kind: "shopify",
          products: j.products.map((p: any) => ({
            name: p.title, url: `${origin}/products/${p.handle}`,
            description: String(p.body_html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400),
            price: fmtPrice(p.variants?.[0]?.price), availability: p.variants?.some((v: any) => v.available) ? "InStock" : "OutOfStock",
            variants: p.variants?.length > 1 ? p.variants.map((v: any) => `${v.title}: ${fmtPrice(v.price)}`) : undefined,
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
export async function renderHeadless(url: string): Promise<string> {
  const { existsSync } = await import("node:fs");
  const exe = CHROME_PATHS.find((p) => existsSync(p));
  if (!exe) throw new Error("no Chrome found (set CHROME_PATH)");
  const puppeteer: any = (await import("puppeteer-core")).default;
  browserP ??= puppeteer.launch({ executablePath: exe, headless: true, args: ["--no-sandbox", "--disable-gpu"] });
  const browser = await browserP;
  const page = await browser.newPage();
  try {
    await page.setUserAgent(UA);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 20_000 });
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
