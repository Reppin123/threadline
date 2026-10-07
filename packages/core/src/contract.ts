// FROZEN CONTRACT between apps/web, apps/gateway and packages/core.
// Agent "core" implements these in packages/core. Agents "web" and "gateway" call ONLY these.
// Additive changes (new optional fields, new functions) are allowed; never rename/remove. Log any change in COORDINATION.md.

export type Channel = "imessage" | "telegram" | "whatsapp" | "web" | "terminal";

export type BotSource =
  | { kind: "website"; url: string; notes?: string }
  | { kind: "mcp"; url: string; headers?: Record<string, string>; notes?: string }
  | { kind: "api"; openapiUrl?: string; docsUrl?: string; baseUrl?: string; notes?: string }
  | { kind: "idea"; idea: string };

// Answers collected by the conversational new-bot wizard (see research/flow/dashboard.md)
export interface WizardAnswer { question: string; answer: string | string[] }

export interface BotProfile {
  name: string;
  tagline: string;               // one line shown on cards
  persona: string;               // voice & tone
  greeting: string;              // first message to a new customer
  businessSummary: string;       // what the business is/does (from crawl or idea)
  audiences: string[];           // e.g. ["customers", "team"]
  capabilities: string[];        // e.g. ["Track orders", "Recommend teas"]
  guardrails: string[];
  faqs: { q: string; a: string }[];
  suggestions: string[];         // builder suggestion chips
  languages: string[];
}

export type BuildStepId = "read_source" | "understand" | "knowledge" | "tools" | "tables" | "mock_data" | "checks" | "done";
export interface BuildProgress { step: BuildStepId; label: string; pct: number; detail?: string; error?: string }

export interface ChatInput {
  botId: string;
  channel: Channel;
  customerHandle: string;        // phone/email/telegram id; "owner-preview" for the dashboard playground
  customerName?: string;
  text: string;
  attachments?: { url?: string; path?: string; mime: string; name?: string }[];
  location?: { lat: number; lng: number };
  isTest?: boolean;              // playground & simulated users → not in Conversations inbox
  versionId?: string;            // default: bot.current_version_id, or draft when isTest
}
export interface ToolCallRecord { name: string; input: unknown; output: unknown; ok: boolean; ms: number }
export interface ChatResult {
  conversationId: string;
  replies: string[];             // send each as its own bubble, in order
  toolCalls: ToolCallRecord[];
  couldntAnswer: boolean;
  costUsd: number;
}

export interface BuilderReply { reply: string; suggestions: string[]; changed: string[]; draftDirty: boolean }

export interface TestRunSummary { runId: string; status: "running" | "done" | "error"; total: number; passed: number }
export interface Insights {
  chatsThisWeek: number; customersThisWeek: number; answeredOnOwnPct: number | null;
  chatsPerDay: { date: string; byChannel: Record<string, number> }[];   // last 14 days
  spendThisMonth: { answering: number; build: number; media: number; tests: number; total: number };
  couldntAnswerTopics: { topic: string; count: number; examples: string[] }[];
  topIntents: { intent: string; count: number }[];
  needsAttention: { kind: string; message: string; conversationId?: string }[];
}

export interface CoreAPI {
  // Wizard: given answers so far, return the next question (null when ready to build). Chips are suggested answers.
  nextWizardQuestion(answers: WizardAnswer[]): Promise<{ question: string; chips: string[]; multi: boolean; placeholder?: string } | null>;
  // Create bot row (status draft) and return id/slug/join_code. Does not build.
  createBot(userId: string, source: BotSource, wizard?: WizardAnswer[]): Promise<{ botId: string; slug: string; joinCode: string }>;
  // Long-running; persists progress to bots.build_progress_json as it goes and sets status ready|error. Creates version v1.
  buildBot(botId: string, onProgress?: (p: BuildProgress) => void): Promise<void>;
  // Owner edits the bot by talking to the builder. Edits the draft (draft_dirty=1).
  builderChat(botId: string, message: string, threadId?: string): Promise<BuilderReply>;
  // The one runtime used by playground, simulated tests, iMessage and every channel.
  chat(input: ChatInput): Promise<ChatResult>;
  // Generate the text for an outbound/scheduled message (API check-ins). Persists to the conversation.
  composeOutbound(botId: string, channel: Channel, customerHandle: string, prompt: string): Promise<{ text: string; conversationId: string }>;
  // Checks: call changed tools once + play test questions + N simulated users on draft (and current), judge grades. Async.
  runChecks(botId: string, opts?: { simulatedUsers?: number }): Promise<TestRunSummary>;
  getTestRun(runId: string): Promise<TestRunSummary & { cases: { persona: string; goal: string; passed: boolean | null; notes: string | null; transcript: { role: string; text: string }[] }[] }>;
  // Snapshot draft → new version (status current); previous current → previous. Returns version number.
  deploy(botId: string): Promise<{ versionId: string; number: number }>;
  rollback(botId: string, versionId: string): Promise<void>;
  getInsights(botId: string): Promise<Insights>;
}
