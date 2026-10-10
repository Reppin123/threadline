// createBot, buildBot (async pipeline with progress), builderChat (owner edits the draft by talking).
import { run, get, all, id, json, logEvent, tx, encryptJson } from "@threadline/db";
import type { BotSource, WizardAnswer, BuildProgress, BuildStepId, BuilderReply, BotProfile } from "./contract.ts";
import { completeJson } from "./llm.ts";
import { assertBuildAllowed } from "./safety.ts";
import { getBot, loadDraft, emptyProfile, credentials, type ToolSpec, type TableSpec, type BotConfig } from "./config.ts";
import { crawlWebsite, fetchText } from "./ingest/website.ts";
import { extractPage } from "./ingest/extract.ts";
import { loadSpec, specToTools } from "./ingest/openapi.ts";
import { listMcpTools } from "./tools/mcp.ts";
import { addDoc, clearKnowledge, embedBot } from "./knowledge.ts";
import { understand, type Material } from "./profile.ts";
import { builtinToolSpecs } from "./tools/builtin.ts";
import { upsertTable, removeTable } from "./tables.ts";
import { snapshot, writeDraftCollections } from "./versions.ts";

function slugify(s: string) {
  return s.toLowerCase().replace(/https?:\/\//, "").replace(/^www\./, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "bot";
}

export async function createBot(userId: string, source: BotSource, wizard?: WizardAnswer[]) {
  let base: string;
  if (source.kind === "website" || source.kind === "mcp") {
    try { base = new URL(source.url).hostname.replace(/^www\./, "").split(".")[0]; } catch { base = source.kind; }
  } else if (source.kind === "api") {
    const u = source.openapiUrl || source.docsUrl || source.baseUrl;
    try { base = u ? new URL(u).hostname.replace(/^(www|api|petstore3?)\./, "").split(".")[0] : "api"; } catch { base = "api"; }
  } else base = source.idea.replace(/^(a|an|the)\s+/i, "").split(/\s+/).slice(0, 2).join(" ");
  const botId = id("bot_");
  const word = slugify(base).split("-")[0].slice(0, 10) || "bot";
  let joinCode = "";
  for (let i = 0; i < 20; i++) {
    joinCode = `${word}-${Math.random().toString(36).slice(2, 5)}`;
    if (!get("SELECT 1 FROM bots WHERE join_code=?", [joinCode])) break;
  }
  const slug = `${slugify(base)}-${botId.slice(-4).toLowerCase().replace(/[^a-z0-9]/g, "x")}`;
  const name = base.charAt(0).toUpperCase() + base.slice(1) + " Assistant";
  const headers = source.kind === "mcp" && source.headers ? encryptJson({ mcpHeaders: source.headers }) : null;
  const safeSource = source.kind === "mcp" ? { ...source, headers: undefined } : source;
  run("INSERT INTO bots(id,user_id,name,slug,join_code,source_kind,source_json,wizard_json,profile_json,credentials_json,mock_mode) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    [botId, userId, name, slug, joinCode, source.kind, json.str(safeSource), json.str(wizard ?? []), json.str(emptyProfile(name)), headers, source.kind === "idea" ? 1 : 0]);
  logEvent(botId, "bot_created", { kind: source.kind });
  return { botId, slug, joinCode };
}

const STEP_PCT: Record<BuildStepId, number> = { read_source: 10, knowledge: 30, understand: 50, tools: 70, tables: 78, mock_data: 85, checks: 92, done: 100 };

export async function buildBot(botId: string, onProgress?: (p: BuildProgress) => void) {
  const bot = getBot(botId);
  const source = json.parse<BotSource>(bot.source_json, { kind: "idea", idea: bot.name });
  const wizard = json.parse<WizardAnswer[]>(bot.wizard_json, []);
  const progress = (step: BuildStepId, label: string, detail?: string, pctOverride?: number) => {
    const p: BuildProgress = { step, label, pct: pctOverride ?? STEP_PCT[step], detail };
    run("UPDATE bots SET build_progress_json=?, updated_at=datetime('now') WHERE id=?", [json.str(p), botId]);
    logEvent(botId, "build_step", p);
    try { onProgress?.(p); } catch { /* listener errors are not build errors */ }
  };
  run("UPDATE bots SET status='building' WHERE id=?", [botId]);
  try {
    assertBuildAllowed(bot.user_id);   // builds per user per day + kill switch (safety.ts)
    // 1. read source
    progress("read_source", sourceLabel(source));
    const material: Material = { sourceKind: source.kind, sourceLabel: source.kind === "idea" ? source.idea : (source as any).url ?? (source as any).openapiUrl ?? (source as any).docsUrl ?? "", digest: "", catalog: [], faqs: [], notes: (source as any).notes };
    let importedTools: ToolSpec[] = [];
    const docs: { url: string | null; title: string | null; content: string }[] = [];

    if (source.kind === "website") {
      const crawl = await crawlWebsite(source.url, { onPage: (u, n) => progress("read_source", `Reading ${new URL(u).pathname || "/"}`, `${n} pages read`, Math.min(28, 10 + n)) });
      if (!crawl.pages.length) throw new Error(`Couldn't read ${source.url}${crawl.errors[0] ? ` (${crawl.errors[0]})` : ""}`);
      for (const p of crawl.pages) docs.push({ url: p.url, title: p.title, content: [p.description, p.text].filter(Boolean).join("\n") });
      material.catalog = crawl.products.map((p) => ({ name: p.name, price: p.price, url: p.url, description: p.description, variants: p.variants }));
      material.faqs = crawl.pages.flatMap((p) => p.faqs);
      material.digest = digest(crawl.pages.map((p) => ({ url: p.url, title: p.title, text: p.text })));
      progress("read_source", `Read ${crawl.pages.length} pages${crawl.platform ? ` (${crawl.platform} store)` : ""}`, `${material.catalog.length} products found`, 28);
    } else if (source.kind === "api") {
      if (source.openapiUrl) {
        const spec = await loadSpec(source.openapiUrl);
        const r = specToTools(spec, { specUrl: source.openapiUrl, baseUrl: source.baseUrl });
        importedTools = r.tools.slice(0, 40);
        material.apiTools = importedTools.map((t) => ({ name: t.name, description: t.description }));
        material.digest = `API: ${r.title}\n${r.description}\nBase URL: ${r.baseUrl}`;
        docs.push({ url: source.openapiUrl, title: r.title, content: `${r.title}\n${r.description}\n\nOperations:\n${importedTools.map((t) => `- ${t.name}: ${t.description}`).join("\n")}` });
      } else if (source.docsUrl) {
        const crawl = await crawlWebsite(source.docsUrl, { maxPages: 15 });
        for (const p of crawl.pages) docs.push({ url: p.url, title: p.title, content: p.text });
        material.digest = digest(crawl.pages);
        importedTools = await draftToolsFromDocs(botId, material.digest, source.baseUrl);
        material.apiTools = importedTools.map((t) => ({ name: t.name, description: t.description }));
      }
    } else if (source.kind === "mcp") {
      const headers = source.headers ?? credentials(botId)?.mcpHeaders;
      const tools = await listMcpTools(source.url, headers);
      importedTools = tools.slice(0, 40).map((t) => ({
        name: t.name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60), description: (t.description ?? t.name).slice(0, 900), kind: "mcp" as const,
        input_schema: t.inputSchema ?? { type: "object", properties: {} }, enabled: true,
        requires_confirmation: !(t.annotations?.readOnlyHint ?? /^(get|list|search|find|read|fetch)/i.test(t.name)),
        config: { url: source.url, headers, toolName: t.name, readOnly: !!(t.annotations?.readOnlyHint ?? /^(get|list|search|find|read|fetch)/i.test(t.name)) },
      }));
      material.apiTools = importedTools.map((t) => ({ name: t.name, description: t.description }));
      material.digest = `MCP server at ${source.url} exposing ${tools.length} tools.`;
      if (source.url) {
        // the MCP host's website often explains the business
        try { const r = await fetchText(new URL(source.url).origin, 8000); if (r.status < 400 && /html/.test(r.type)) { const ex = extractPage(r.text, r.url); docs.push({ url: r.url, title: ex.title, content: ex.text }); material.digest += `\n\n${ex.title}\n${ex.text.slice(0, 4000)}`; } } catch { /* optional */ }
      }
    }

    // 2. knowledge
    progress("knowledge", "Organizing what I learned");
    clearKnowledge(botId);
    for (const d of docs) if (d.content.trim()) addDoc(botId, d);
    if (material.catalog.length) addDoc(botId, { url: null, title: "Product catalog", content: material.catalog.map((p) => `${p.name}: ${p.price ?? ""}${p.variants?.length ? ` (${p.variants.join("; ")})` : ""}. ${p.description ?? ""} ${p.url ?? ""}`).join("\n") });
    if (material.faqs.length) addDoc(botId, { url: null, title: "FAQ", content: material.faqs.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n") });
    await embedBot(botId).catch(() => 0);

    // 3. understand
    progress("understand", source.kind === "idea" ? "Designing your bot" : "Understanding the business");
    const u = await understand(botId, material, wizard);
    if (u.profile.faqs.length) addDoc(botId, { url: null, title: "Business FAQ (generated from site)", content: u.profile.faqs.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n") });
    if (u.profile.keyFacts?.length) addDoc(botId, { url: null, title: "Key facts & policies", content: u.profile.keyFacts.join("\n") });

    // 4-6. tools, tables, mock data
    progress("tables", `Setting up ${u.tables.map((t) => t.name).join(", ") || "tables"}`);
    progress("tools", "Connecting actions");
    let mockTools: ToolSpec[] = [];
    if (u.mock) {
      progress("mock_data", "Creating sample data so you can try it now");
      run("DELETE FROM mock_records WHERE bot_id=?", [botId]);
      for (const c of u.mock.collections ?? []) for (const r of (c.records ?? []).slice(0, 30))
        run("INSERT INTO mock_records(id,bot_id,collection,data_json) VALUES (?,?,?,?)", [id("mr_"), botId, String(c.name), json.str(r)]);
      mockTools = (u.mock.tools ?? []).filter((t: any) => t?.name && t?.collection).slice(0, 6).map((t: any) => ({
        name: String(t.name).replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 60), description: String(t.description ?? t.name), kind: "mock" as const,
        input_schema: t.input_schema?.type ? t.input_schema : { type: "object", properties: {} }, enabled: true,
        requires_confirmation: false, config: { collection: String(t.collection), op: String(t.op ?? "list") },
      }));
    }
    const cfg: BotConfig = {
      profile: u.profile, tables: u.tables, testQuestions: u.testQuestions, webAccess: !!bot.web_access, languages: u.profile.languages.join(", ") || bot.languages,
      tools: [...builtinToolSpecs({ tables: u.tables, webAccess: !!bot.web_access }), ...importedTools, ...mockTools],
    };
    tx(() => {
      run("UPDATE bots SET name=?, profile_json=?, languages=? WHERE id=?", [u.profile.name, json.str(u.profile), cfg.languages, botId]);
      writeDraftCollections(botId, cfg);
    });

    // 7. quick self-check (one grounded question) — full checks run from Review & deploy
    progress("checks", "Final touches");

    // 8. done → v1
    const v = snapshot(botId, { summary: `First version from ${source.kind === "idea" ? "your idea" : sourceLabel(source)}`, createdBy: "threadline" });
    // a rebuild of a live bot stays live; otherwise ready
    run("UPDATE bots SET status=CASE WHEN current_version_id IS NOT NULL AND EXISTS(SELECT 1 FROM channels WHERE bot_id=bots.id AND status='live') THEN 'live' ELSE 'ready' END WHERE id=?", [botId]);
    progress("done", "Ready", `v${v.number} · ${cfg.tools.length} tools · ${u.tables.length} tables · ${u.testQuestions.length} test questions`);
    // seed the builder thread with the wizard summary + first builder reply
    if (!get("SELECT 1 FROM builder_messages WHERE bot_id=? LIMIT 1", [botId])) {
      const w = wizard.length ? `Build my bot from these answers:\n${wizard.map((a) => `- ${a.question}: ${Array.isArray(a.answer) ? a.answer.join(", ") : a.answer}`).join("\n")}` : `Build my bot from ${sourceLabel(source)}`;
      run("INSERT INTO builder_messages(id,bot_id,role,content) VALUES (?,?,?,?)", [id("bm_"), botId, "user", w]);
      run("INSERT INTO builder_messages(id,bot_id,role,content,suggestions_json) VALUES (?,?,?,?,?)", [id("bm_"), botId, "assistant",
        `I set up ${u.profile.name} to ${u.profile.capabilities.slice(0, 5).map((c) => c.charAt(0).toLowerCase() + c.slice(1)).join(", ") || "answer customer questions"}.${u.tables.length ? ` It keeps ${u.tables.map((t) => t.name).join(" and ")}.` : ""} Try it in the preview, or tell me what to change.`,
        json.str(u.profile.suggestions)]);
    }
  } catch (e) {
    const msg = (e as Error).message;
    const p: BuildProgress = { step: "done", label: "Build failed", pct: 100, error: msg };
    run("UPDATE bots SET status='error', build_progress_json=? WHERE id=?", [json.str(p), botId]);
    logEvent(botId, "build_error", { error: msg });
    try { onProgress?.(p); } catch { /* */ }
    throw e;
  }
}

function sourceLabel(s: BotSource) {
  if (s.kind === "website") return `Reading ${s.url}`;
  if (s.kind === "mcp") return `Connecting to MCP server ${s.url}`;
  if (s.kind === "api") return `Reading API ${s.openapiUrl ?? s.docsUrl ?? s.baseUrl ?? ""}`;
  return "Reading your idea";
}

/** Condense pages into a prompt-sized digest; policy/FAQ pages first and in full. */
function digest(pages: { url: string; title: string; text: string }[], cap = 60_000) {
  const score = (u: string) => (/faq|shipping|return|refund|policy|contact|about|story|terms/.test(u) ? 0 : /product|shop|menu|service/.test(u) ? 1 : 2);
  const sorted = [...pages].sort((a, b) => score(a.url) - score(b.url));
  let out = "";
  for (const p of sorted) {
    const per = score(p.url) === 0 ? 6000 : 2200;
    const block = `\n### ${p.title} <${p.url}>\n${p.text.slice(0, per)}\n`;
    if (out.length + block.length > cap) break;
    out += block;
  }
  return out;
}

async function draftToolsFromDocs(botId: string, docsDigest: string, baseUrl?: string): Promise<ToolSpec[]> {
  const { data } = await completeJson<{ tools: any[] }>({
    system: "You read API documentation and draft HTTP tool specs. Output only JSON.",
    messages: [{ role: "user", content: `${docsDigest.slice(0, 40000)}\n\nDraft up to 12 tools as JSON {"tools":[{"name":"snake_case","description":"…","method":"GET","baseUrl":"${baseUrl ?? "https://…"}","path":"/things/{id}","params":[{"name":"id","in":"path|query"}],"hasBody":false,"input_schema":{"type":"object","properties":{…},"required":[…]}}]}` }],
    tier: "smart", category: "build", botId, maxTokens: 5000, offline: () => ({ text: '{"tools":[]}' }),
  }, { tools: [] });
  return (data.tools ?? []).filter((t) => t?.name && t?.path).map((t) => ({
    name: String(t.name).replace(/[^a-zA-Z0-9_]/g, "_"), description: `${t.description ?? ""} (unverified — drafted from docs)`, kind: "http" as const,
    input_schema: t.input_schema ?? { type: "object", properties: {} }, enabled: true, requires_confirmation: String(t.method ?? "GET").toUpperCase() !== "GET",
    config: { method: String(t.method ?? "GET").toUpperCase(), baseUrl: t.baseUrl ?? baseUrl ?? "", path: t.path, params: t.params ?? [], hasBody: !!t.hasBody, unverified: true },
  }));
}

// ───────────────────────── builderChat ─────────────────────────
export async function builderChat(botId: string, message: string, threadId = "main"): Promise<BuilderReply> {
  const bot = getBot(botId);
  const draft = loadDraft(botId);
  const prior = all<{ role: string; content: string }>("SELECT role, content FROM builder_messages WHERE bot_id=? AND thread_id=? ORDER BY created_at DESC, rowid DESC LIMIT 12", [botId, threadId]).reverse();
  run("INSERT INTO builder_messages(id,bot_id,thread_id,role,content) VALUES (?,?,?,?,?)", [id("bm_"), botId, threadId, "user", message]);

  const view = {
    profile: { ...draft.profile, catalog: undefined, catalogCount: draft.profile.catalog?.length ?? 0 },
    tables: draft.tables, tools: draft.tools.map((t) => ({ name: t.name, kind: t.kind, enabled: t.enabled, description: t.description.slice(0, 120) })),
    testQuestions: draft.testQuestions, webAccess: draft.webAccess, languages: draft.languages,
  };
  const { data } = await completeJson<any>({
    system: `You are the Threadline builder. The business owner tells you how their customer-messaging bot should behave; you edit the bot's draft configuration and reply briefly (1-3 sentences, friendly, concrete: say what you changed). If the request is a question, answer it without changes. Never invent business facts (prices, policies) unless the owner states them — then add them as keyFacts. Output only JSON.`,
    messages: [{ role: "user", content: `Current draft:\n${JSON.stringify(view, null, 1).slice(0, 24000)}\n\nRecent builder chat:\n${prior.map((m) => `${m.role}: ${m.content}`).join("\n").slice(-4000) || "(none)"}\n\nOwner: ${message}\n\nReturn JSON:
{"reply": "what you did", "suggestions": ["2-3 short next-step chips for this bot"],
 "changes": {
   "profile": {"name"?, "tagline"?, "persona"?, "greeting"?, "businessSummary"?, "capabilities"?: [...full list], "languages"?: [...]},
   "addGuardrails": [], "removeGuardrails": [], "addKeyFacts": [], "removeKeyFacts": [], "addFaqs": [{"q","a"}], "removeFaqs": ["question text"],
   "addTables": [{"name","description","columns":[{"name"}],"filled_by":"bot|owner"}], "removeTables": ["name"],
   "addTestQuestions": [{"question","expected"}], "removeTestQuestions": ["question text"],
   "enableTools": ["name"], "disableTools": ["name"], "webAccess": true|false
 }}
Omit keys you don't change.` }],
    tier: "smart", category: "build", botId, maxTokens: 3000,
    offline: () => ({ text: JSON.stringify(offlineBuilder(message)) }),
  }, { reply: "Sorry, I couldn't process that — try rephrasing?", suggestions: [], changes: {} });

  const changed = applyChanges(botId, draft, data.changes ?? {});
  const suggestions = (Array.isArray(data.suggestions) ? data.suggestions : []).map(String).slice(0, 3);
  const reply = String(data.reply ?? "Done.");
  run("INSERT INTO builder_messages(id,bot_id,thread_id,role,content,suggestions_json) VALUES (?,?,?,?,?,?)", [id("bm_"), botId, threadId, "assistant", reply, json.str(suggestions)]);
  if (changed.length) run("UPDATE bots SET draft_dirty=1, updated_at=datetime('now') WHERE id=?", [botId]);
  logEvent(botId, "builder_change", { changed });
  const dirty = !!get<{ d: number }>("SELECT draft_dirty d FROM bots WHERE id=?", [bot.id])?.d;
  return { reply, suggestions, changed, draftDirty: dirty };
}

function applyChanges(botId: string, draft: BotConfig, c: any): string[] {
  const changed: string[] = [];
  const p: BotProfile = { ...draft.profile };
  const strs = (v: unknown) => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);
  if (c.profile && typeof c.profile === "object") {
    for (const k of ["name", "tagline", "persona", "greeting", "businessSummary"] as const)
      if (typeof c.profile[k] === "string" && c.profile[k] && c.profile[k] !== p[k]) { (p as any)[k] = c.profile[k]; changed.push(k); }
    for (const k of ["capabilities", "languages"] as const)
      if (Array.isArray(c.profile[k])) { p[k] = strs(c.profile[k]); changed.push(k); }
  }
  const listEdit = (key: "guardrails" | "keyFacts", add: unknown, rem: unknown) => {
    let list = [...(p[key] ?? [])];
    const a = strs(add), r = strs(rem).map((x) => x.toLowerCase());
    if (!a.length && !r.length) return;
    list = list.filter((x) => !r.some((y) => x.toLowerCase().includes(y) || y.includes(x.toLowerCase())));
    list.push(...a.filter((x) => !list.includes(x)));
    (p as any)[key] = list;
    changed.push(key);
  };
  listEdit("guardrails", c.addGuardrails, c.removeGuardrails);
  listEdit("keyFacts", c.addKeyFacts, c.removeKeyFacts);
  if (Array.isArray(c.addFaqs) || Array.isArray(c.removeFaqs)) {
    const rem = strs(c.removeFaqs).map((x) => x.toLowerCase());
    p.faqs = [...p.faqs.filter((f) => !rem.some((r) => f.q.toLowerCase().includes(r))), ...(c.addFaqs ?? []).filter((f: any) => f?.q && f?.a).map((f: any) => ({ q: String(f.q), a: String(f.a) }))];
    changed.push("faqs");
  }
  if (changed.length) run("UPDATE bots SET profile_json=?, name=? WHERE id=?", [json.str(p), p.name, botId]);
  if (Array.isArray(p.languages) && changed.includes("languages")) run("UPDATE bots SET languages=? WHERE id=?", [p.languages.join(", "), botId]);

  let tablesChanged = false;
  for (const t of Array.isArray(c.addTables) ? c.addTables : []) {
    if (!t?.name || !Array.isArray(t.columns)) continue;
    upsertTable(botId, { name: String(t.name), description: String(t.description ?? ""), filled_by: t.filled_by === "owner" ? "owner" : "bot", columns: t.columns.map((x: any) => (typeof x === "string" ? { name: x } : { name: String(x.name) })) } as TableSpec);
    changed.push(`table ${t.name}`); tablesChanged = true;
  }
  for (const n of strs(c.removeTables)) { removeTable(botId, n); changed.push(`removed table ${n}`); tablesChanged = true; }
  for (const q of Array.isArray(c.addTestQuestions) ? c.addTestQuestions : []) {
    if (!q?.question) continue;
    run("INSERT INTO test_questions(id,bot_id,question,expected) VALUES (?,?,?,?)", [id("tq_"), botId, String(q.question), q.expected ? String(q.expected) : null]);
    changed.push("test questions");
  }
  for (const q of strs(c.removeTestQuestions)) { run("DELETE FROM test_questions WHERE bot_id=? AND question LIKE ?", [botId, `%${q}%`]); changed.push("test questions"); }
  for (const n of strs(c.enableTools)) { run("UPDATE tools SET enabled=1 WHERE bot_id=? AND name=?", [botId, n]); changed.push(`enabled ${n}`); }
  for (const n of strs(c.disableTools)) { run("UPDATE tools SET enabled=0 WHERE bot_id=? AND name=?", [botId, n]); changed.push(`disabled ${n}`); }
  let web = draft.webAccess;
  if (typeof c.webAccess === "boolean" && c.webAccess !== draft.webAccess) { web = c.webAccess; run("UPDATE bots SET web_access=? WHERE id=?", [web ? 1 : 0, botId]); changed.push(`web access ${web ? "on" : "off"}`); tablesChanged = true; }
  if (tablesChanged) refreshBuiltins(botId, web);
  return [...new Set(changed)];
}

/** Builtin tool schemas depend on tables + web access; regenerate them, preserving enabled flags. */
export function refreshBuiltins(botId: string, webAccess: boolean) {
  const cfg = loadDraft(botId);
  const enabled = new Map(cfg.tools.map((t) => [t.name, t.enabled]));
  run("DELETE FROM tools WHERE bot_id=? AND kind='builtin'", [botId]);
  for (const t of builtinToolSpecs({ tables: cfg.tables, webAccess }))
    run("INSERT INTO tools(id,bot_id,name,description,kind,input_schema_json,config_json,enabled,requires_confirmation) VALUES (?,?,?,?,?,?,?,?,?)",
      [id("tl_"), botId, t.name, t.description, t.kind, json.str(t.input_schema), json.str(t.config), enabled.get(t.name) === false ? 0 : 1, 0]);
}

function offlineBuilder(message: string) {
  const m = message.toLowerCase();
  const changes: any = {};
  if (/always|never|don't|do not|ask/.test(m)) changes.addGuardrails = [message];
  if (/table|keep a list/.test(m)) changes.addTables = [{ name: "Leads", description: message, columns: [{ name: "Name" }, { name: "Phone" }], filled_by: "bot" }];
  if (/web access on/.test(m)) changes.webAccess = true;
  return { reply: Object.keys(changes).length ? "Done — I updated the draft." : "Got it.", suggestions: ["Ask for feedback after orders", "Offer a welcome discount"], changes };
}
