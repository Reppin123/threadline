// The bot "config" = everything a version snapshot freezes: profile, tools, tables, test questions, switches.
// Draft = live DB rows; versions = immutable JSON snapshots in bot_versions.
import { get, all, json, decryptJson } from "@threadline/db";
import type { BotProfile } from "./contract.ts";

export interface ToolSpec {
  name: string; description: string; kind: "http" | "mcp" | "mock" | "builtin";
  input_schema: any; config: any; enabled: boolean; requires_confirmation: boolean;
}
export interface TableSpec { name: string; description: string; columns: { name: string; type?: string; description?: string }[]; filled_by: "bot" | "owner" }
export interface BotConfig {
  profile: BotProfile;
  tools: ToolSpec[];
  tables: TableSpec[];
  testQuestions: { question: string; expected: string | null }[];
  webAccess: boolean;
  languages: string;
}
export interface BotRow {
  id: string; user_id: string; name: string; slug: string; join_code: string; source_kind: string; source_json: string; status: string;
  profile_json: string | null; credentials_json: string | null; wizard_json: string | null; web_access: number; languages: string;
  current_version_id: string | null; draft_dirty: number; mock_mode: number;
}

export function getBot(botId: string): BotRow {
  const b = get<BotRow>("SELECT * FROM bots WHERE id=?", [botId]);
  if (!b) throw new Error("bot not found: " + botId);
  return b;
}

export function emptyProfile(name = "Assistant"): BotProfile {
  return { name, tagline: "", persona: "Warm, concise and helpful.", greeting: `Hi! I'm ${name}. How can I help?`, businessSummary: "",
    audiences: ["customers"], capabilities: [], guardrails: [], faqs: [], suggestions: [], languages: ["English"] };
}

export function loadDraft(botId: string): BotConfig {
  const b = getBot(botId);
  const tools = all<any>("SELECT * FROM tools WHERE bot_id=? ORDER BY rowid", [botId]).map((t) => ({
    name: t.name, description: t.description, kind: t.kind, input_schema: json.parse(t.input_schema_json, {}),
    config: json.parse(t.config_json, {}), enabled: !!t.enabled, requires_confirmation: !!t.requires_confirmation,
  }));
  const tables = all<any>("SELECT * FROM bot_tables WHERE bot_id=? ORDER BY created_at, rowid", [botId]).map((t) => ({
    name: t.name, description: t.description ?? "", columns: json.parse(t.columns_json, []), filled_by: t.filled_by,
  }));
  const testQuestions = all<any>("SELECT question, expected FROM test_questions WHERE bot_id=? ORDER BY created_at, rowid", [botId]);
  return { profile: { ...emptyProfile(b.name), ...json.parse(b.profile_json, {}) }, tools, tables, testQuestions, webAccess: !!b.web_access, languages: b.languages };
}

/** Config to run: explicit version, else draft for tests, else the current version (falls back to draft). */
export function loadConfig(botId: string, opts: { versionId?: string; isTest?: boolean } = {}): { config: BotConfig; versionId: string | null } {
  const b = getBot(botId);
  const vid = opts.versionId ?? (opts.isTest ? null : b.current_version_id);
  if (vid) {
    const v = get<{ snapshot_json: string }>("SELECT snapshot_json FROM bot_versions WHERE id=? AND bot_id=?", [vid, botId]);
    if (v) return { config: json.parse<BotConfig>(v.snapshot_json, loadDraft(botId)), versionId: vid };
  }
  return { config: loadDraft(botId), versionId: null };
}

export function credentials(botId: string): any {
  const b = getBot(botId);
  if (!b.credentials_json) return {};
  const dec = decryptJson<any>(b.credentials_json, null);
  return dec ?? json.parse(b.credentials_json, {});
}
