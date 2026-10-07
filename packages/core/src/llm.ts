// One LLM interface for every caller. Providers in order:
// ANTHROPIC_API_KEY → OPENAI_API_KEY → local Claude CLI (dev) → "offline" deterministic stub (THREADLINE_LLM=offline).
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { recordUsage, type UsageCategory } from "./usage.ts";

export interface ToolDef { name: string; description: string; input_schema: any }
export interface ToolCall { id: string; name: string; input: any }
export type LlmMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: ToolCall[]; raw?: unknown }
  | { role: "tool"; toolCallId: string; name: string; content: string; isError?: boolean };

export interface CompleteOpts {
  system: string;
  messages: LlmMessage[];
  tools?: ToolDef[];
  json?: boolean;               // caller expects a JSON object in text
  maxTokens?: number;
  tier?: "smart" | "fast";      // fast = cheaper/faster model for side tasks
  category?: UsageCategory;     // usage bucket (default answering)
  botId?: string | null;
  // Deterministic answer for the offline provider (unit tests). Receives the same opts.
  offline?: (o: CompleteOpts) => { text?: string; toolCalls?: Omit<ToolCall, "id">[] };
  timeoutMs?: number;
}
export interface CompleteResult {
  text: string;
  toolCalls: ToolCall[];
  usage: { inputTokens: number; outputTokens: number; costUsd: number };
  provider: string;
  raw?: unknown;                // provider-native assistant content (to replay in tool loops)
  ms: number;
}

export type ProviderName = "anthropic" | "openai" | "cli" | "offline";

export function providerName(): ProviderName {
  const forced = process.env.THREADLINE_LLM as ProviderName | undefined;
  if (forced && ["anthropic", "openai", "cli", "offline"].includes(forced)) return forced;
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (existsSync(cliPath())) return "cli";
  return "offline";
}

/** Does the active provider support native tool calling (vs. our JSON protocol)? */
export function hasNativeTools() { const p = providerName(); return p === "anthropic" || p === "openai"; }

// $ per 1M tokens [input, output]
const PRICES: Record<string, [number, number]> = {
  "claude-sonnet-5-5": [2, 10], "claude-sonnet-5": [2, 10], "claude-sonnet-4-6": [3, 15], "claude-sonnet-4-5": [3, 15],
  "claude-haiku-5-5": [0.1, 0.5], "claude-haiku-4-5": [1, 5], "claude-opus-5-5": [4, 20],
  "gpt-4.1": [2, 8], "gpt-4.1-mini": [0.4, 1.6], "gpt-4o-mini": [0.15, 0.6],
};
function priceFor(model: string, i: number, o: number) {
  const p = PRICES[model] ?? [3, 15];
  return (i * p[0] + o * p[1]) / 1e6;
}

export async function complete(opts: CompleteOpts): Promise<CompleteResult> {
  const t0 = Date.now();
  const p = providerName();
  let r: Omit<CompleteResult, "ms" | "provider">;
  if (p === "anthropic") r = await withRetry(() => anthropicComplete(opts));
  else if (p === "openai") r = await withRetry(() => openaiComplete(opts));
  else if (p === "cli") r = await withRetry(() => cliComplete(opts), 2);
  else r = offlineComplete(opts);
  const res: CompleteResult = { ...r, provider: p, ms: Date.now() - t0 };
  try { recordUsage(opts.botId ?? null, opts.category ?? "answering", res.usage); } catch { /* usage is best-effort */ }
  return res;
}

async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) { last = e; await new Promise((r) => setTimeout(r, 800 * (i + 1))); }
  }
  throw last;
}

/** Ask for a JSON object; parse leniently. Falls back to `fallback` when parsing fails. */
export async function completeJson<T>(opts: Omit<CompleteOpts, "json">, fallback: T): Promise<{ data: T; result: CompleteResult }> {
  const result = await complete({ ...opts, json: true });
  const data = parseJsonLoose<T>(result.text);
  return { data: data ?? fallback, result };
}

export function parseJsonLoose<T = any>(text: string): T | null {
  if (!text) return null;
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  try { return JSON.parse(s) as T; } catch { /* continue */ }
  // find the first balanced {...} or [...]
  for (const open of ["{", "["]) {
    const close = open === "{" ? "}" : "]";
    const start = s.indexOf(open);
    if (start < 0) continue;
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < s.length; i++) {
      const c = s[i];
      if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
      if (c === '"') inStr = true;
      else if (c === open) depth++;
      else if (c === close) { depth--; if (depth === 0) { try { return JSON.parse(s.slice(start, i + 1)) as T; } catch { break; } } }
    }
  }
  return null;
}

// ───────────────────────── Anthropic (official SDK, native tools) ─────────────────────────
let _anthropic: any = null;
async function anthropicClient() {
  if (_anthropic) return _anthropic;
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  _anthropic = new Anthropic();
  return _anthropic;
}
function anthropicModel(tier: "smart" | "fast" = "smart") {
  return tier === "fast" ? (process.env.THREADLINE_FAST_MODEL || "claude-haiku-5-5") : (process.env.THREADLINE_MODEL || "claude-sonnet-5-5");
}
async function anthropicComplete(o: CompleteOpts) {
  const client = await anthropicClient();
  const model = anthropicModel(o.tier);
  const messages: any[] = [];
  for (const m of o.messages) {
    if (m.role === "user") messages.push({ role: "user", content: m.content });
    else if (m.role === "assistant") {
      if (m.raw) messages.push({ role: "assistant", content: m.raw });
      else {
        const blocks: any[] = [];
        if (m.content) blocks.push({ type: "text", text: m.content });
        for (const t of m.toolCalls ?? []) blocks.push({ type: "tool_use", id: t.id, name: t.name, input: t.input ?? {} });
        messages.push({ role: "assistant", content: blocks.length ? blocks : "(no reply)" });
      }
    } else {
      const block = { type: "tool_result", tool_use_id: m.toolCallId, content: m.content, is_error: !!m.isError };
      const last = messages[messages.length - 1];
      if (last && last.role === "user" && Array.isArray(last.content) && last.content.every((b: any) => b.type === "tool_result")) last.content.push(block);
      else messages.push({ role: "user", content: [block] });
    }
  }
  const req: any = {
    model, max_tokens: o.maxTokens ?? 4000, system: o.system, messages,
    output_config: { effort: process.env.THREADLINE_EFFORT || "low" },
  };
  if (o.tools?.length) req.tools = o.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema }));
  const res = await client.messages.create(req, { timeout: o.timeoutMs ?? 90_000 });
  let text = "";
  const toolCalls: ToolCall[] = [];
  for (const b of res.content) {
    if (b.type === "text") text += b.text;
    else if (b.type === "tool_use") toolCalls.push({ id: b.id, name: b.name, input: b.input });
  }
  const i = res.usage?.input_tokens ?? 0, out = res.usage?.output_tokens ?? 0;
  return { text, toolCalls, raw: res.content, usage: { inputTokens: i, outputTokens: out, costUsd: priceFor(model, i, out) } };
}

// ───────────────────────── OpenAI (Chat Completions, native tools) ─────────────────────────
async function openaiComplete(o: CompleteOpts) {
  const model = o.tier === "fast" ? (process.env.THREADLINE_OPENAI_FAST_MODEL || "gpt-4.1-mini") : (process.env.THREADLINE_OPENAI_MODEL || "gpt-4.1");
  const messages: any[] = [{ role: "system", content: o.system }];
  for (const m of o.messages) {
    if (m.role === "user") messages.push({ role: "user", content: m.content });
    else if (m.role === "assistant") messages.push({
      role: "assistant", content: m.content || null,
      ...(m.toolCalls?.length ? { tool_calls: m.toolCalls.map((t) => ({ id: t.id, type: "function", function: { name: t.name, arguments: JSON.stringify(t.input ?? {}) } })) } : {}),
    });
    else messages.push({ role: "tool", tool_call_id: m.toolCallId, content: m.content });
  }
  const body: any = { model, messages, max_tokens: o.maxTokens ?? 4000 };
  if (o.tools?.length) body.tools = o.tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.input_schema } }));
  if (o.json && !o.tools?.length) body.response_format = { type: "json_object" };
  const ctl = AbortSignal.timeout(o.timeoutMs ?? 90_000);
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST", signal: ctl,
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`openai ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j: any = await r.json();
  const msg = j.choices?.[0]?.message ?? {};
  const toolCalls: ToolCall[] = (msg.tool_calls ?? []).map((t: any) => ({ id: t.id, name: t.function.name, input: safeParse(t.function.arguments) }));
  const i = j.usage?.prompt_tokens ?? 0, out = j.usage?.completion_tokens ?? 0;
  return { text: msg.content ?? "", toolCalls, usage: { inputTokens: i, outputTokens: out, costUsd: priceFor(model, i, out) } };
}
function safeParse(s: string) { try { return JSON.parse(s); } catch { return {}; } }

// ───────────────────────── Local Claude CLI (dev fallback, JSON tool protocol) ─────────────────────────
export function cliPath() { return process.env.THREADLINE_CLAUDE_CLI || join(homedir(), ".local/bin/claude"); }
const CLI_MAX = Number(process.env.THREADLINE_CLI_CONCURRENCY || 4);
let cliActive = 0;
const cliQueue: (() => void)[] = [];
async function cliSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (cliActive >= CLI_MAX) await new Promise<void>((r) => cliQueue.push(r));
  cliActive++;
  try { return await fn(); } finally { cliActive--; cliQueue.shift()?.(); }
}

function renderTranscript(messages: LlmMessage[]) {
  return messages.map((m) => {
    if (m.role === "user") return `<user>\n${m.content}\n</user>`;
    if (m.role === "assistant") {
      const calls = m.toolCalls?.length ? `\n<tool_calls>${JSON.stringify(m.toolCalls.map((t) => ({ id: t.id, name: t.name, input: t.input })))}</tool_calls>` : "";
      return `<assistant>\n${m.content}${calls}\n</assistant>`;
    }
    return `<tool_result id="${m.toolCallId}" name="${m.name}"${m.isError ? ' error="true"' : ""}>\n${m.content}\n</tool_result>`;
  }).join("\n\n");
}

async function cliComplete(o: CompleteOpts) {
  const tools = o.tools ?? [];
  let system = o.system;
  if (tools.length) {
    system += `\n\n# Tools\nYou can call these tools (JSON schema inputs):\n${tools.map((t) => `- ${t.name}: ${t.description}\n  input_schema: ${JSON.stringify(t.input_schema)}`).join("\n")}\n
# Tool-calling protocol (STRICT)
You cannot call tools natively. To call tools, your ENTIRE output must be exactly one JSON object and nothing else:
{"tool_calls":[{"name":"<tool name>","input":{...}}]}
You may include several calls in the array. Tool results will be given back to you in <tool_result> blocks, then you continue.
When you do NOT need a tool, output your final answer in the format requested above (no "tool_calls" key).`;
  }
  const prompt = `${renderTranscript(o.messages)}\n\nNow write the next assistant output.${o.json || tools.length ? " Output ONLY the JSON object — no prose, no code fences." : ""}`;
  const model = o.tier === "fast" ? (process.env.THREADLINE_CLI_FAST_MODEL || "haiku") : (process.env.THREADLINE_CLI_MODEL || "sonnet");
  const out = await cliSlot(() => runCli(model, system, prompt, o.timeoutMs ?? 180_000));
  let j: any;
  try { j = JSON.parse(out); } catch { throw new Error("claude cli: bad output " + out.slice(0, 200)); }
  if (j.is_error) throw new Error("claude cli error: " + String(j.result).slice(0, 200));
  const text: string = j.result ?? "";
  const u = j.usage ?? {};
  const usage = {
    inputTokens: (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0),
    outputTokens: u.output_tokens ?? 0, costUsd: Number(j.total_cost_usd ?? 0),
  };
  let toolCalls: ToolCall[] = [];
  let finalText = text;
  if (tools.length) {
    const parsed = parseJsonLoose<any>(text);
    if (parsed && Array.isArray(parsed.tool_calls) && parsed.tool_calls.length) {
      const names = new Set(tools.map((t) => t.name));
      toolCalls = parsed.tool_calls.filter((c: any) => c && names.has(c.name))
        .map((c: any, i: number) => ({ id: `call_${Date.now().toString(36)}_${i}`, name: c.name, input: c.input ?? {} }));
      if (toolCalls.length) finalText = "";
    }
  }
  return { text: finalText, toolCalls, usage };
}

function runCli(model: string, system: string, prompt: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ["-p", "--model", model, "--output-format", "json", "--system-prompt", system, "--tools", "",
      "--strict-mcp-config", "--setting-sources", "", "--no-session-persistence", "--disable-slash-commands"];
    // Run from a neutral dir so no project CLAUDE.md leaks in.
    const env = { ...process.env, PATH: `/opt/homebrew/bin:${join(homedir(), ".local/bin")}:${process.env.PATH ?? ""}` };
    const child = spawn(cliPath(), args, { cwd: tmpdir(), env, stdio: ["pipe", "pipe", "pipe"] });
    let out = "", err = "";
    const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("claude cli timeout")); }, timeoutMs);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 && !out) reject(new Error(`claude cli exit ${code}: ${err.slice(0, 300)}`));
      else resolve(out.trim());
    });
    child.stdin.end(prompt);
  });
}

// ───────────────────────── Offline deterministic provider (tests) ─────────────────────────
function offlineComplete(o: CompleteOpts) {
  const r = o.offline?.(o) ?? { text: o.json ? "{}" : "OK" };
  const text = r.text ?? "";
  const toolCalls = (r.toolCalls ?? []).map((t, i) => ({ id: `off_${i}_${Math.random().toString(36).slice(2, 7)}`, name: t.name, input: t.input }));
  const inTok = Math.ceil((o.system.length + o.messages.reduce((n, m) => n + m.content.length, 0)) / 4);
  const outTok = Math.ceil(text.length / 4);
  return { text, toolCalls, usage: { inputTokens: inTok, outputTokens: outTok, costUsd: 0 } };
}

/** Last user text in a message list (helper for offline handlers). */
export function lastUserText(messages: LlmMessage[]) {
  for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === "user") return messages[i].content;
  return "";
}
