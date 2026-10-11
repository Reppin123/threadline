// Offline selftest: exercises every CoreAPI function against a local fake shop, a local OpenAPI service and a
// local MCP server, with the deterministic "offline" LLM provider. Run: pnpm --filter @threadline/core test
import { createServer, type Server } from "node:http";
import { rmSync } from "node:fs";
import assert from "node:assert/strict";

process.env.THREADLINE_LLM = "offline";
const DB = process.env.THREADLINE_DB || "/tmp/tl-core-selftest.db";
for (const s of ["", "-wal", "-shm"]) rmSync(DB + s, { force: true });
process.env.THREADLINE_DB = DB;

const { run, get, all, id } = await import("@threadline/db");
const { core } = await import("./index.ts");
const { waitForRun } = await import("./checks.ts");

let passed = 0;
async function step(name: string, fn: () => Promise<void> | void) {
  const t0 = Date.now();
  try { await fn(); passed++; console.log(`  ✓ ${name} (${Date.now() - t0}ms)`); }
  catch (e) { console.error(`  ✗ ${name}\n`, e); process.exitCode = 1; throw e; }
}

// ───────── local fixtures ─────────
const pets = [{ id: 1, name: "Rex", status: "available" }, { id: 2, name: "Tom", status: "sold" }];
function shopHtml(body: string, ld = "") {
  return `<!doctype html><html><head><title>Leafy Tea Co</title><meta name="description" content="Small-batch teas from Darjeeling">${ld}</head>
  <body><nav><a href="/">Home</a><a href="/shipping">Shipping</a></nav><main>${body}</main><footer>© Leafy</footer></body></html>`;
}
const product = (name: string, price: string, slug: string) => `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "Product", name, description: `${name} — whole leaf`, offers: [{ "@type": "Offer", price, priceCurrency: "INR", url: `/products/${slug}` }] })}</script>`;

const srv: Server = createServer(async (req, res) => {
  const url = new URL(req.url!, "http://x");
  const p = url.pathname;
  const send = (code: number, body: string, type = "text/html") => { res.writeHead(code, { "content-type": type }); res.end(body); };
  if (p === "/robots.txt") return send(200, "User-agent: *\nDisallow: /admin\n", "text/plain");
  if (p === "/sitemap.xml") return send(200, `<?xml version="1.0"?><urlset><url><loc>${origin}/</loc></url><url><loc>${origin}/shipping</loc></url><url><loc>${origin}/products/darjeeling-first-flush</loc></url><url><loc>${origin}/products/masala-chai</loc></url><url><loc>${origin}/admin</loc></url></urlset>`, "application/xml");
  if (p === "/") return send(200, shopHtml(`<h1>Leafy Tea Co</h1><p>We sell small-batch Darjeeling teas and masala chai, packed fresh in Kalimpong.</p><ul><li><a href="/products/darjeeling-first-flush">Darjeeling First Flush</a></li><li><a href="/products/masala-chai">Masala Chai</a></li></ul>`));
  if (p === "/shipping") return send(200, shopHtml(`<h1>Shipping & returns</h1><p>Free shipping on orders above ₹799. Below that a flat ₹60 applies.</p><p>Opened packs cannot be returned. Damaged orders are replaced if reported within 48 hours.</p>`));
  if (p === "/products/darjeeling-first-flush") return send(200, shopHtml(`<h1>Darjeeling First Flush</h1><p>Brew at 85°C for 3 minutes. Muscatel, floral and bright.</p>`, product("Darjeeling First Flush", "450", "darjeeling-first-flush")));
  if (p === "/products/masala-chai") return send(200, shopHtml(`<h1>Masala Chai</h1><p>Boil with milk and sugar for 4 minutes. Spiced and strong.</p>`, product("Masala Chai", "250", "masala-chai")));
  if (p === "/admin") return send(200, shopHtml("<h1>SECRET ADMIN</h1>"));
  if (p === "/products.json" || p.startsWith("/wp-json")) return send(404, "not found", "text/plain");
  // OpenAPI service
  if (p === "/api/openapi.json") return send(200, JSON.stringify({
    openapi: "3.0.0", info: { title: "Pets API", description: "Find and add pets" }, servers: [{ url: "/api/v1" }],
    paths: {
      "/pets/findByStatus": { get: { operationId: "findPetsByStatus", summary: "Find pets by status", parameters: [{ name: "status", in: "query", required: true, schema: { type: "string", enum: ["available", "sold"] } }] } },
      "/pets": { post: { operationId: "addPet", summary: "Add a pet", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Pet" } } } } } },
    },
    components: { schemas: { Pet: { type: "object", properties: { name: { type: "string" }, status: { type: "string" } }, required: ["name"] } } },
  }), "application/json");
  if (p === "/api/v1/pets/findByStatus") return send(200, JSON.stringify(pets.filter((x) => x.status === url.searchParams.get("status"))), "application/json");
  if (p === "/api/v1/pets" && req.method === "POST") { let b = ""; for await (const c of req) b += c; const pet = { id: pets.length + 1, ...JSON.parse(b || "{}") }; pets.push(pet); return send(200, JSON.stringify(pet), "application/json"); }
  if (p === "/mcp") return mcpHandler(req, res);
  send(404, "nope", "text/plain");
});
await new Promise<void>((r) => srv.listen(0, "127.0.0.1", () => r()));
const origin = `http://127.0.0.1:${(srv.address() as any).port}`;

// minimal MCP server (stateless Streamable HTTP) built with the low-level SDK Server
const { Server: McpServer } = await import("@modelcontextprotocol/sdk/server/index.js");
const { StreamableHTTPServerTransport } = await import("@modelcontextprotocol/sdk/server/streamableHttp.js");
const { ListToolsRequestSchema, CallToolRequestSchema } = await import("@modelcontextprotocol/sdk/types.js");
async function mcpHandler(req: any, res: any) {
  const server = new McpServer({ name: "bookings", version: "1.0.0" }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [
    { name: "list_slots", description: "List free appointment slots", inputSchema: { type: "object", properties: { day: { type: "string" } } }, annotations: { readOnlyHint: true } },
    { name: "book_slot", description: "Book a slot", inputSchema: { type: "object", properties: { slot: { type: "string" } }, required: ["slot"] } },
  ] }));
  server.setRequestHandler(CallToolRequestSchema, async (r: any) => ({ content: [{ type: "text", text: r.params.name === "list_slots" ? "10:00, 11:30, 15:00" : `Booked ${r.params.arguments?.slot}` }] }));
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on("close", () => { transport.close(); server.close(); });
  await server.connect(transport);
  let body = ""; for await (const c of req) body += c;
  await transport.handleRequest(req, res, body ? JSON.parse(body) : undefined);
}

const userId = id("u_");
run("INSERT INTO users(id,email) VALUES (?,?)", [userId, `${userId}@selftest.dev`]);
console.log(`core selftest (offline LLM, db ${DB}, fixtures ${origin})`);

// ───────── wizard ─────────
await step("nextWizardQuestion walks start → url → who → what → orders follow-up → null", async () => {
  const answers: { question: string; answer: string | string[] }[] = [];
  const replies: Record<string, string | string[]> = {};
  let q = await core.nextWizardQuestion(answers);
  assert.equal(q?.question, "What are we starting from?");
  assert.ok(q!.chips.includes("Existing website or app"));
  const script = ["Existing website or app", `${origin}/`, ["My customers", "My team"], ["Take orders", "Recommend teas", "Manage team tasks"], "Just a website"];
  let i = 0;
  while (q && i < 8) { answers.push({ question: q.question, answer: script[i] ?? "ok" }); replies[q.question] = script[i]; i++; q = await core.nextWizardQuestion(answers); }
  assert.equal(q, null);
  assert.ok(answers.length >= 4 && answers.length <= 6, `asked ${answers.length} questions`);
  assert.ok(answers.some((a) => /for taking and tracking/i.test(a.question)));
});

// ───────── website bot ─────────
let botId = "";
const wizard = [
  { question: "What are we starting from?", answer: "Existing website or app" },
  { question: "What's the website or app address?", answer: origin },
  { question: "Who will chat with the Leafy bot?", answer: ["My customers", "My team"] },
  { question: "What should the Leafy bot do?", answer: ["Take orders", "Recommend teas", "Manage team tasks"] },
  { question: "For taking and tracking orders, use…", answer: "Just a website" },
];
await step("createBot (website) returns id/slug/joinCode, status draft", async () => {
  const r = await core.createBot(userId, { kind: "website", url: origin + "/" }, wizard);
  botId = r.botId;
  assert.match(r.joinCode, /^[a-z0-9]+-[a-z0-9]{3}$/);
  assert.equal(get<any>("SELECT status FROM bots WHERE id=?", [botId]).status, "draft");
});
await step("buildBot crawls (sitemap, robots), extracts JSON-LD catalog, chunks knowledge, makes tables/tools/v1", async () => {
  const seen: number[] = [];
  await core.buildBot(botId, (p) => seen.push(p.pct));
  const b = get<any>("SELECT status, profile_json, current_version_id, build_progress_json FROM bots WHERE id=?", [botId]);
  assert.equal(b.status, "ready");
  assert.ok(seen.includes(100) && seen.length >= 5);
  const prof = JSON.parse(b.profile_json);
  assert.deepEqual(prof.catalog.map((c: any) => c.name).sort(), ["Darjeeling First Flush", "Masala Chai"]);
  assert.equal(prof.catalog.find((c: any) => c.name === "Masala Chai").price, "₹250");
  const docs = all<any>("SELECT url FROM knowledge_docs WHERE bot_id=?", [botId]).map((d) => d.url);
  assert.ok(!docs.some((u) => u?.includes("/admin")), "robots.txt disallow respected");
  assert.ok(get<any>("SELECT COUNT(*) n FROM knowledge_chunks WHERE bot_id=?", [botId]).n >= 4);
  assert.ok(get<any>("SELECT COUNT(*) n FROM knowledge_fts WHERE bot_id=?", [botId]).n >= 4);
  const tools = all<any>("SELECT name FROM tools WHERE bot_id=?", [botId]).map((t) => t.name);
  for (const t of ["search_knowledge", "remember_fact", "recall", "save_row", "update_row", "find_rows", "schedule_message", "handoff_to_human"]) assert.ok(tools.includes(t), t);
  const tables = all<any>("SELECT name, filled_by FROM bot_tables WHERE bot_id=?", [botId]);
  assert.ok(tables.some((t) => t.name === "Orders" && t.filled_by === "bot"));
  assert.ok(tables.some((t) => t.name === "Team tasks" && t.filled_by === "owner"));
  assert.ok(get<any>("SELECT COUNT(*) n FROM test_questions WHERE bot_id=?", [botId]).n >= 3);
  assert.ok(b.current_version_id);
  assert.equal(get<any>("SELECT number, status FROM bot_versions WHERE id=?", [b.current_version_id]).status, "current");
  assert.ok(get<any>("SELECT COUNT(*) n FROM builder_messages WHERE bot_id=?", [botId]).n >= 2);
});

let convA = "";
await step("chat answers from catalog, records usage, threads the conversation", async () => {
  const r = await core.chat({ botId, channel: "imessage", customerHandle: "+15550100", text: "how much is masala chai?" });
  assert.ok(r.replies.join(" ").includes("₹250"), r.replies.join(" "));
  assert.equal(r.couldntAnswer, false);
  convA = r.conversationId;
  const r2 = await core.chat({ botId, channel: "imessage", customerHandle: "+15550100", text: "my name is Aki" });
  assert.equal(r2.conversationId, convA, "same open conversation reused");
  assert.equal(get<any>("SELECT m.value FROM memories m JOIN customers c ON c.id=m.customer_id WHERE c.bot_id=? AND c.handle=? AND m.key='name'", [botId, "+15550100"]).value, "Aki");
  assert.ok(get<any>("SELECT COUNT(*) n FROM usage WHERE bot_id=?", [botId]).n > 0);
});
await step("chat remembers the customer across conversations (>6h gap → new thread)", async () => {
  run("UPDATE conversations SET last_message_at=datetime('now','-7 hours') WHERE id=?", [convA]);
  const r = await core.chat({ botId, channel: "imessage", customerHandle: "+15550100", text: "what's my name?" });
  assert.notEqual(r.conversationId, convA);
  assert.ok(r.replies.join(" ").includes("Aki"));
});
await step("chat takes an order into the Orders table via save_row", async () => {
  const r = await core.chat({ botId, channel: "imessage", customerHandle: "+15550100", text: "yes confirm my order of 2 Masala Chai" });
  assert.ok(r.toolCalls.some((t) => t.name === "save_row" && t.ok), JSON.stringify(r.toolCalls));
  const rows = all<any>("SELECT r.data_json FROM bot_table_rows r JOIN bot_tables t ON t.id=r.table_id WHERE t.bot_id=? AND t.name='Orders'", [botId]);
  assert.equal(rows.length, 1);
  assert.equal(JSON.parse(rows[0].data_json).Status, "New");
});
await step("chat flags couldn't-answer with a topic and never invents", async () => {
  const r = await core.chat({ botId, channel: "imessage", customerHandle: "+15550101", text: "zzqx wholesale franchise kiosk?" });
  assert.equal(r.couldntAnswer, true);
  assert.ok(get<any>("SELECT COUNT(*) n FROM messages WHERE conversation_id=? AND couldnt_answer=1 AND topic IS NOT NULL", [r.conversationId]).n === 1);
});
await step("isTest chats use the draft and stay out of the inbox", async () => {
  const r = await core.chat({ botId, channel: "web", customerHandle: "owner-preview", text: "hi", isTest: true });
  assert.equal(get<any>("SELECT is_test FROM conversations WHERE id=?", [r.conversationId]).is_test, 1);
});

await step("builderChat edits the draft, persists the thread, sets draft_dirty", async () => {
  const r = await core.builderChat(botId, "Always ask about allergies first");
  assert.ok(r.changed.includes("guardrails"));
  assert.equal(r.draftDirty, true);
  assert.ok(r.suggestions.length >= 2);
  const p = JSON.parse(get<any>("SELECT profile_json FROM bots WHERE id=?", [botId]).profile_json);
  assert.ok(p.guardrails.includes("Always ask about allergies first"));
  const r2 = await core.builderChat(botId, "keep a table of leads please");
  assert.ok(r2.changed.some((c) => c.includes("Leads")));
  assert.ok(get<any>("SELECT description FROM tools WHERE bot_id=? AND name='save_row'", [botId]).description.includes("Leads"), "builtin schemas refreshed");
});

let v2 = "";
await step("deploy snapshots the draft as a new current version; idempotent when unchanged", async () => {
  const d = await core.deploy(botId);
  assert.equal(d.number, 2);
  v2 = d.versionId;
  const again = await core.deploy(botId);
  assert.equal(again.versionId, v2);
  const b = get<any>("SELECT status, current_version_id, draft_dirty FROM bots WHERE id=?", [botId]);
  assert.deepEqual([b.status, b.current_version_id, b.draft_dirty], ["live", v2, 0]);
  assert.match(get<any>("SELECT summary FROM bot_versions WHERE id=?", [v2]).summary, /guardrails|Leads/);
});
await step("live chat uses the version snapshot, not later draft edits", async () => {
  await core.builderChat(botId, "never mention competitors");
  const r = await core.chat({ botId, channel: "imessage", customerHandle: "+15550102", text: "how much is darjeeling?" });
  assert.ok(r.replies.join(" ").includes("₹450"));
  assert.equal(get<any>("SELECT draft_dirty FROM bots WHERE id=?", [botId]).draft_dirty, 1);
});
await step("rollback makes v1 current again and restores the draft", async () => {
  const v1 = get<any>("SELECT id FROM bot_versions WHERE bot_id=? AND number=1", [botId]).id;
  await core.rollback(botId, v1);
  assert.equal(get<any>("SELECT current_version_id FROM bots WHERE id=?", [botId]).current_version_id, v1);
  assert.equal(get<any>("SELECT status FROM bot_versions WHERE id=?", [v2]).status, "previous");
  assert.ok(!get<any>("SELECT 1 x FROM bot_tables WHERE bot_id=? AND name='Leads'", [botId]));
});

await step("composeOutbound writes a message into the customer's conversation", async () => {
  const r = await core.composeOutbound(botId, "imessage", "+15550100", "Tell them order 1042 is ready for pickup");
  assert.ok(r.text.length > 0 && r.conversationId);
  assert.ok(get<any>("SELECT 1 x FROM messages WHERE conversation_id=? AND content=?", [r.conversationId, r.text]));
});

await step("runChecks runs async; getTestRun reports progress and per-case transcripts", async () => {
  const s = await core.runChecks(botId, { simulatedUsers: 3 });
  assert.equal(s.status, "running");
  assert.ok(s.total >= 3 + 1);
  await waitForRun(s.runId);
  const r = await core.getTestRun(s.runId);
  assert.equal(r.status, "done");
  assert.equal(r.cases.length, r.total);
  assert.ok(r.cases.every((c) => c.passed !== null && c.transcript.length > 0));
  assert.ok(r.passed > 0);
  assert.ok(get<any>("SELECT COUNT(*) n FROM usage WHERE bot_id=? AND category='tests'", [botId]).n > 0);
});

await step("getInsights returns the exact Insights shape from real rows", async () => {
  const i = await core.getInsights(botId);
  assert.ok(i.chatsThisWeek >= 3);
  assert.ok(i.customersThisWeek >= 2);
  assert.equal(i.chatsPerDay.length, 14);
  assert.ok((i.chatsPerDay.at(-1)!.byChannel.imessage ?? 0) >= 1);
  assert.ok(i.answeredOnOwnPct !== null && i.answeredOnOwnPct < 100);
  assert.ok(i.couldntAnswerTopics.length >= 1);
  for (const k of ["answering", "build", "media", "tests", "total"]) assert.equal(typeof (i.spendThisMonth as any)[k], "number");
  assert.ok(Array.isArray(i.topIntents) && Array.isArray(i.needsAttention));
});

// ───────── idea bot (mock data + mock tools) ─────────
await step("idea bot: build creates mock collections + mock tools that work in chat", async () => {
  const { botId: b } = await core.createBot(userId, { kind: "idea", idea: "bakery taking cake orders" });
  await core.buildBot(b);
  const tools = all<any>("SELECT name, kind FROM tools WHERE bot_id=? AND kind='mock'", [b]);
  assert.ok(tools.length >= 2);
  assert.ok(get<any>("SELECT COUNT(*) n FROM mock_records WHERE bot_id=?", [b]).n >= 1);
  const r = await core.chat({ botId: b, channel: "web", customerHandle: "owner-preview", text: "show me what's available", isTest: true });
  assert.ok(r.toolCalls.some((t) => t.ok && tools.some((x) => x.name === t.name)), JSON.stringify(r.toolCalls));
});

// ───────── OpenAPI bot ─────────
await step("api bot: OpenAPI → http tools (GET live call, POST needs confirmation)", async () => {
  const { botId: b } = await core.createBot(userId, { kind: "api", openapiUrl: `${origin}/api/openapi.json` });
  await core.buildBot(b);
  const t = all<any>("SELECT name, requires_confirmation, config_json FROM tools WHERE bot_id=? AND kind='http'", [b]);
  assert.deepEqual(t.map((x) => x.name).sort(), ["addPet", "findPetsByStatus"]);
  assert.equal(t.find((x) => x.name === "addPet").requires_confirmation, 1);
  assert.equal(JSON.parse(t[0].config_json).baseUrl, `${origin}/api/v1`);
  const { executeTool } = await import("./tools/index.ts");
  const { loadDraft } = await import("./config.ts");
  const cfg = loadDraft(b);
  const ctx = { botId: b, customerId: "x", conversationId: "x", channel: "web", isTest: true, config: cfg };
  const g = await executeTool(cfg.tools.find((x) => x.name === "findPetsByStatus"), "findPetsByStatus", { status: "available" }, ctx);
  assert.ok(g.ok && JSON.stringify(g.output).includes("Rex"));
  const p1 = await executeTool(cfg.tools.find((x) => x.name === "addPet"), "addPet", { body: { name: "Bo" } }, ctx);
  assert.equal((p1.output as any).error, "needs_confirmation");
  const p2 = await executeTool(cfg.tools.find((x) => x.name === "addPet"), "addPet", { body: { name: "Bo" }, confirmed: true }, ctx);
  assert.ok(p2.ok && pets.some((p) => p.name === "Bo"));
  const s = await core.runChecks(b, { simulatedUsers: 0 });
  await waitForRun(s.runId);
  const tr = await core.getTestRun(s.runId);
  assert.ok(tr.cases.filter((c) => c.persona === "Tool check").every((c) => c.passed), JSON.stringify(tr.cases));
});

// ───────── MCP bot ─────────
await step("mcp bot: lists tools over Streamable HTTP and calls them", async () => {
  const { botId: b } = await core.createBot(userId, { kind: "mcp", url: `${origin}/mcp` });
  await core.buildBot(b);
  const t = all<any>("SELECT name, requires_confirmation FROM tools WHERE bot_id=? AND kind='mcp' ORDER BY name", [b]);
  assert.deepEqual(t.map((x) => [x.name, x.requires_confirmation]), [["book_slot", 1], ["list_slots", 0]]);
  const { executeTool } = await import("./tools/index.ts");
  const { loadDraft } = await import("./config.ts");
  const cfg = loadDraft(b);
  const r = await executeTool(cfg.tools.find((x) => x.name === "list_slots"), "list_slots", {}, { botId: b, customerId: "x", conversationId: "x", channel: "web", isTest: true, config: cfg });
  assert.ok(r.ok && JSON.stringify(r.output).includes("11:30"), JSON.stringify(r.output));
});

// ───────── connector detection (agent inspect; full matrix: src/connector-test.ts) ─────────
await step("connector-detect: OpenAPI vs plain vs MCP, no key → none, key → bearer first; saved connection is callable", async () => {
  const { detectConnector, addConnection } = await import("./ingest/connector-detect.ts");
  const oa = await detectConnector({ address: `${origin}/api` });
  assert.equal(oa.kind, "openapi"); assert.equal(oa.specUrl, `${origin}/api/openapi.json`); assert.equal(oa.auth, "none");
  const plain = await detectConnector({ address: `${origin}/shipping` });
  assert.equal(plain.kind, "plain"); assert.equal(plain.auth, "none"); assert.ok(plain.ok, plain.error);
  const keyed = await detectConnector({ address: `${origin}/shipping`, key: "k-1" });
  assert.equal(keyed.auth, "bearer"); assert.equal(keyed.authConfirmed, false);
  const m = await detectConnector({ address: `${origin}/mcp` });
  assert.equal(m.kind, "mcp"); assert.ok(m.ok);
  const { botId: b } = await core.createBot(userId, { kind: "idea", idea: "connector selftest" });
  const r = await addConnection(b, { address: `${origin}/mcp`, name: "Bookings" });
  assert.ok(r.ok, JSON.stringify(r));
  const { executeTool } = await import("./tools/index.ts");
  const { loadDraft } = await import("./config.ts");
  const cfg = loadDraft(b);
  const out = await executeTool(cfg.tools.find((x) => x.name === "list_slots"), "list_slots", {}, { botId: b, customerId: "x", conversationId: "x", channel: "web", isTest: true, config: cfg });
  assert.ok(out.ok && JSON.stringify(out.output).includes("11:30"), JSON.stringify(out.output));
});

srv.close();
console.log(`\n${passed} checks passed${process.exitCode ? " (with failures)" : ""}`);
process.exit(process.exitCode ?? 0);
