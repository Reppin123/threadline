// Turns wizard answers into a BotSource. Also supplies the questions web must ask itself when the core wizard
// stops before we know the essentials (e.g. a website bot with no URL yet).
import type { BotSource, WizardAnswer } from "@threadline/core";

const URL_RE = /\bhttps?:\/\/[^\s,]+|\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s,]*)?/i;

function text(a: WizardAnswer["answer"]) {
  return Array.isArray(a) ? a.join(", ") : a;
}
export function kindFromStart(s: string): BotSource["kind"] | null {
  const t = s.toLowerCase();
  if (/\bmcp\b/.test(t)) return "mcp";
  if (/\bapis?\b|openapi|swagger/.test(t)) return "api";
  if (/website|\bapp\b|\bsite\b/.test(t)) return "website";
  if (/\bidea\b/.test(t)) return "idea";
  return null;
}
function normUrl(u: string) {
  u = u.replace(/[).,;]+$/, "");
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

export type Missing = { question: string; chips: string[]; multi: boolean; placeholder?: string };

export function deriveSource(answers: WizardAnswer[]): { source: BotSource } | { missing: Missing } {
  const first = answers[0] ? text(answers[0].answer) : "";
  let kind = kindFromStart(first);
  const all = answers.map((a) => text(a.answer));
  const urlAnswer = all.map((t) => t.match(URL_RE)?.[0]).find(Boolean);
  if (!kind) kind = urlAnswer && all.length === 1 ? "website" : "idea";
  const notes = answers.slice(1).map((a) => `${a.question} ${text(a.answer)}`).join("\n").slice(0, 4000) || undefined;

  if (kind === "website") {
    if (!urlAnswer) return { missing: { question: "What's the website or app address?", chips: [], multi: false, placeholder: "https://yourbusiness.com" } };
    return { source: { kind: "website", url: normUrl(urlAnswer), notes } };
  }
  if (kind === "mcp") {
    if (!urlAnswer) return { missing: { question: "What's the URL of your MCP server?", chips: [], multi: false, placeholder: "https://mcp.yourbusiness.com/mcp" } };
    return { source: { kind: "mcp", url: normUrl(urlAnswer), notes } };
  }
  if (kind === "api") {
    if (!urlAnswer) return { missing: { question: "Where can we find your OpenAPI spec or API docs?", chips: [], multi: false, placeholder: "https://api.yourbusiness.com/openapi.json" } };
    const u = normUrl(urlAnswer);
    return { source: /openapi|swagger|\.json|\.ya?ml/i.test(u) ? { kind: "api", openapiUrl: u, notes } : { kind: "api", docsUrl: u, notes } };
  }
  // idea: everything typed that isn't the starting-point chip
  const ideaText = (kindFromStart(first) ? all.slice(1) : all).filter((t) => t && t.length > 3).join(". ");
  if (!ideaText) return { missing: { question: "Describe your bot in a sentence or two. Who texts it, and what should it do for them?", chips: [], multi: false, placeholder: "e.g. Take cake orders for my bakery and remind people when they're ready" } };
  return { source: { kind: "idea", idea: ideaText.slice(0, 2000) } };
}

export function summarizeAnswers(answers: WizardAnswer[]) {
  return "Build my bot from these answers:\n" + answers.map((a) => `- ${a.question.trim().replace(/[?:.…\s]+$/, "")}: ${text(a.answer)}`).join("\n");
}
