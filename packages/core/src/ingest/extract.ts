// HTML → clean page text + structured facts (JSON-LD Product/Offer/FAQPage/Organization, OpenGraph, product grids).
import * as cheerio from "cheerio";

export interface Product { name: string; price?: string; currency?: string; url?: string; description?: string; sku?: string; availability?: string; variants?: string[] }
export interface PageExtract {
  url: string;
  title: string;
  description: string;
  headings: string[];
  text: string;                 // main readable text
  links: string[];              // absolute same-origin + external links
  products: Product[];
  faqs: { q: string; a: string }[];
  organization?: Record<string, unknown>;
  og: Record<string, string>;
}

const CURRENCY: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };
export function fmtPrice(price: string | number | undefined, currency?: string) {
  if (price === undefined || price === null || price === "") return undefined;
  const n = Number(price);
  const v = Number.isFinite(n) ? (Number.isInteger(n) ? String(n) : n.toFixed(2)) : String(price);
  const sym = currency ? CURRENCY[currency.toUpperCase()] : "";
  return sym ? `${sym}${v}` : currency ? `${v} ${currency}` : v;
}

function walkLd(node: any, out: any[]) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { node.forEach((n) => walkLd(n, out)); return; }
  if (node["@graph"]) walkLd(node["@graph"], out);
  if (node["@type"]) out.push(node);
  for (const k of ["itemListElement", "item", "mainEntity", "hasVariant"]) if (node[k]) walkLd(node[k], out);
}
const typeIs = (n: any, t: string) => (Array.isArray(n["@type"]) ? n["@type"] : [n["@type"]]).includes(t);
const clean = (s: unknown) => String(s ?? "").replace(/\s+/g, " ").trim();

export function extractPage(html: string, url: string): PageExtract {
  const $ = cheerio.load(html);
  const origin = new URL(url).origin;

  // JSON-LD
  const ld: any[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try { walkLd(JSON.parse($(el).contents().text()), ld); } catch { /* ignore bad JSON-LD */ }
  });
  const products: Product[] = [];
  const faqs: { q: string; a: string }[] = [];
  let organization: Record<string, unknown> | undefined;
  for (const n of ld) {
    if (typeIs(n, "Product")) {
      const offers = Array.isArray(n.offers) ? n.offers : n.offers ? [n.offers.offers ?? n.offers].flat() : [];
      const first = offers[0] ?? {};
      const price = first.price ?? first.lowPrice;
      products.push({
        name: clean(n.name), description: clean(n.description).slice(0, 400) || undefined, sku: n.sku,
        price: fmtPrice(price, first.priceCurrency), currency: first.priceCurrency,
        url: first.url || n.url || url,
        availability: first.availability ? String(first.availability).split("/").pop() : undefined,
        variants: offers.length > 1 ? offers.map((o: any) => `${clean(o.name) || o.sku}: ${fmtPrice(o.price, o.priceCurrency)}`) : offers[0]?.name ? [`${clean(offers[0].name)}: ${fmtPrice(price, first.priceCurrency)}`] : undefined,
      });
    } else if (typeIs(n, "FAQPage")) {
      for (const q of [n.mainEntity].flat()) if (q?.name) faqs.push({ q: clean(q.name), a: clean(q.acceptedAnswer?.text ?? "") });
    } else if (typeIs(n, "Question") && n.acceptedAnswer) {
      faqs.push({ q: clean(n.name), a: clean(n.acceptedAnswer.text) });
    } else if (typeIs(n, "Organization") || typeIs(n, "LocalBusiness") || typeIs(n, "Store")) {
      organization = { name: n.name, url: n.url, email: n.email, telephone: n.telephone, address: n.address, slogan: n.slogan, sameAs: n.sameAs };
    }
  }

  // OpenGraph / meta
  const og: Record<string, string> = {};
  $("meta[property^='og:'], meta[property^='product:']").each((_, el) => { og[$(el).attr("property")!] = $(el).attr("content") ?? ""; });
  if (og["product:price:amount"] && !products.length) {
    products.push({ name: clean(og["og:title"]), price: fmtPrice(og["product:price:amount"], og["product:price:currency"]), url });
  }

  const title = clean($("title").first().text()) || clean(og["og:title"]);
  const description = clean($('meta[name="description"]').attr("content")) || clean(og["og:description"]);

  // links before stripping chrome
  const links = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")!;
    if (/^(mailto|tel|javascript):/i.test(href) || href.startsWith("#")) return;
    try { const u = new URL(href, url); u.hash = ""; links.add(u.toString()); } catch { /* bad href */ }
  });

  // product grid heuristic: cards with a link + a price-looking string (when no JSON-LD products on the page)
  if (!products.length) {
    const seen = new Set<string>();
    $("a[href]").each((_, el) => {
      const a = $(el);
      const card = a.closest("li, article, [class*=card], [class*=product], [class*=item]");
      if (!card.length) return;
      const txt = clean(card.text());
      const m = txt.match(/(₹|Rs\.?|\$|€|£)\s?([\d,]+(?:\.\d{1,2})?)/);
      if (!m || txt.length > 400) return;
      const name = clean(card.find("h2,h3,h4,[class*=title],[class*=name]").first().text()) || clean(a.attr("title") ?? a.text());
      if (!name || name.length > 120 || seen.has(name)) return;
      seen.add(name);
      let href: string | undefined;
      try { href = new URL(a.attr("href")!, url).toString(); } catch { /* ignore */ }
      products.push({ name, price: `${m[1] === "Rs" || m[1] === "Rs." ? "₹" : m[1]}${m[2]}`, url: href?.startsWith(origin) ? href : undefined });
    });
  }

  // main text: drop chrome
  $("script, style, noscript, svg, iframe, template, nav, footer, form, button, [aria-hidden=true], [role=navigation], .sr-only").remove();
  const headings: string[] = [];
  $("h1, h2, h3").each((_, el) => { const t = clean($(el).text()); if (t && t.length < 160) headings.push(t); });
  const root = $("main").length ? $("main") : $("body");
  const blocks: string[] = [];
  root.find("h1,h2,h3,h4,h5,p,li,dt,dd,td,th,blockquote,figcaption,summary,details > div").each((_, el) => {
    const t = clean($(el).clone().children("ul,ol").remove().end().text());
    if (!t) return;
    const tag = (el as any).tagName?.toLowerCase();
    blocks.push(/^h[1-5]$/.test(tag) ? `\n## ${t}` : tag === "li" ? `- ${t}` : t);
  });
  let text = dedupeLines(blocks).join("\n");
  if (text.length < 200) text = clean(root.text());
  // announcement bars / header promos (often outside <main>) carry shipping facts
  const promo = clean($("[class*=announce], [class*=promo], [class*=banner]").first().text());
  if (promo && !text.includes(promo)) text = promo + "\n" + text;

  return { url, title, description, headings, text: text.trim(), links: [...links], products, faqs, organization, og };
}

function dedupeLines(lines: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of lines) {
    const k = l.replace(/^[-#\s]+/, "");
    if (k.length > 2 && seen.has(k)) continue;
    seen.add(k);
    out.push(l);
  }
  return out;
}

/** Heuristic: page is a client-rendered shell (needs headless browser). */
export function looksLikeShell(html: string, ex: PageExtract) {
  if (ex.text.length >= 250) return false;
  return ex.text.length < 80 || /<div id="(root|app|__next)"[^>]*>\s*<\/div>/i.test(html) || /<noscript>[^<]*enable javascript/i.test(html);
}
