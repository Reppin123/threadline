// Flow-style new-bot wizard: starting point → source specifics → who chats → what it should do → action follow-ups.
import type { WizardAnswer } from "./contract.ts";
import { completeJson } from "./llm.ts";
import { fetchText } from "./ingest/website.ts";
import { extractPage } from "./ingest/extract.ts";

export type WizardQ = { question: string; chips: string[]; multi: boolean; placeholder?: string } | null;

const START = "What are we starting from?";
const STARTS = ["Just an idea", "Existing website or app", "An MCP server", "Some APIs"];
const ans = (a: WizardAnswer | undefined) => (a ? (Array.isArray(a.answer) ? a.answer.join(", ") : a.answer) : "");
const find = (answers: WizardAnswer[], re: RegExp) => answers.find((a) => re.test(a.question));

export function startingPoint(answers: WizardAnswer[]): "idea" | "website" | "mcp" | "api" {
  const a = ans(find(answers, /starting from/i) ?? answers[0]).toLowerCase();
  if (/mcp/.test(a)) return "mcp";
  if (/api/.test(a)) return "api";
  if (/website|app|site|https?:\/\//.test(a)) return "website";
  return "idea";
}

export async function nextWizardQuestion(answers: WizardAnswer[]): Promise<WizardQ> {
  if (!answers.length) return { question: START, chips: STARTS, multi: false, placeholder: "or describe your bot" };
  const kind = startingPoint(answers);
  const first = ans(answers[0]);
  const freeText = !STARTS.includes(first);  // owner typed a description instead of picking a chip

  // 2. source specifics
  const sourceQ = { website: /website or app|website|url/i, mcp: /mcp server/i, api: /api docs|openapi|api/i, idea: /describe|idea|what does/i }[kind];
  const haveSource = answers.slice(1).some((a) => sourceQ.test(a.question)) || (kind === "website" && /https?:\/\//.test(first)) || (kind === "idea" && freeText && first.length > 20);
  if (!haveSource) {
    if (kind === "website") return { question: "What's the website or app address?", chips: [], multi: false, placeholder: "https://yourshop.com" };
    if (kind === "mcp") return { question: "What's your MCP server URL?", chips: [], multi: false, placeholder: "https://mcp.yourapp.com/mcp" };
    if (kind === "api") return { question: "Where are your API docs? (OpenAPI/Swagger URL or docs page)", chips: [], multi: false, placeholder: "https://api.yourapp.com/openapi.json" };
    return { question: "Describe your idea — what's the business and what should the bot do?", chips: [], multi: false, placeholder: "A bakery that takes custom cake orders on iMessage" };
  }

  // 3. who chats
  if (!find(answers, /who will chat/i)) return { question: `Who will chat with the ${botLabel(answers)} bot?`, chips: ["My customers", "My team", "Both"], multi: true };

  // 4. what should it do (tailored chips)
  if (!find(answers, /what should/i)) {
    const chips = await capabilityChips(answers, kind);
    return { question: `What should the ${botLabel(answers)} bot do?`, chips, multi: true };
  }

  // 5. follow-up for actions
  const caps = ans(find(answers, /what should/i)).toLowerCase();
  if (/order|book|reserv|appointment|payment|buy|purchase/.test(caps) && !find(answers, /for taking/i) && kind !== "api" && kind !== "mcp") {
    const what = /book|reserv|appointment/.test(caps) ? "bookings" : "orders";
    return { question: `For taking and tracking ${what}, use…`, chips: ["Just a website", "Shopify", "My API", "A spreadsheet the bot keeps"], multi: false };
  }
  return null;
}

function botLabel(answers: WizardAnswer[]) {
  const src = answers.map(ans).find((a) => /https?:\/\//.test(a));
  if (src) { try { const h = new URL(src.match(/https?:\/\/\S+/)![0]).hostname.replace(/^www\./, "").split(".")[0]; return h.charAt(0).toUpperCase() + h.slice(1); } catch { /* */ } }
  return "new";
}

async function capabilityChips(answers: WizardAnswer[], kind: string): Promise<string[]> {
  const url = answers.map(ans).join(" ").match(/https?:\/\/\S+/)?.[0];
  let site = "";
  if (url && kind === "website") {
    try { const r = await fetchText(url, 6000); const ex = extractPage(r.text, r.url); site = `${ex.title}\n${ex.description}\n${ex.headings.slice(0, 15).join(" · ")}\n${ex.text.slice(0, 1500)}`; } catch { /* fall back to generic */ }
  }
  const generic = kind === "idea" ? ["Answer questions", "Take orders", "Book appointments", "Send reminders", "Collect feedback"]
    : ["Answer questions", "Recommend products", "Take orders", "Track orders", "Share tips", "Manage team tasks"];
  const { data } = await completeJson<{ chips: string[] }>({
    system: "You suggest what a customer-messaging bot should do for a specific business. Output only JSON.",
    messages: [{ role: "user", content: `Wizard so far:\n${answers.map((a) => `- ${a.question}: ${ans(a)}`).join("\n")}\n${site ? `\nWebsite snapshot:\n${site}` : ""}\n\nReturn {"chips": [5-7 short capability chips (2-4 words, verb first) specific to THIS business, e.g. "Recommend teas", "Track orders", "Share brewing tips", "Manage team tasks"]}` }],
    tier: "fast", category: "build", maxTokens: 400, offline: () => ({ text: JSON.stringify({ chips: generic }) }),
  }, { chips: generic });
  const chips = (Array.isArray(data.chips) ? data.chips : generic).map(String).filter((c) => c.length < 40).slice(0, 7);
  return chips.length ? chips : generic;
}

/** Map wizard answers → BotSource (helper for web; additive). */
export function sourceFromWizard(answers: WizardAnswer[]) {
  const kind = startingPoint(answers);
  const all = answers.map(ans).join("\n");
  const url = all.match(/https?:\/\/[^\s,]+/)?.[0];
  if (kind === "website" && url) return { kind: "website" as const, url };
  if (kind === "mcp" && url) return { kind: "mcp" as const, url };
  if (kind === "api" && url) return /openapi|swagger|\.json|\.ya?ml/i.test(url) ? { kind: "api" as const, openapiUrl: url } : { kind: "api" as const, docsUrl: url };
  const idea = answers.slice(1).find((a) => /describe|idea/i.test(a.question)) ?? answers[0];
  return { kind: "idea" as const, idea: ans(idea) };
}
