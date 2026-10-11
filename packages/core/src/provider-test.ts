// Provider-abstraction test (agent "models"): selection env vars, per-provider model/key resolution and the
// OpenAI-compatible adapter's wire format (deepseek/kimi/glm/openai) against a local mock server. No real keys needed.
// Run: pnpm --filter @threadline/core test:providers
import { createServer } from "node:http";
import assert from "node:assert/strict";

delete process.env.THREADLINE_LLM;
for (const k of ["THREADLINE_PROVIDER", "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DEEPSEEK_API_KEY", "KIMI_API_KEY", "MOONSHOT_API_KEY", "GLM_API_KEY", "ZHIPU_API_KEY"]) delete process.env[k];
process.env.THREADLINE_DB = process.env.THREADLINE_DB || "/tmp/tl-models-provider-test.db";

const L = await import("./llm.ts");
let passed = 0;
const step = async (name: string, fn: () => Promise<void> | void) => { try { await fn(); passed++; console.log(`  ✓ ${name}`); } catch (e) { console.error(`  ✗ ${name}\n`, e); process.exitCode = 1; } };

// mock OpenAI-shape server: first call → tool call, call after a tool message → final text
const seen: { path: string; auth: string; body: any }[] = [];
const srv = createServer(async (req, res) => {
  let b = ""; for await (const c of req) b += c;
  const body = JSON.parse(b);
  seen.push({ path: req.url!, auth: String(req.headers.authorization), body });
  const afterTool = body.messages.some((m: any) => m.role === "tool");
  const message = afterTool ? { role: "assistant", content: "Booked it." }
    : { role: "assistant", content: null, tool_calls: [{ id: "call_1", type: "function", function: { name: "save_row", arguments: '{"table":"Orders","data":{"item":"chai"}}' } }] };
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ choices: [{ message }], usage: { prompt_tokens: 1000, completion_tokens: 500 } }));
});
await new Promise<void>((r) => srv.listen(0, "127.0.0.1", () => r()));
const base = `http://127.0.0.1:${(srv.address() as any).port}/v1`;
const tools = [{ name: "save_row", description: "save", input_schema: { type: "object", properties: { table: { type: "string" }, data: { type: "object" } } } }];

await step("THREADLINE_PROVIDER picks the provider; unset keeps the key-based default; offline LLM always wins", () => {
  process.env.THREADLINE_PROVIDER = "deepseek";
  assert.equal(L.providerName(), "deepseek");
  assert.equal(L.hasNativeTools(), true);
  process.env.THREADLINE_PROVIDER = "kimi"; assert.equal(L.providerName(), "kimi");
  process.env.THREADLINE_PROVIDER = "glm"; assert.equal(L.providerName(), "glm");
  delete process.env.THREADLINE_PROVIDER;
  const dflt = L.providerName();   // key-based default (anthropic via env/Keychain, else openai/cli/offline)
  assert.ok(["anthropic", "openai", "cli", "offline"].includes(dflt), dflt);
  process.env.THREADLINE_PROVIDER = "bogus";
  assert.equal(L.providerName(), dflt, "unknown value falls through to key-based detection");
  delete process.env.THREADLINE_PROVIDER;
  process.env.THREADLINE_PROVIDER = "glm"; process.env.THREADLINE_LLM = "offline";
  assert.equal(L.providerName(), "offline");
  delete process.env.THREADLINE_LLM; delete process.env.THREADLINE_PROVIDER;
});
await step("keys: DEEPSEEK_API_KEY / KIMI_API_KEY|MOONSHOT_API_KEY / GLM_API_KEY|ZHIPU_API_KEY, reported by name when missing", () => {
  assert.deepEqual(L.providerKeyEnvs("deepseek"), ["DEEPSEEK_API_KEY"]);
  assert.deepEqual(L.providerKeyEnvs("kimi"), ["KIMI_API_KEY", "MOONSHOT_API_KEY"]);
  assert.deepEqual(L.providerKeyEnvs("glm"), ["GLM_API_KEY", "ZHIPU_API_KEY"]);
  assert.equal(L.providerConfigured("kimi"), false);
  process.env.MOONSHOT_API_KEY = "x"; assert.equal(L.providerConfigured("kimi"), true); delete process.env.MOONSHOT_API_KEY;
  process.env.ZHIPU_API_KEY = "x"; assert.equal(L.providerConfigured("glm"), true); delete process.env.ZHIPU_API_KEY;
});
await step("a missing key fails with the exact env var name and no key material", async () => {
  await assert.rejects(L.complete({ system: "s", messages: [{ role: "user", content: "hi" }], provider: "deepseek" }), /DEEPSEEK_API_KEY/);
});
await step("model env overrides: THREADLINE_<PROVIDER>_MODEL / _FAST_MODEL by tier", () => {
  assert.equal(L.providerModel("deepseek", "smart"), "deepseek-chat");
  process.env.THREADLINE_KIMI_MODEL = "kimi-k2-turbo-preview"; process.env.THREADLINE_KIMI_FAST_MODEL = "moonshot-v1-8k";
  assert.equal(L.providerModel("kimi", "smart"), "kimi-k2-turbo-preview");
  assert.equal(L.providerModel("kimi", "fast"), "moonshot-v1-8k");
  delete process.env.THREADLINE_KIMI_MODEL; delete process.env.THREADLINE_KIMI_FAST_MODEL;
  assert.equal(L.providerModel("glm", "fast"), "glm-4.5-air");
});
for (const [p, keyEnv, model, prices] of [["deepseek", "DEEPSEEK_API_KEY", "deepseek-chat", [0.28, 0.42]], ["kimi", "KIMI_API_KEY", "kimi-k2-0905-preview", [0.6, 2.5]], ["glm", "GLM_API_KEY", "glm-4.6", [0.6, 2.2]]] as const) {
  await step(`${p}: tool-calling round trip over the OpenAI chat-completions shape (auth, tools, tool result replay, cost)`, async () => {
    process.env[keyEnv] = "test-key-" + p;
    process.env[`THREADLINE_${p.toUpperCase()}_BASE_URL`] = base;
    seen.length = 0;
    const r1 = await L.complete({ system: "sys", messages: [{ role: "user", content: "order chai" }], tools, provider: p });
    assert.equal(r1.provider, p);
    assert.equal(r1.toolCalls.length, 1);
    assert.deepEqual(r1.toolCalls[0].input, { table: "Orders", data: { item: "chai" } });
    assert.equal(seen[0].path, "/v1/chat/completions");
    assert.equal(seen[0].auth, `Bearer test-key-${p}`);
    assert.equal(seen[0].body.model, model);
    assert.equal(seen[0].body.tools[0].function.name, "save_row");
    assert.equal(seen[0].body.messages[0].role, "system");
    assert.equal(p === "glm" ? seen[0].body.thinking?.type : undefined, p === "glm" ? "disabled" : undefined);
    assert.ok(Math.abs(r1.usage.costUsd - (1000 * prices[0] + 500 * prices[1]) / 1e6) < 1e-12, String(r1.usage.costUsd));
    const r2 = await L.complete({ system: "sys", provider: p, tools, messages: [
      { role: "user", content: "order chai" },
      { role: "assistant", content: "", toolCalls: r1.toolCalls },
      { role: "tool", toolCallId: r1.toolCalls[0].id, name: "save_row", content: '{"ok":true}' },
    ] });
    assert.equal(r2.text, "Booked it.");
    const sent = seen[1].body.messages;
    assert.equal(sent[2].tool_calls[0].function.name, "save_row");
    assert.equal(typeof sent[2].tool_calls[0].function.arguments, "string");
    assert.deepEqual([sent[3].role, sent[3].tool_call_id], ["tool", "call_1"]);
    delete process.env[keyEnv]; delete process.env[`THREADLINE_${p.toUpperCase()}_BASE_URL`];
  });
}
await step("the default (THREADLINE_PROVIDER unset) never resolves to a third-party provider", () => {
  assert.ok(["anthropic", "openai", "cli", "offline"].includes(L.providerName()));
});

srv.close();
console.log(`${passed} provider checks passed`);
process.exit(process.exitCode ?? 0);
