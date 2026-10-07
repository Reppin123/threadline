// Public entry of @threadline/core. Agent "core" REPLACES the stub implementations below with real ones
// (in separate modules), keeping the export `core: CoreAPI` and the re-exported types.
// Until then these stubs let web + gateway run end-to-end against the real DB.
import { run, get, id, json, logEvent } from "@threadline/db";
import type { CoreAPI, BotSource, WizardAnswer, ChatInput, ChatResult } from "./contract.ts";
export * from "./contract.ts";

function slugify(s: string) {
  return s.toLowerCase().replace(/https?:\/\//, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "bot";
}

function ensureCustomer(botId: string, channel: string, handle: string) {
  let c = get<{ id: string }>("SELECT id FROM customers WHERE bot_id=? AND channel=? AND handle=?", [botId, channel, handle]);
  if (!c) { c = { id: id("cu_") }; run("INSERT INTO customers(id,bot_id,channel,handle) VALUES (?,?,?,?)", [c.id, botId, channel, handle]); }
  return c.id;
}

export const core: CoreAPI = {
  async nextWizardQuestion(answers: WizardAnswer[]) {
    if (answers.length === 0) return { question: "What are we starting from?", chips: ["Just an idea", "Existing website or app", "An MCP server", "Some APIs"], multi: false };
    return null;
  },
  async createBot(userId: string, source: BotSource, wizard?: WizardAnswer[]) {
    const base = source.kind === "website" ? new URL(source.url).hostname.split(".")[0] : source.kind === "idea" ? source.idea.split(" ").slice(0, 3).join(" ") : source.kind;
    const botId = id("bot_");
    const slug = slugify(base) + "-" + botId.slice(-4).toLowerCase();
    const joinCode = slugify(base).split("-")[0].slice(0, 10) + "-" + Math.random().toString(36).slice(2, 5);
    run("INSERT INTO bots(id,user_id,name,slug,join_code,source_kind,source_json,wizard_json) VALUES (?,?,?,?,?,?,?,?)",
      [botId, userId, base.charAt(0).toUpperCase() + base.slice(1) + " Assistant", slug, joinCode, source.kind, json.str(source), json.str(wizard ?? [])]);
    return { botId, slug, joinCode };
  },
  async buildBot(botId, onProgress) {
    const p = { step: "done" as const, label: "Ready (stub build)", pct: 100 };
    run("UPDATE bots SET status='ready', build_progress_json=?, profile_json=COALESCE(profile_json, ?) WHERE id=?", [json.str(p), json.str({ name: "Stub", greeting: "Hi! (stub)" }), botId]);
    onProgress?.(p);
  },
  async builderChat(botId, message) {
    return { reply: `(stub builder) noted: ${message}`, suggestions: [], changed: [], draftDirty: false };
  },
  async chat(input: ChatInput): Promise<ChatResult> {
    const customerId = ensureCustomer(input.botId, input.channel, input.customerHandle);
    const convId = id("cv_");
    run("INSERT INTO conversations(id,bot_id,customer_id,channel,is_test) VALUES (?,?,?,?,?)", [convId, input.botId, customerId, input.channel, input.isTest ? 1 : 0]);
    const reply = `(stub) you said: ${input.text}`;
    run("INSERT INTO messages(id,conversation_id,role,content) VALUES (?,?,?,?)", [id("m_"), convId, "user", input.text]);
    run("INSERT INTO messages(id,conversation_id,role,content) VALUES (?,?,?,?)", [id("m_"), convId, "assistant", reply]);
    logEvent(input.botId, "message_in", { channel: input.channel });
    return { conversationId: convId, replies: [reply], toolCalls: [], couldntAnswer: false, costUsd: 0 };
  },
  async composeOutbound(botId, channel, handle, prompt) {
    return { text: `(stub outbound) ${prompt}`, conversationId: "" };
  },
  async runChecks() { return { runId: "stub", status: "done", total: 0, passed: 0 }; },
  async getTestRun(runId) { return { runId, status: "done", total: 0, passed: 0, cases: [] }; },
  async deploy(botId) { const v = id("ver_"); run("UPDATE bots SET status='live', current_version_id=? WHERE id=?", [v, botId]); return { versionId: v, number: 1 }; },
  async rollback() {},
  async getInsights() {
    return { chatsThisWeek: 0, customersThisWeek: 0, answeredOnOwnPct: null, chatsPerDay: [], spendThisMonth: { answering: 0, build: 0, media: 0, tests: 0, total: 0 }, couldntAnswerTopics: [], topIntents: [], needsAttention: [] };
  },
};

export default core;
