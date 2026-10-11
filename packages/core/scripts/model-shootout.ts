// Model shootout: runs a fixed set of realistic Threadline customer turns through the REAL chat() tool loop
// (runtime.ts) once per provider and compares tool-calling correctness, cost and latency.
//   node --experimental-strip-types packages/core/scripts/model-shootout.ts [--providers=anthropic,deepseek,kimi,glm,openai,cli]
//        [--runs=N] [--only=order,schedule,...] [--out=path.md] [--verbose] [--offline-check]
// Providers with no key are skipped and listed with the env var they need. The bot fixture is built once with the
// offline LLM (no spend), then each provider answers the same turns. Own DB: THREADLINE_DB (default /tmp/tl-models-shootout.db).
import { createServer } from "node:http";
import { rmSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const arg = (k: string) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const RUNS = Math.max(1, Number(arg("runs") ?? 1));
const ONLY = arg("only")?.split(",");
const OUT = arg("out");
const OFFLINE_CHECK = args.includes("--offline-check");   // harness self-check: run the scenarios against the offline stub

const DB = process.env.THREADLINE_DB || "/tmp/tl-models-shootout.db";
for (const s of ["", "-wal", "-shm"]) rmSync(DB + s, { force: true });
process.env.THREADLINE_DB = DB;

const { run, get, all, id } = await import("@threadline/db");
const { core, providerConfigured, providerKeyEnvs, providerModel } = await import("../src/index.ts");
// resolve configured providers (loads ANTHROPIC_API_KEY from the macOS Keychain once) BEFORE forcing the offline stub
const configured = new Set((["anthropic", "openai", "deepseek", "kimi", "glm", "cli"] as const).filter((p) => providerConfigured(p)));
process.env.THREADLINE_LLM = "offline";   // fixture build is offline; flipped per provider below
type ProviderName = import("../src/index.ts").ProviderName;

// ───────── fixture: a tiny tea shop served locally ─────────
const html = (body: string, ld = "") => `<!doctype html><html><head><title>Leafy Tea Co</title><meta name="description" content="Small-batch teas from Darjeeling">${ld}</head><body><nav><a href="/">Home</a><a href="/shipping">Shipping</a></nav><main>${body}</main></body></html>`;
const product = (name: string, price: string, slug: string) => `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "Product", name, description: `${name} — whole leaf`, offers: [{ "@type": "Offer", price, priceCurrency: "INR", url: `/products/${slug}` }] })}</script>`;
const srv = createServer((req, res) => {
  const p = new URL(req.url!, "http://x").pathname;
  const send = (c: number, b: string, t = "text/html") => { res.writeHead(c, { "content-type": t }); res.end(b); };
  if (p === "/robots.txt") return send(200, "User-agent: *\nAllow: /\n", "text/plain");
  if (p === "/sitemap.xml") return send(200, `<?xml version="1.0"?><urlset>${["/", "/shipping", "/products/darjeeling-first-flush", "/products/masala-chai"].map((u) => `<url><loc>${origin}${u}</loc></url>`).join("")}</urlset>`, "application/xml");
  if (p === "/") return send(200, html(`<h1>Leafy Tea Co</h1><p>Small-batch Darjeeling teas and masala chai, packed fresh in Kalimpong.</p>`));
  if (p === "/shipping") return send(200, html(`<h1>Shipping & returns</h1><p>Free shipping on orders above ₹799. Below that a flat ₹60 applies.</p><p>Opened packs cannot be returned. Damaged orders are replaced if reported within 48 hours.</p>`));
  if (p === "/products/darjeeling-first-flush") return send(200, html(`<h1>Darjeeling First Flush</h1><p>Brew at 85°C for 3 minutes.</p>`, product("Darjeeling First Flush", "450", "darjeeling-first-flush")));
  if (p === "/products/masala-chai") return send(200, html(`<h1>Masala Chai</h1><p>Boil with milk and sugar for 4 minutes.</p>`, product("Masala Chai", "250", "masala-chai")));
  send(404, "nope", "text/plain");
});
await new Promise<void>((r) => srv.listen(0, "127.0.0.1", () => r()));
const origin = `http://127.0.0.1:${(srv.address() as any).port}`;

const userId = id("u_");
run("INSERT INTO users(id,email) VALUES (?,?)", [userId, `${userId}@shootout.dev`]);
const wizard = [
  { question: "What are we starting from?", answer: "Existing website or app" },
  { question: "What's the website or app address?", answer: origin },
  { question: "Who will chat with the Leafy bot?", answer: ["My customers"] },
  { question: "What should the Leafy bot do?", answer: ["Take orders", "Recommend teas"] },
  { question: "For taking and tracking orders, use…", answer: "Just a website" },
];
const { botId } = await core.createBot(userId, { kind: "website", url: origin + "/" }, wizard);
await core.buildBot(botId);
srv.close();

// ───────── scenarios ─────────
interface Ctx { handle: string; turns: Turn[] }
interface Turn { text: string; replies: string[]; toolCalls: { name: string; input: any; ok: boolean }[]; ms: number; cost: number }
interface Scenario {
  key: string; title: string;
  setup?: (handle: string) => Promise<void>;       // runs on the offline stub, before the provider is switched in
  say: string[];                                    // customer turns, sent in order
  check: (c: Ctx) => string | null;                 // null = pass, otherwise the failure reason
}
const called = (c: Ctx, name: string) => c.turns.flatMap((t) => t.toolCalls).filter((t) => t.name === name && t.ok);
const reply = (c: Ctx) => c.turns.flatMap((t) => t.replies).join(" ");
const customerRows = (handle: string, table: string) => all<any>(
  `SELECT r.data_json FROM bot_table_rows r JOIN bot_tables t ON t.id=r.table_id JOIN customers c ON c.id=r.customer_id
   WHERE t.bot_id=? AND t.name=? AND c.handle=?`, [botId, table, handle]).map((r) => JSON.parse(r.data_json));

const SCENARIOS: Scenario[] = [
  { key: "order", title: "save an order (2 Masala Chai)",
    say: ["Hi! I'd like to order 2 Masala Chai please. My name is Priya, phone +91 98765 43210, deliver to 14 Lake Road, Kalimpong.", "Yes, please confirm the order."],
    check: (c) => {
      if (!called(c, "save_row").length) return "no successful save_row";
      const rows = customerRows(c.handle, "Orders");
      if (!rows.length) return "Orders table has no row for the customer";
      const blob = JSON.stringify(rows).toLowerCase();
      if (!/chai/.test(blob)) return `row doesn't mention the product: ${blob.slice(0, 120)}`;
      if (!/\b2\b|two/.test(blob)) return `row doesn't carry quantity 2: ${blob.slice(0, 120)}`;
      if (rows.length > 1) return `duplicate order rows (${rows.length})`;
      return reply(c).trim() ? null : "empty reply";
    } },
  { key: "schedule", title: "schedule a recurring reminder (every Monday 9am)",
    say: ["Please text me every Monday at 9am to remind me to reorder my chai."],
    check: (c) => {
      if (!called(c, "schedule_message").length) return "no successful schedule_message";
      const rows = all<any>(`SELECT s.repeat, s.days, s.at_time FROM scheduled_messages s JOIN customers cu ON cu.id=s.customer_id WHERE s.bot_id=? AND cu.handle=? AND s.status='scheduled'`, [botId, c.handle]);
      if (!rows.length) return "no scheduled_messages row";
      const r = rows[0];
      if (r.repeat !== "weekly" || !/mon/.test(r.days ?? "") || r.at_time !== "09:00") return `wrong recurrence: ${JSON.stringify(r)}`;
      return reply(c).trim() ? null : "empty reply";
    } },
  { key: "lookup", title: "look up the customer's past order",
    setup: async (handle) => {
      const { ensureCustomer } = await import("../src/memory.ts");
      const { tableId, insertRow } = await import("../src/tables.ts");
      const cid = ensureCustomer(botId, "imessage", handle, "Meera");
      insertRow(tableId(botId, "Orders")!, { Item: "Darjeeling First Flush", Quantity: 3, "Customer name": "Meera", Phone: handle, Status: "new", "Placed at": new Date(Date.now() - 3 * 864e5).toISOString() }, cid);
    },
    say: ["What did I order last time?"],
    check: (c) => {
      if (!called(c, "find_rows").length) return "didn't call find_rows";
      return /darjeeling|first flush/i.test(reply(c)) ? null : `reply doesn't mention the past order: ${reply(c).slice(0, 120)}`;
    } },
  { key: "knowledge", title: "answer from the knowledge base (shipping threshold)",
    say: ["What's the minimum order for free shipping?"],
    check: (c) => /799/.test(reply(c)) ? null : `reply lacks ₹799: ${reply(c).slice(0, 120)}` },
  { key: "catalog", title: "quote a catalog price (Masala Chai)",
    say: ["how much is the masala chai?"],
    check: (c) => /250/.test(reply(c)) ? null : `reply lacks 250: ${reply(c).slice(0, 120)}` },
  { key: "remember", title: "remember a durable fact (name)",
    say: ["Just so you know, my name is Aki and I'm allergic to cardamom."],
    check: (c) => {
      const rows = all<any>(`SELECT m.key, m.value FROM memories m JOIN customers cu ON cu.id=m.customer_id WHERE cu.bot_id=? AND cu.handle=?`, [botId, c.handle]);
      return /aki/i.test(JSON.stringify(rows)) ? null : `no memory with the name: ${JSON.stringify(rows)}`;
    } },
  { key: "handoff", title: "hand off to a human when asked",
    say: ["This is wrong, I want to talk to a real person right now."],
    check: (c) => called(c, "handoff_to_human").length ? null : "didn't call handoff_to_human" },
];

// ───────── runner ─────────
const pct = (xs: number[], p: number) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]; };
interface Result { scenario: string; run: number; pass: boolean; why: string | null; turns: Turn[]; error?: string }
interface ProviderRun { provider: string; model: string; results: Result[] }

let handleSeq = 0;
async function runProvider(p: ProviderName | "offline"): Promise<ProviderRun> {
  if (p === "offline") { process.env.THREADLINE_LLM = "offline"; delete process.env.THREADLINE_PROVIDER; }
  const results: Result[] = [];
  for (const sc of SCENARIOS.filter((s) => !ONLY || ONLY.includes(s.key))) {
    for (let n = 1; n <= RUNS; n++) {
      const handle = `+1555${String(++handleSeq).padStart(7, "0")}`;
      process.env.THREADLINE_LLM = "offline"; delete process.env.THREADLINE_PROVIDER;
      if (sc.setup) await sc.setup(handle);
      if (p !== "offline") { delete process.env.THREADLINE_LLM; process.env.THREADLINE_PROVIDER = p; }
      const c: Ctx = { handle, turns: [] };
      let error: string | undefined;
      try {
        for (const text of sc.say) {
          // the confirm turn is only needed if the model hadn't already saved the order
          if (sc.key === "order" && text.startsWith("Yes") && called(c, "save_row").length) continue;
          const t0 = Date.now();
          const r = await core.chat({ botId, channel: "imessage", customerHandle: handle, text });
          c.turns.push({ text, replies: r.replies, toolCalls: r.toolCalls.map((t) => ({ name: t.name, input: t.input, ok: t.ok })), ms: Date.now() - t0, cost: r.costUsd });
        }
      } catch (e) { error = (e as Error).message.slice(0, 200); }
      const why = error ? `error: ${error}` : sc.check(c);
      results.push({ scenario: sc.key, run: n, pass: !why, why, turns: c.turns, error });
      console.log(`  ${why ? "✗" : "✓"} [${p}] ${sc.key}#${n}${why ? ` — ${why}` : ""}`);
    }
  }
  process.env.THREADLINE_LLM = "offline"; delete process.env.THREADLINE_PROVIDER;
  return { provider: p, model: p === "offline" ? "stub" : providerModel(p), results };
}

const wanted = (arg("providers")?.split(",") ?? ["anthropic", "openai", "deepseek", "kimi", "glm"]) as ProviderName[];
const skipped: { provider: string; needs: string }[] = [];
const runs: ProviderRun[] = [];
if (OFFLINE_CHECK) runs.push(await runProvider("offline"));
else for (const p of wanted) {
  if (!configured.has(p as any)) { skipped.push({ provider: p, needs: providerKeyEnvs(p).join(" or ") || "(not installed)" }); continue; }
  console.log(`\n== ${p} (${providerModel(p)}) ==`);
  runs.push(await runProvider(p));
}

// ───────── report ─────────
const pad = (s: string, n: number) => s.length >= n ? s : s + " ".repeat(n - s.length);
const keys = SCENARIOS.filter((s) => !ONLY || ONLY.includes(s.key)).map((s) => s.key);
const lines: string[] = [];
if (OFFLINE_CHECK) lines.push("(offline stub: harness self-check only — the stub is not expected to pass every scenario)");
const head = ["provider", "model", ...keys, "pass", "$ total", "$/turn", "p50 s", "p95 s"];
const rows = runs.map((r) => {
  const turns = r.results.flatMap((x) => x.turns);
  const cost = turns.reduce((n, t) => n + t.cost, 0);
  const cells = keys.map((k) => { const rs = r.results.filter((x) => x.scenario === k); const ok = rs.filter((x) => x.pass).length; return RUNS === 1 ? (ok ? "PASS" : "FAIL") : `${ok}/${rs.length}`; });
  return [r.provider, r.model, ...cells, `${r.results.filter((x) => x.pass).length}/${r.results.length}`, cost.toFixed(4),
    turns.length ? (cost / turns.length).toFixed(5) : "-", (pct(turns.map((t) => t.ms), 50) / 1000).toFixed(1), (pct(turns.map((t) => t.ms), 95) / 1000).toFixed(1)];
});
const w = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
lines.push(head.map((h, i) => pad(h, w[i])).join("  "), w.map((n) => "-".repeat(n)).join("  "), ...rows.map((r) => r.map((c, i) => pad(c, w[i])).join("  ")));
for (const r of runs) for (const x of r.results.filter((y) => !y.pass)) {
  lines.push(`  ✗ ${r.provider} / ${x.scenario}#${x.run}: ${x.why}`);
  if (args.includes("--verbose")) for (const t of x.turns) {
    lines.push(`      > ${t.text}`);
    for (const tc of t.toolCalls) lines.push(`        🔧 ${tc.name}${tc.ok ? "" : " (failed)"} ${JSON.stringify(tc.input).slice(0, 160)}`);
    for (const b of t.replies) lines.push(`      < ${b.replace(/\n/g, " ⏎ ").slice(0, 200)}`);
  }
}
for (const s of skipped) lines.push(`  - skipped ${s.provider}: set ${s.needs}`);
lines.push(`  (${RUNS} run${RUNS > 1 ? "s" : ""} per scenario; turns = chat() calls; cost from provider usage × list price in llm.ts)`);
console.log("\n" + lines.join("\n"));
if (OUT) writeFileSync(OUT, "```\n" + lines.join("\n") + "\n```\n");
process.exit(0);
