// Understand: ingested material + wizard answers → BotProfile, tables, test questions (and mock data for idea bots).
import type { BotProfile, WizardAnswer } from "./contract.ts";
import { completeJson } from "./llm.ts";
import { emptyProfile, type TableSpec, type ToolSpec } from "./config.ts";

export interface Material {
  sourceKind: string;
  sourceLabel: string;                 // url / idea text
  digest: string;                      // condensed source text
  catalog: NonNullable<BotProfile["catalog"]>;
  faqs: { q: string; a: string }[];
  apiTools?: { name: string; description: string }[];
  notes?: string;
}

export interface Understanding {
  profile: BotProfile;
  tables: TableSpec[];
  testQuestions: { question: string; expected: string }[];
  mock?: { collections: { name: string; records: Record<string, unknown>[] }[]; tools: (Omit<ToolSpec, "kind" | "enabled" | "requires_confirmation" | "config"> & { collection: string; op: string })[] };
}

const wizardText = (w: WizardAnswer[]) => w.map((a) => `- ${a.question}: ${Array.isArray(a.answer) ? a.answer.join(", ") : a.answer}`).join("\n") || "(none)";

export async function understand(botId: string, m: Material, wizard: WizardAnswer[]): Promise<Understanding> {
  const isIdea = m.sourceKind === "idea";
  const context = `# Source (${m.sourceKind}): ${m.sourceLabel}
${m.notes ? `Owner notes: ${m.notes}\n` : ""}
# Owner's answers in the setup wizard
${wizardText(wizard)}
${m.catalog.length ? `\n# Product catalog (extracted)\n${m.catalog.map((p) => `- ${p.name} | ${p.price ?? "?"}${p.variants?.length ? ` | ${p.variants.join("; ")}` : ""}${p.description ? ` | ${p.description.slice(0, 140)}` : ""}`).join("\n")}` : ""}
${m.faqs.length ? `\n# FAQs found\n${m.faqs.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n")}` : ""}
${m.apiTools?.length ? `\n# API operations available as tools\n${m.apiTools.map((t) => `- ${t.name}: ${t.description}`).join("\n")}` : ""}
${m.digest ? `\n# Source content\n${m.digest}` : ""}`;

  const fallbackName = guessName(m);
  const profileP = completeJson<any>({
    system: "You set up customer-messaging assistants for businesses. You read source material and write precise, grounded configuration. Output only JSON.",
    messages: [{ role: "user", content: `${context}

Write the assistant's profile as JSON:
{"name": "assistant name (e.g. '<Business> Assistant' or a friendly name)", "tagline": "one line for a dashboard card",
 "persona": "voice & tone in 1-2 sentences, matching the brand", "greeting": "first message to a new customer (1-2 short sentences)",
 "businessSummary": "6-12 sentences: what the business is, what it sells/does, key offerings, where it operates, anything a support agent must know",
 "keyFacts": ["one atomic, exact fact per item: shipping fees & thresholds, delivery times, returns/refunds, payment methods, COD, coupons, contact email/phone, hours, locations, ordering process, pickup… copy numbers exactly; ONLY facts stated in the source${isIdea ? " (for an idea, plausible placeholder policies clearly marked as 'placeholder')" : ""}"],
 "audiences": ["customers" and/or "team"], "capabilities": ["4-7 short verb phrases of what the bot does"],
 "guardrails": ["4-7 rules specific to this business, e.g. never promise delivery dates not on the site"],
 "faqs": [{"q": "…", "a": "…"}  // 8-15 realistic customer questions answered ONLY from the source],
 "suggestions": ["3 short builder suggestion chips, e.g. 'Ask about allergies first'"], "languages": ["English", …]}` }],
    tier: "smart", category: "build", botId, maxTokens: 6000,
    offline: () => ({ text: JSON.stringify(offlineProfile(m, fallbackName)) }),
  }, offlineProfile(m, fallbackName));

  const tablesP = completeJson<any>({
    system: "You design the data tables and acceptance tests for a customer-messaging assistant. Output only JSON.",
    messages: [{ role: "user", content: `${context}

Return JSON:
{"tables": [{"name": "Orders", "description": "what it stores and who fills it", "columns": [{"name": "Item", "type": "text"}], "filled_by": "bot" | "owner"}],
 "testQuestions": [{"question": "a realistic customer message", "expected": "the correct answer, grounded in the source (exact prices/policies)"}]${isIdea ? `,
 "mock": {"collections": [{"name": "menu", "records": [{…}, …6-12 realistic records]}],
          "tools": [{"name": "snake_case_tool", "description": "…", "collection": "menu", "op": "list|search|get|create|update", "input_schema": {"type": "object", "properties": {…}, "required": []}}]}` : ""}}
Rules: tables only for things the owner asked for in the wizard (orders → "Orders" filled_by bot with columns like Item, Quantity, Amount, Customer name, Phone, Address, Status, Placed at; team tasks → "Team tasks" filled_by owner). 0-3 tables.
12-16 test questions covering: specific products & prices, recommendations (e.g. gifting), how-to/usage tips, policies (shipping/returns/payment) if present, ordering, one question whose answer is NOT in the source (expected: "should say it doesn't know / offer to check"), and one in Hinglish if the business is Indian.${isIdea ? " For the idea, create mock collections + 2-4 mock tools so the bot works end to end immediately (e.g. list items, create order/booking, check status)." : ""}` }],
    tier: "smart", category: "build", botId, maxTokens: 6000,
    offline: () => ({ text: JSON.stringify(offlineTables(m, wizard)) }),
  }, offlineTables(m, wizard));

  const [{ data: prof }, { data: tb }] = await Promise.all([profileP, tablesP]);
  const base = emptyProfile(fallbackName);
  const arr = <T,>(v: unknown, d: T[]): T[] => (Array.isArray(v) ? (v as T[]) : d);
  const profile: BotProfile = {
    ...base,
    name: String(prof.name || fallbackName).slice(0, 60),
    tagline: String(prof.tagline ?? ""), persona: String(prof.persona || base.persona), greeting: String(prof.greeting || base.greeting),
    businessSummary: String(prof.businessSummary ?? ""), audiences: arr(prof.audiences, ["customers"]).map(String),
    capabilities: arr(prof.capabilities, []).map(String), guardrails: arr(prof.guardrails, []).map(String),
    faqs: arr<any>(prof.faqs, []).filter((f) => f?.q && f?.a).map((f) => ({ q: String(f.q), a: String(f.a) })),
    suggestions: arr(prof.suggestions, []).map(String).slice(0, 3), languages: arr(prof.languages, ["English"]).map(String),
    keyFacts: arr(prof.keyFacts, []).map(String), catalog: m.catalog,
  };
  const tables: TableSpec[] = arr<any>(tb.tables, []).filter((t) => t?.name && Array.isArray(t.columns)).slice(0, 4).map((t) => ({
    name: String(t.name), description: String(t.description ?? ""), filled_by: t.filled_by === "owner" ? "owner" : "bot",
    columns: t.columns.map((c: any) => (typeof c === "string" ? { name: c } : { name: String(c.name), type: c.type ? String(c.type) : undefined })),
  }));
  const testQuestions = arr<any>(tb.testQuestions, []).filter((q) => q?.question).slice(0, 20).map((q) => ({ question: String(q.question), expected: String(q.expected ?? "") }));
  const mock = isIdea && tb.mock && Array.isArray(tb.mock.collections) ? tb.mock : undefined;
  return { profile, tables, testQuestions, mock };
}

function guessName(m: Material) {
  if (m.sourceKind === "website") {
    try { const h = new URL(m.sourceLabel).hostname.replace(/^www\./, "").split(".")[0]; return h.charAt(0).toUpperCase() + h.slice(1) + " Assistant"; } catch { /* */ }
  }
  if (m.sourceKind === "idea") return m.sourceLabel.split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ").replace(/[^\w ]/g, "") + " Bot";
  return "Assistant";
}

function offlineProfile(m: Material, name: string) {
  return {
    name, tagline: `Answers questions about ${m.sourceLabel}`.slice(0, 80), persona: "Warm, concise and helpful.",
    greeting: `Hi! I'm ${name}. Ask me anything.`, businessSummary: m.digest.slice(0, 600) || m.sourceLabel,
    keyFacts: m.digest.split("\n").filter((l) => /shipping|return|refund|deliver|₹|\$/i.test(l)).slice(0, 8),
    audiences: ["customers"], capabilities: ["Answer questions", ...(m.catalog.length ? ["Recommend products"] : [])],
    guardrails: ["Never invent prices or policies"], faqs: m.faqs.slice(0, 10), suggestions: ["Ask for feedback after orders"], languages: ["English"],
  };
}

function offlineTables(m: Material, wizard: WizardAnswer[]) {
  const wants = wizardText(wizard).toLowerCase() + " " + m.sourceLabel.toLowerCase();
  const tables: any[] = [];
  if (/order|book|cake|reserv/.test(wants)) tables.push({ name: "Orders", description: "Orders taken in chat. The bot fills it.", filled_by: "bot",
    columns: [{ name: "Item" }, { name: "Quantity" }, { name: "Customer name" }, { name: "Phone" }, { name: "Status" }, { name: "Placed at" }] });
  if (/team|task/.test(wants)) tables.push({ name: "Team tasks", description: "You fill it, the bot reads it.", filled_by: "owner", columns: [{ name: "Task" }, { name: "Owner" }, { name: "Due" }, { name: "Done" }] });
  const testQuestions = [
    ...m.catalog.slice(0, 4).map((p) => ({ question: `How much is ${p.name}?`, expected: `${p.name} costs ${p.price}` })),
    ...m.faqs.slice(0, 4).map((f) => ({ question: f.q, expected: f.a })),
    { question: "Do you have a store on Mars?", expected: "Should say it doesn't know / offer to check" },
  ];
  const mock = m.sourceKind === "idea" ? {
    collections: [{ name: "items", records: [{ name: "Classic", price: "$30" }, { name: "Deluxe", price: "$50" }] }],
    tools: [
      { name: "list_items", description: "List available items with prices", collection: "items", op: "list", input_schema: { type: "object", properties: { query: { type: "string" } } } },
      { name: "create_order", description: "Create an order", collection: "orders", op: "create", input_schema: { type: "object", properties: { data: { type: "object" } }, required: ["data"] } },
    ],
  } : undefined;
  return { tables, testQuestions, mock };
}
