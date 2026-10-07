// Real end-to-end run with the live LLM provider (API key, or the local Claude CLI fallback).
//   node --experimental-strip-types packages/core/scripts/e2e-real.ts [--checks] [--only=sanitea|bakery|petstore]
// Writes AGENTS/core-e2e-transcript.md. Uses its own DB (THREADLINE_DB, default /tmp/tl-core-e2e.db).
import { rmSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, "../../../AGENTS/core-e2e-transcript.md");
const DB = process.env.THREADLINE_DB || "/tmp/tl-core-e2e.db";
const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith("--only="))?.slice(7);
const withChecks = args.includes("--checks");
if (!process.env.KEEP_DB) for (const s of ["", "-wal", "-shm"]) rmSync(DB + s, { force: true });
process.env.THREADLINE_DB = DB;

const { run, get, all, id } = await import("@threadline/db");
const { core, waitForRun, providerName } = await import("../src/index.ts");

const md: string[] = [];
const results: { name: string; ok: boolean; detail: string }[] = [];
const latencies: number[] = [];
const log = (s = "") => { md.push(s); console.log(s); };
const expect = (name: string, ok: boolean, detail = "") => { results.push({ name, ok, detail }); log(`> ${ok ? "✅" : "❌"} **${name}**${detail ? ` — ${detail}` : ""}`); log(); };
const flush = () => {
  mkdirSync(dirname(OUT), { recursive: true });
  const p50 = latencies.length ? [...latencies].sort((a, b) => a - b)[Math.floor(latencies.length / 2)] : 0;
  const head = [`# Core e2e transcript (real LLM)`, ``, `- Run: ${new Date().toISOString()} · provider: **${providerName()}** · DB: ${DB}`,
    `- Result: **${results.filter((r) => r.ok).length}/${results.length} expectations met**`,
    `- Chat turn latency (${providerName()}): p50 ${(p50 / 1000).toFixed(1)}s · max ${(Math.max(0, ...latencies) / 1000).toFixed(1)}s over ${latencies.length} turns`, ``];
  writeFileSync(OUT, [...head, ...md].join("\n") + "\n");
};

const userId = id("u_");
run("INSERT INTO users(id,email,name) VALUES (?,?,?)", [userId, `${userId}@e2e.dev`, "Aki"]);

async function say(botId: string, handle: string, text: string, opts: { channel?: any; isTest?: boolean } = {}) {
  const t0 = Date.now();
  const r = await core.chat({ botId, channel: opts.channel ?? "imessage", customerHandle: handle, text, isTest: opts.isTest });
  const ms = Date.now() - t0;
  latencies.push(ms);
  log(`**Customer:** ${text}`);
  for (const t of r.toolCalls) log(`  - 🔧 \`${t.name}\` ${t.ok ? "ok" : "FAILED"} · input \`${JSON.stringify(t.input).slice(0, 220)}\` → \`${JSON.stringify(t.output).slice(0, 220)}\``);
  for (const b of r.replies) log(`**Bot:** ${b.replace(/\n/g, " ⏎ ")}`);
  log(`<sub>${(ms / 1000).toFixed(1)}s · conv ${r.conversationId.slice(-6)}${r.couldntAnswer ? " · couldnt_answer" : ""}</sub>`);
  log();
  return { ...r, text: r.replies.join(" ") };
}

async function build(source: any, wizard: any[] = []) {
  const t0 = Date.now();
  const { botId, joinCode } = await core.createBot(userId, source, wizard);
  let last = "";
  await core.buildBot(botId, (p) => { if (p.label !== last) { last = p.label; console.log(`   [build ${p.pct}%] ${p.label} ${p.detail ?? ""}`); } });
  const b = get<any>("SELECT name, profile_json FROM bots WHERE id=?", [botId]);
  const prof = JSON.parse(b.profile_json);
  log(`Built **${b.name}** (join code \`${joinCode}\`) in ${((Date.now() - t0) / 1000).toFixed(0)}s · ${get<any>("SELECT COUNT(*) n FROM knowledge_docs WHERE bot_id=?", [botId]).n} docs · ${get<any>("SELECT COUNT(*) n FROM knowledge_chunks WHERE bot_id=?", [botId]).n} chunks · ${prof.catalog?.length ?? 0} catalog items · tools: ${all<any>("SELECT name FROM tools WHERE bot_id=? AND enabled=1", [botId]).map((t) => t.name).join(", ")} · tables: ${all<any>("SELECT name FROM bot_tables WHERE bot_id=?", [botId]).map((t) => t.name).join(", ") || "none"}`);
  log();
  return { botId, prof };
}

try {
  // ───────────── Sanitea (website) ─────────────
  if (!only || only === "sanitea") {
    log(`## 1. Sanitea — built from https://sanitea.vercel.app`); log();
    const { botId, prof } = await build({ kind: "website", url: "https://sanitea.vercel.app" }, [
      { question: "What are we starting from?", answer: "Existing website or app" },
      { question: "What's the website or app address?", answer: "https://sanitea.vercel.app/" },
      { question: "Who will chat with the Sanitea bot?", answer: ["My customers", "My team"] },
      { question: "What should the Sanitea bot do?", answer: ["Track orders", "Take orders", "Recommend teas", "Share brewing tips", "Manage team tasks"] },
      { question: "For taking and tracking orders, use…", answer: "Just a website" },
    ]);
    const names = (prof.catalog ?? []).map((c: any) => c.name);
    expect("Catalog extracted with prices", names.length >= 8 && prof.catalog.every((c: any) => c.price), names.join(", "));
    expect("Shipping/returns facts captured", JSON.stringify(prof.keyFacts ?? []).includes("999"), (prof.keyFacts ?? []).slice(0, 4).join(" | "));

    const A = "+14155550123";
    log(`### Conversation 1 (iMessage ${A})`); log();
    let r = await say(botId, A, "hi! what teas do you sell and how much are they?");
    expect("Product names + prices", /masala chai/i.test(r.text) && /₹\s?249|₹\s?299|₹\s?349/.test(r.text));
    r = await say(botId, A, "what can i buy for diwali gifting?");
    expect("Gifting recommendation (a real gift set with price)", /(trio gift box|chai ritual)/i.test(r.text) && /₹\s?(999|549)/.test(r.text));
    r = await say(botId, A, "how should I brew the masala chai?");
    expect("Brewing tips grounded in the site", /(boil|simmer|milk|minute)/i.test(r.text));
    r = await say(botId, A, "what are your shipping charges and can I return an opened pack?");
    expect("Shipping/returns policy correct", /999/.test(r.text) && /(79|opened|can'?t|cannot|not able|no returns)/i.test(r.text));
    r = await say(botId, A, "btw my name is Aki");
    r = await say(botId, A, "I'd like to order 2 Strong Masala Chai 100 g pouches. Ship to 12 MG Road, Bengaluru 560001, phone 9876543210.");
    if (!r.toolCalls.some((t) => t.name === "save_row" && t.ok)) r = await say(botId, A, "yes, that's right — please place it");
    const orders = all<any>("SELECT r.data_json FROM bot_table_rows r JOIN bot_tables t ON t.id=r.table_id WHERE t.bot_id=? AND t.name LIKE 'Order%'", [botId]);
    expect("Order saved into the Orders table", orders.length >= 1, orders.map((o) => o.data_json).join(" ").slice(0, 300));
    const mem = all<any>("SELECT key,value FROM memories m JOIN customers c ON c.id=m.customer_id WHERE c.bot_id=? AND c.handle=?", [botId, A]);
    expect("Customer facts remembered", mem.some((m) => /aki/i.test(m.value)), mem.map((m) => `${m.key}=${m.value}`).join(", "));
    r = await say(botId, A, "do you have a shop in Tokyo? and what's your wholesale price for 500 kg?");
    expect("Says it doesn't know for info not on the site", r.couldntAnswer || /(not sure|don'?t (know|have)|check with|team|no information|isn'?t listed|not listed|can'?t find|don'?t see)/i.test(r.text));

    // second conversation (> 6h later)
    run("UPDATE conversations SET last_message_at=datetime('now','-7 hours') WHERE bot_id=? AND customer_id=(SELECT id FROM customers WHERE bot_id=? AND handle=?)", [botId, botId, A]);
    log(`### Conversation 2 — same customer, 7 hours later (new thread)`); log();
    r = await say(botId, A, "hey it's me again, do you remember my name?");
    const convs = get<any>("SELECT COUNT(*) n FROM conversations WHERE bot_id=? AND customer_id=(SELECT id FROM customers WHERE bot_id=? AND handle=?)", [botId, botId, A]).n;
    expect("Remembers the customer's name across conversations", /aki/i.test(r.text) && convs === 2, `${convs} conversations`);
    r = await say(botId, A, "kya aapke paas koi iced tea hai?");
    expect("Mirrors Hinglish + iced tea facts", /iced/i.test(r.text) && /349|499/.test(r.text));

    if (withChecks) {
      log(`### Checks on the Sanitea bot`); log();
      const t0 = Date.now();
      const s = await core.runChecks(botId, { simulatedUsers: 12 });
      const timer = setInterval(async () => { const p = await core.getTestRun(s.runId); console.log(`   [checks] ${p.cases.filter((c) => c.passed !== null).length}/${p.total} done, ${p.passed} passed`); }, 30_000);
      await waitForRun(s.runId);
      clearInterval(timer);
      const tr = await core.getTestRun(s.runId);
      const pct = Math.round((tr.passed / tr.total) * 100);
      log(`Checks: **${tr.passed}/${tr.total} passed (${pct}%)** in ${((Date.now() - t0) / 1000).toFixed(0)}s`); log();
      log(`| Persona | Goal | Result | Judge notes |`); log(`|---|---|---|---|`);
      for (const c of tr.cases) log(`| ${c.persona} | ${c.goal.replace(/\|/g, "/").slice(0, 90)} | ${c.passed ? "✅" : "❌"} | ${(c.notes ?? "").replace(/\|/g, "/").replace(/\n/g, " ").slice(0, 220)} |`);
      log();
      for (const c of tr.cases.filter((c) => !c.passed)) {
        log(`<details><summary>❌ ${c.persona}: ${c.goal.slice(0, 80)}</summary>`); log();
        for (const t of c.transcript) log(`- **${t.role}:** ${t.text.replace(/\n/g, " ")}`);
        log(`</details>`); log();
      }
      expect("runChecks pass rate ≥ 85%", pct >= 85, `${pct}%`);
    }
    flush();
  }

  // ───────────── Bakery (idea only) ─────────────
  if (!only || only === "bakery") {
    log(`## 2. Idea-only bot — "bakery taking cake orders"`); log();
    const { botId } = await build({ kind: "idea", idea: "bakery taking cake orders" }, [
      { question: "What are we starting from?", answer: "Just an idea" },
      { question: "Describe your idea", answer: "bakery taking cake orders" },
      { question: "Who will chat with the new bot?", answer: ["My customers"] },
      { question: "What should the new bot do?", answer: ["Take cake orders", "Answer questions about cakes", "Share prices"] },
    ]);
    const B = "+14155550999";
    let r = await say(botId, B, "hi! what cakes do you make and how much?", { channel: "web", isTest: true });
    expect("Idea bot answers from its mock menu", r.toolCalls.some((t) => t.ok) || /cake/i.test(r.text));
    r = await say(botId, B, "I want a 1 kg chocolate truffle cake for Saturday, name Sam, phone 5550101. please place the order", { channel: "web", isTest: true });
    if (!r.toolCalls.some((t) => t.ok && /order|save|create|book/i.test(t.name))) r = await say(botId, B, "yes confirmed, go ahead", { channel: "web", isTest: true });
    const saved = all<any>("SELECT data_json FROM mock_records WHERE bot_id=? AND data_json LIKE '%Sam%'", [botId]).length
      + all<any>("SELECT r.id FROM bot_table_rows r JOIN bot_tables t ON t.id=r.table_id WHERE t.bot_id=? AND r.data_json LIKE '%Sam%'", [botId]).length;
    expect("Idea bot takes a cake order (mock data / Orders table)", saved >= 1, `${saved} saved record(s)`);
    flush();
  }

  // ───────────── Petstore (OpenAPI) ─────────────
  if (!only || only === "petstore") {
    log(`## 3. OpenAPI bot — Swagger Petstore (https://petstore3.swagger.io/api/v3/openapi.json)`); log();
    const { botId } = await build({ kind: "api", openapiUrl: "https://petstore3.swagger.io/api/v3/openapi.json" }, [
      { question: "What are we starting from?", answer: "Some APIs" },
      { question: "Where are your API docs?", answer: "https://petstore3.swagger.io/api/v3/openapi.json" },
      { question: "Who will chat with the new bot?", answer: ["My customers"] },
      { question: "What should the new bot do?", answer: ["Find pets", "Check orders", "Answer questions"] },
    ]);
    const n = get<any>("SELECT COUNT(*) n FROM tools WHERE bot_id=? AND kind='http'", [botId]).n;
    expect("One http tool per OpenAPI operation", n >= 15, `${n} http tools`);
    const C = "+14155550777";
    let r = await say(botId, C, "which pets are available right now?", { channel: "web", isTest: true });
    expect("Successful live API tool call", r.toolCalls.some((t) => t.ok && /status|pet/i.test(t.name) && (t.output as any)?.status === 200), r.toolCalls.map((t) => `${t.name}:${t.ok}`).join(", "));
    r = await say(botId, C, "can you look up pet id 1 for me?", { channel: "web", isTest: true });
    expect("Second API call (getPetById)", r.toolCalls.some((t) => t.ok && /byid|getpet/i.test(t.name)), r.toolCalls.map((t) => `${t.name}:${t.ok}`).join(", "));
    flush();
  }
} catch (e) {
  log(`\n**ERROR:** ${(e as Error).stack}`);
  flush();
  process.exitCode = 1;
}
flush();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} expectations met${failed.length ? "; failed: " + failed.map((f) => f.name).join("; ") : ""}`);
process.exit(failed.length ? 1 : process.exitCode ?? 0);
