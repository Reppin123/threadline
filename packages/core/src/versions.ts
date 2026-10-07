// Immutable version snapshots. deploy(): draft → new current version; rollback(): make an older version current again.
import { createHash } from "node:crypto";
import { run, get, all, id, json, tx, logEvent } from "@threadline/db";
import { loadDraft, getBot, type BotConfig } from "./config.ts";
import { upsertTable } from "./tables.ts";

export function configHash(cfg: BotConfig) {
  return createHash("sha256").update(JSON.stringify(cfg)).digest("hex").slice(0, 7);
}

export function snapshot(botId: string, opts: { summary?: string; createdBy?: string; checksRunId?: string | null } = {}) {
  const cfg = loadDraft(botId);
  const hash = configHash(cfg);
  const bot = getBot(botId);
  if (bot.current_version_id) {
    const cur = get<{ id: string; number: number; hash: string }>("SELECT id, number, hash FROM bot_versions WHERE id=?", [bot.current_version_id]);
    if (cur && cur.hash === hash) {
      run("UPDATE bots SET draft_dirty=0 WHERE id=?", [botId]);
      return { versionId: cur.id, number: cur.number, created: false };
    }
  }
  const number = (get<{ n: number }>("SELECT COALESCE(MAX(number),0) n FROM bot_versions WHERE bot_id=?", [botId])?.n ?? 0) + 1;
  const vid = id("ver_");
  const summary = opts.summary ?? summarizeChange(botId, cfg);
  tx(() => {
    run("UPDATE bot_versions SET status='previous' WHERE bot_id=? AND status='current'", [botId]);
    run("INSERT INTO bot_versions(id,bot_id,number,hash,summary,snapshot_json,checks_run_id,status,created_by) VALUES (?,?,?,?,?,?,?,?,?)",
      [vid, botId, number, hash, summary, json.str(cfg), opts.checksRunId ?? null, "current", opts.createdBy ?? "builder"]);
    run("UPDATE bots SET current_version_id=?, draft_dirty=0, updated_at=datetime('now') WHERE id=?", [vid, botId]);
  });
  logEvent(botId, "deploy", { versionId: vid, number, hash });
  return { versionId: vid, number, created: true };
}

/** Human summary of what changed vs the current version. */
export function summarizeChange(botId: string, cfg: BotConfig): string {
  const bot = getBot(botId);
  const prev = bot.current_version_id ? get<{ snapshot_json: string }>("SELECT snapshot_json FROM bot_versions WHERE id=?", [bot.current_version_id]) : null;
  if (!prev) return `First version: ${cfg.profile.capabilities.slice(0, 4).join(", ") || "initial bot"}`;
  return diffConfigs(json.parse<BotConfig>(prev.snapshot_json, cfg), cfg).join("; ") || "No functional changes";
}

export function diffConfigs(a: BotConfig, b: BotConfig): string[] {
  const out: string[] = [];
  for (const k of ["name", "persona", "greeting", "businessSummary", "tagline"] as const)
    if (JSON.stringify(a.profile[k]) !== JSON.stringify(b.profile[k])) out.push(`${k} changed`);
  const listDiff = (label: string, x: string[], y: string[]) => {
    const add = y.filter((v) => !x.includes(v)), rem = x.filter((v) => !y.includes(v));
    if (add.length) out.push(`added ${label}: ${add.join(", ").slice(0, 160)}`);
    if (rem.length) out.push(`removed ${label}: ${rem.join(", ").slice(0, 160)}`);
  };
  listDiff("guardrails", a.profile.guardrails, b.profile.guardrails);
  listDiff("FAQs", a.profile.faqs.map((f) => f.q), b.profile.faqs.map((f) => f.q));
  listDiff("tables", a.tables.map((t) => t.name), b.tables.map((t) => t.name));
  listDiff("tools", a.tools.filter((t) => t.enabled).map((t) => t.name), b.tools.filter((t) => t.enabled).map((t) => t.name));
  listDiff("test questions", a.testQuestions.map((q) => q.question), b.testQuestions.map((q) => q.question));
  if (a.webAccess !== b.webAccess) out.push(`web access ${b.webAccess ? "on" : "off"}`);
  return out;
}

/** Tools whose spec differs from the current version (for checks). */
export function changedTools(botId: string): string[] {
  const draft = loadDraft(botId);
  const bot = getBot(botId);
  const prev = bot.current_version_id ? json.parse<BotConfig | null>(get<{ snapshot_json: string }>("SELECT snapshot_json FROM bot_versions WHERE id=?", [bot.current_version_id])?.snapshot_json, null) : null;
  return draft.tools.filter((t) => t.enabled && t.kind !== "builtin" && JSON.stringify(prev?.tools.find((p) => p.name === t.name)) !== JSON.stringify(t)).map((t) => t.name);
}

export async function deploy(botId: string) {
  const v = snapshot(botId, { createdBy: "owner" });
  run("UPDATE bots SET status='live', updated_at=datetime('now') WHERE id=?", [botId]);
  return { versionId: v.versionId, number: v.number };
}

/** Make an older version current again and restore the draft from it. */
export async function rollback(botId: string, versionId: string) {
  const v = get<{ id: string; snapshot_json: string }>("SELECT id, snapshot_json FROM bot_versions WHERE id=? AND bot_id=?", [versionId, botId]);
  if (!v) throw new Error("version not found");
  const cfg = json.parse<BotConfig>(v.snapshot_json, loadDraft(botId));
  tx(() => {
    run("UPDATE bot_versions SET status='previous' WHERE bot_id=? AND status='current'", [botId]);
    run("UPDATE bot_versions SET status='current' WHERE id=?", [versionId]);
    run("UPDATE bots SET current_version_id=?, draft_dirty=0, profile_json=?, name=?, web_access=?, languages=?, updated_at=datetime('now') WHERE id=?",
      [versionId, json.str(cfg.profile), cfg.profile.name, cfg.webAccess ? 1 : 0, cfg.languages, botId]);
    writeDraftCollections(botId, cfg);
  });
  logEvent(botId, "rollback", { versionId });
}

/** Replace draft tools/tables/test questions with the given config (rows of removed tables are kept only if the table survives). */
export function writeDraftCollections(botId: string, cfg: BotConfig) {
  run("DELETE FROM tools WHERE bot_id=?", [botId]);
  for (const t of cfg.tools)
    run("INSERT INTO tools(id,bot_id,name,description,kind,input_schema_json,config_json,enabled,requires_confirmation) VALUES (?,?,?,?,?,?,?,?,?)",
      [id("tl_"), botId, t.name, t.description, t.kind, json.str(t.input_schema), json.str(t.config), t.enabled ? 1 : 0, t.requires_confirmation ? 1 : 0]);
  const keep = new Set(cfg.tables.map((t) => t.name.toLowerCase()));
  for (const t of all<{ name: string }>("SELECT name FROM bot_tables WHERE bot_id=?", [botId]))
    if (!keep.has(t.name.toLowerCase())) run("DELETE FROM bot_tables WHERE bot_id=? AND name=?", [botId, t.name]);
  for (const t of cfg.tables) upsertTable(botId, t);
  run("DELETE FROM test_questions WHERE bot_id=?", [botId]);
  for (const q of cfg.testQuestions) run("INSERT INTO test_questions(id,bot_id,question,expected) VALUES (?,?,?,?)", [id("tq_"), botId, q.question, q.expected]);
}
