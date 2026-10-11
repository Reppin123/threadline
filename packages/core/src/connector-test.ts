// Connector detection proof (agent inspect). Stands up small local HTTP servers — an OpenAPI service, plain JSON APIs
// behind each sign-in scheme, and MCP servers — and checks detectConnector() identifies protocol AND auth, then that
// addConnection() saves a validated row whose tools the bot calls for real.
// Run: node --experimental-strip-types src/connector-test.ts   (offline LLM, own temp DB)
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { rmSync } from "node:fs";
import assert from "node:assert/strict";

process.env.THREADLINE_LLM = "offline";
const DB = process.env.THREADLINE_DB || "/tmp/tl-inspect-test.db";
for (const s of ["", "-wal", "-shm"]) rmSync(DB + s, { force: true });
process.env.THREADLINE_DB = DB;

const { run, get, all, id } = await import("@threadline/db");
const { core } = await import("./index.ts");
const { detectConnector, addConnection, listConnections, removeConnection, recheckConnection, normaliseAddress } = await import("./ingest/connector-detect.ts");
const { executeTool } = await import("./tools/index.ts");
const { loadDraft } = await import("./config.ts");
const { inspectBot } = await import("./inspect.ts");

let passed = 0;
async function step(name: string, fn: () => Promise<void> | void) {
  const t0 = Date.now();
  try { await fn(); passed++; console.log(`  ✓ ${name} (${Date.now() - t0}ms)`); }
  catch (e) { console.error(`  ✗ ${name}\n`, e); process.exitCode = 1; }
}

// ───────── fixtures ─────────
type H = (req: IncomingMessage, res: ServerResponse, url: URL) => void | Promise<void>;
const servers: { close: () => void }[] = [];
async function serve(h: H): Promise<string> {
  const s = createServer(async (req, res) => { try { await h(req, res, new URL(req.url!, "http://x")); } catch (e) { res.writeHead(500); res.end(String(e)); } });
  await new Promise<void>((r) => s.listen(0, "127.0.0.1", () => r()));
  servers.push(s);
  return `http://127.0.0.1:${(s.address() as any).port}`;
}
const sendJson = (res: ServerResponse, code: number, body: unknown) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
const items = [{ id: 1, name: "Ethiopia Guji", price: "18.00" }, { id: 2, name: "Colombia Huila", price: "16.50" }];
const spec = (security?: any) => ({
  openapi: "3.0.3", info: { title: "Roastery API" }, servers: [{ url: "/v1" }],
  paths: {
    "/items": {
      get: { operationId: "listItems", summary: "List beans" },
      post: { operationId: "createItem", summary: "Add a bean", requestBody: { content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" } } } } } } },
    },
    "/items/{id}": { get: { operationId: "getItem", summary: "One bean", parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }] } },
  },
  ...(security ? { components: { securitySchemes: security } } : {}),
});
let lastAuthSeen = "";
async function body(req: IncomingMessage) { let b = ""; for await (const c of req) b += c; return b; }

// 1. OpenAPI service, open
const openapiOpen = await serve(async (req, res, u) => {
  if (u.pathname === "/openapi.json") return sendJson(res, 200, spec());
  if (u.pathname === "/v1/items" && req.method === "GET") return sendJson(res, 200, items);
  if (u.pathname === "/v1/items" && req.method === "POST") { const it = { id: items.length + 1, ...JSON.parse(await body(req) || "{}") }; items.push(it); return sendJson(res, 201, it); }
  const m = u.pathname.match(/^\/v1\/items\/(\d+)$/);
  if (m) return sendJson(res, 200, items.find((i) => i.id === Number(m[1])) ?? {});
  sendJson(res, 404, { error: "not found" });
});
// 2. plain JSON API, open
const plainOpen = await serve((req, res, u) => {
  if (u.pathname === "/") return sendJson(res, 200, { service: "plain", endpoints: ["/status", "/orders/{id}"] });
  if (u.pathname === "/status") return sendJson(res, 200, { ok: true, open: "9-5" });
  const m = u.pathname.match(/^\/orders\/(\w+)$/);
  if (m) return sendJson(res, 200, { id: m[1], status: "shipped", eta: "Tuesday" });
  sendJson(res, 404, { error: "not found" });
});
// 3-6. plain JSON API behind each sign-in scheme (the key is only accepted one way)
const gate = (ok: (req: IncomingMessage, u: URL) => boolean): H => (req, res, u) => {
  lastAuthSeen = String(req.headers.authorization ?? req.headers["x-api-key"] ?? u.searchParams.get("api_key") ?? "");
  if (!ok(req, u)) return sendJson(res, 401, { error: "unauthorised" });
  if (u.pathname === "/" || u.pathname === "/status") return sendJson(res, 200, { ok: true, secret: "only-with-key" });
  const m = u.pathname.match(/^\/orders\/(\w+)$/);
  if (m) return sendJson(res, 200, { id: m[1], status: "packed" });
  sendJson(res, 404, { error: "not found" });
};
const plainBearer = await serve(gate((r) => r.headers.authorization === "Bearer tok-123"));
const plainHeader = await serve(gate((r) => r.headers["x-api-key"] === "hk-456"));
const plainQuery = await serve(gate((_r, u) => u.searchParams.get("api_key") === "qk-789"));
const plainBasic = await serve(gate((r) => r.headers.authorization === "Basic " + Buffer.from("shop:pa55").toString("base64")));
// 7. OpenAPI service whose doc names an apiKey header, protected
const openapiKeyed = await serve((req, res, u) => {
  if (u.pathname === "/openapi.json") return sendJson(res, 200, spec({ shopKey: { type: "apiKey", in: "header", name: "X-Shop-Key" } }));
  if (req.headers["x-shop-key"] !== "sk-shop") return sendJson(res, 401, { error: "unauthorised" });
  if (u.pathname === "/v1/items") return sendJson(res, 200, items);
  sendJson(res, 404, {});
});
// 8-9. MCP servers (stateless Streamable HTTP), open and bearer-protected
const { Server: McpServer } = await import("@modelcontextprotocol/sdk/server/index.js");
const { StreamableHTTPServerTransport } = await import("@modelcontextprotocol/sdk/server/streamableHttp.js");
const { ListToolsRequestSchema, CallToolRequestSchema } = await import("@modelcontextprotocol/sdk/types.js");
const mcpHandler = (needToken?: string): H => async (req, res, u) => {
  if (u.pathname !== "/mcp") return sendJson(res, 404, {});
  if (needToken && req.headers.authorization !== `Bearer ${needToken}`) return sendJson(res, 401, { error: "unauthorised" });
  const server = new McpServer({ name: "bookings", version: "1.0.0" }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [
    { name: "list_slots", description: "List free appointment slots", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true } },
    { name: "book_slot", description: "Book a slot", inputSchema: { type: "object", properties: { slot: { type: "string" } }, required: ["slot"] } },
  ] }));
  server.setRequestHandler(CallToolRequestSchema, async (r: any) => ({ content: [{ type: "text", text: r.params.name === "list_slots" ? "10:00, 11:30, 15:00" : `Booked ${r.params.arguments?.slot}` }] }));
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on("close", () => { transport.close(); server.close(); });
  await server.connect(transport);
  const b = await body(req);
  await transport.handleRequest(req, res, b ? JSON.parse(b) : undefined);
};
const mcpOpen = await serve(mcpHandler());
const mcpBearer = await serve(mcpHandler("mcp-tok"));

console.log(`connector detection (offline LLM, db ${DB})`);

// ───────── protocol detection ─────────
await step("address normalising: bare host → https, localhost → http, trailing slash dropped", () => {
  assert.equal(normaliseAddress("api.github.com"), "https://api.github.com");
  assert.equal(normaliseAddress("localhost:4000/"), "http://localhost:4000");
  assert.equal(normaliseAddress(" https://x.dev/api/ "), "https://x.dev/api");
});

await step("OpenAPI service: found at /openapi.json, no key → auth none, validated with a harmless GET", async () => {
  const d = await detectConnector({ address: openapiOpen });
  assert.equal(d.kind, "openapi", d.kindEvidence);
  assert.equal(d.specUrl, `${openapiOpen}/openapi.json`);
  assert.equal(d.auth, "none");
  assert.ok(d.ok && d.test?.ok && d.test.url === `${openapiOpen}/v1/items`, JSON.stringify(d.test));
  assert.deepEqual(d.tools.map((t) => t.name).sort(), ["getItem", "listItems"]); // read-only: no createItem
  assert.deepEqual(d.kindAlternatives.sort(), ["mcp", "plain"]);
});

await step("OpenAPI with \"Can change things\" on → write operations included (need confirmation)", async () => {
  const d = await detectConnector({ address: openapiOpen, canWrite: true });
  assert.ok(d.tools.some((t) => t.name === "createItem" && t.write));
});

await step("plain JSON API: no MCP, no OpenAPI → plain, no key → auth none", async () => {
  const d = await detectConnector({ address: plainOpen });
  assert.equal(d.kind, "plain", d.kindEvidence);
  assert.equal(d.auth, "none");
  assert.ok(d.ok && d.test?.ok);
  assert.ok(d.test!.sample.includes("endpoints"));
  assert.equal(d.tools.length, 1);
  assert.match(d.tools[0].name, /_get$/);
});

await step("MCP server: answers the Streamable HTTP handshake → mcp, tools listed", async () => {
  const d = await detectConnector({ address: `${mcpOpen}/mcp` });
  assert.equal(d.kind, "mcp", d.kindEvidence);
  assert.equal(d.title, "bookings");
  assert.equal(d.auth, "none");
  assert.ok(d.ok);
  assert.deepEqual(d.tools.map((t) => t.name), ["list_slots"]); // book_slot needs "Can change things"
});

await step("manual Kind override wins over detection (OpenAPI service forced to Plain API)", async () => {
  const d = await detectConnector({ address: openapiOpen, kind: "plain", testPath: "/v1/items" });
  assert.equal(d.kind, "plain"); assert.ok(d.kindForced); assert.ok(d.ok);
});

// ───────── auth detection ─────────
await step("key provided on an open endpoint → guesses Bearer first (unconfirmed)", async () => {
  for (const address of [plainOpen, openapiOpen]) {
    const d = await detectConnector({ address, key: "some-key" });
    assert.equal(d.auth, "bearer", `${address}: ${d.authEvidence}`);
    assert.equal(d.authConfirmed, false);
    assert.ok(d.ok);
  }
});

await step("bearer-only API: refused without key, accepted as Bearer → confirmed", async () => {
  const d = await detectConnector({ address: plainBearer, key: "tok-123" });
  assert.equal(d.auth, "bearer"); assert.ok(d.authConfirmed, d.authEvidence); assert.ok(d.ok);
});

await step("header-key API: Bearer refused, x-api-key accepted → Key in a header", async () => {
  const d = await detectConnector({ address: plainHeader, key: "hk-456" });
  assert.equal(d.auth, "header"); assert.equal(d.authName, "x-api-key"); assert.ok(d.authConfirmed && d.ok, d.authEvidence);
});

await step("query-key API → Key in the address (?api_key=), key redacted in the test URL", async () => {
  const d = await detectConnector({ address: plainQuery, key: "qk-789" });
  assert.equal(d.auth, "query"); assert.equal(d.authName, "api_key"); assert.ok(d.ok);
  assert.ok(!JSON.stringify(d).includes("qk-789"), "key leaked into the result");
});

await step("user:password key → User and password (Basic) tried first", async () => {
  const d = await detectConnector({ address: plainBasic, key: "shop:pa55" });
  assert.equal(d.auth, "basic"); assert.ok(d.authConfirmed && d.ok);
});

await step("OpenAPI doc names an apiKey header → used directly (X-Shop-Key)", async () => {
  const d = await detectConnector({ address: openapiKeyed, key: "sk-shop" });
  assert.equal(d.kind, "openapi"); assert.equal(d.auth, "header"); assert.equal(d.authName, "X-Shop-Key"); assert.ok(d.authConfirmed && d.ok, d.authEvidence);
});

await step("bearer-protected MCP server: handshake refused without key, accepted with Bearer", async () => {
  const d = await detectConnector({ address: `${mcpBearer}/mcp`, key: "mcp-tok" });
  assert.equal(d.kind, "mcp", d.kindEvidence); assert.equal(d.auth, "bearer"); assert.ok(d.authConfirmed && d.ok, d.authEvidence);
});

await step("wrong key → not validated, clear error, nothing to save", async () => {
  const d = await detectConnector({ address: plainBearer, key: "nope" });
  assert.equal(d.ok, false); assert.match(d.error ?? "", /refused|401/);
});

await step("manual Signs-in-with override + Test-with-GET path", async () => {
  const d = await detectConnector({ address: plainHeader, key: "hk-456", auth: "header", authName: "x-api-key", testPath: "/orders/A1" });
  assert.ok(d.authForced && d.ok); assert.equal(d.test?.url, `${plainHeader}/orders/A1`); assert.ok(d.test!.sample.includes("packed"));
  const off = await detectConnector({ address: plainHeader, key: "hk-456", testPath: "https://example.com/x" });
  assert.equal(off.ok, false); assert.match(off.error ?? "", /same host/);
});

// ───────── save + call ─────────
const userId = id("u_");
run("INSERT INTO users(id,email) VALUES (?,?)", [userId, `${userId}@inspect.dev`]);
const { botId } = await core.createBot(userId, { kind: "idea", idea: "A coffee roastery helper" });
const ctx = () => { const cfg = loadDraft(botId); return { cfg, ctx: { botId, customerId: "c", conversationId: "c", channel: "web", isTest: true, config: cfg } }; };

await step("addConnection writes a validated row (key encrypted at rest) and its tools, draft marked dirty", async () => {
  const r = await addConnection(botId, { address: plainBearer, key: "tok-123", name: "Orders" });
  assert.ok(r.ok, JSON.stringify(r));
  const row = get<any>("SELECT * FROM bot_connections WHERE bot_id=?", [botId]);
  assert.equal(row.kind, "plain"); assert.equal(row.auth_kind, "bearer"); assert.ok(row.validated_at);
  assert.ok(row.key_encrypted && !row.key_encrypted.includes("tok-123"), "key stored in plaintext");
  const tools = all<any>("SELECT name, config_json FROM tools WHERE bot_id=? AND json_extract(config_json,'$.connectionId')=?", [botId, row.id]);
  assert.deepEqual(tools.map((t) => t.name), ["orders_get"]);
  assert.ok(!tools[0].config_json.includes("tok-123"), "key leaked into tools.config_json");
  assert.equal(get<any>("SELECT draft_dirty FROM bots WHERE id=?", [botId]).draft_dirty, 1);
});

await step("the bot calls the connection: auth applied at call time, path stays on the host", async () => {
  const { cfg, ctx: c } = ctx();
  const r = await executeTool(cfg.tools.find((t) => t.name === "orders_get"), "orders_get", { path: "/orders/B7" }, c);
  assert.ok(r.ok, JSON.stringify(r.output)); assert.equal((r.output as any).data.status, "packed"); assert.equal(lastAuthSeen, "Bearer tok-123");
  const esc = await executeTool(cfg.tools.find((t) => t.name === "orders_get"), "orders_get", { path: "//evil.example/x" }, c);
  assert.equal((esc.output as any).status, 404); // "//evil.example/x" is treated as a path on the connected host
});

await step("OpenAPI + MCP connections on the same bot; MCP tool call and write gating work", async () => {
  assert.ok((await addConnection(botId, { address: openapiOpen, canWrite: true })).ok);
  assert.ok((await addConnection(botId, { address: `${mcpBearer}/mcp`, key: "mcp-tok", canWrite: true })).ok);
  const { cfg, ctx: c } = ctx();
  const l = await executeTool(cfg.tools.find((t) => t.name === "listItems"), "listItems", {}, c);
  assert.ok(l.ok && JSON.stringify(l.output).includes("Guji"));
  const w = await executeTool(cfg.tools.find((t) => t.name === "createItem"), "createItem", { body: { name: "Kenya AA" } }, c);
  assert.equal((w.output as any).error, "needs_confirmation");
  const s = await executeTool(cfg.tools.find((t) => t.name === "list_slots"), "list_slots", {}, c);
  assert.ok(s.ok && JSON.stringify(s.output).includes("11:30"), JSON.stringify(s.output));
  const b = await executeTool(cfg.tools.find((t) => t.name === "book_slot"), "book_slot", { slot: "15:00", confirmed: true }, c);
  assert.ok(b.ok && JSON.stringify(b.output).includes("Booked 15:00"));
  assert.equal(listConnections(botId).length, 3);
});

await step("chat (Test) uses a connection tool end to end", async () => {
  const r = await core.chat({ botId, channel: "web", customerHandle: "owner-preview", text: "what's the status?", isTest: true });
  assert.ok(r.toolCalls.some((t) => t.ok && t.name === "orders_get"), JSON.stringify(r.toolCalls));
});

await step("inspectBot: real system prompt, connection tools labelled, keys masked", async () => {
  const d = inspectBot(botId, { channel: "imessage" });
  assert.ok(d.instructions.includes("You are texting over iMessage"));
  assert.ok(d.tools.some((t) => t.name === "orders_get" && t.kindLabel === "Connection · Orders"));
  assert.ok(d.keys.some((k) => k.key.startsWith("Orders key") && k.set));
  assert.ok(!JSON.stringify(d).includes("tok-123") && !JSON.stringify(d).includes("mcp-tok"), "secret leaked into inspect data");
});

await step("rebuild-style wipe → recheckConnection restores the tools; removeConnection cleans up", async () => {
  const cid = listConnections(botId).find((c) => c.name === "Orders")!.id;
  run("DELETE FROM tools WHERE bot_id=? AND json_extract(config_json,'$.connectionId')=?", [botId, cid]);
  const r = await recheckConnection(botId, cid);
  assert.ok(r.ok, r.error); assert.deepEqual(r.tools, ["orders_get"]);
  assert.ok(removeConnection(botId, cid));
  assert.equal(get<any>("SELECT count(*) n FROM tools WHERE bot_id=? AND json_extract(config_json,'$.connectionId')=?", [botId, cid]).n, 0);
  assert.equal(removeConnection(botId, cid), false);
});

for (const s of servers) s.close();
console.log(`\n${passed} checks passed${process.exitCode ? " (with failures)" : ""}`);
process.exit(process.exitCode ?? 0);
