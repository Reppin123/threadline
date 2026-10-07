// Human-readable diff between two JSON snapshots (versions, draft vs current).
export type Change = { path: string; kind: "added" | "removed" | "changed"; before?: string; after?: string };

const LABELS: Record<string, string> = {
  name: "Name", tagline: "Tagline", persona: "Voice", greeting: "Greeting", businessSummary: "What the business does", audiences: "Who it talks to",
  capabilities: "What it can do", guardrails: "Rules", faqs: "FAQs", suggestions: "Builder suggestions", languages: "Languages", tools: "Tools", tables: "Tables",
  profile: "", test_questions: "Test questions", testQuestions: "Test questions", web_access: "Web access", webAccess: "Web access",
};

function show(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string") return v.length > 220 ? v.slice(0, 217) + "…" : v;
  if (typeof v === "object") {
    const o = v as any;
    if (o.q && o.a) return `${o.q} → ${o.a}`;
    if (o.name) return String(o.name) + (o.description ? ` — ${o.description}` : "");
    if (o.question) return String(o.question);
  }
  const s = JSON.stringify(v);
  return s.length > 220 ? s.slice(0, 217) + "…" : s;
}
function label(path: string[]) {
  return path.map((p) => LABELS[p] ?? p).filter(Boolean).join(" › ") || "Bot";
}

export function diff(a: unknown, b: unknown, path: string[] = [], out: Change[] = []): Change[] {
  if (out.length > 200) return out;
  if (JSON.stringify(a) === JSON.stringify(b)) return out;
  if (Array.isArray(a) && Array.isArray(b)) {
    const key = (x: unknown) => (x && typeof x === "object" ? JSON.stringify((x as any).name ?? (x as any).q ?? (x as any).question ?? x) : JSON.stringify(x));
    const am = new Map(a.map((x) => [key(x), x]));
    const bm = new Map(b.map((x) => [key(x), x]));
    for (const [k, v] of bm) {
      if (!am.has(k)) out.push({ path: label(path), kind: "added", after: show(v) });
      else if (JSON.stringify(am.get(k)) !== JSON.stringify(v)) out.push({ path: label(path), kind: "changed", before: show(am.get(k)), after: show(v) });
    }
    for (const [k, v] of am) if (!bm.has(k)) out.push({ path: label(path), kind: "removed", before: show(v) });
    return out;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const keys = new Set([...Object.keys(a as object), ...Object.keys(b as object)]);
    for (const k of keys) {
      if (k === "id" || k === "created_at" || k === "updated_at" || k === "hash") continue;
      diff((a as any)[k], (b as any)[k], [...path, k], out);
    }
    return out;
  }
  if (a === undefined) out.push({ path: label(path), kind: "added", after: show(b) });
  else if (b === undefined) out.push({ path: label(path), kind: "removed", before: show(a) });
  else out.push({ path: label(path), kind: "changed", before: show(a), after: show(b) });
  return out;
}
