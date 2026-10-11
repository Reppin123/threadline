// Inspect (agent inspect): "What the bot is made of", read straight from the bot's real config. Nothing here is
// paraphrased: the Instructions are buildSystemPrompt() — the exact function runtime.chat() sends the LLM — and every
// other section is the rows the runtime reads. Secrets are never returned, only whether they're set.
import { get, all } from "@threadline/db";
import { getBot, loadConfig, credentials, type ToolSpec } from "./config.ts";
import { buildSystemPrompt } from "./runtime.ts";
import { listConnections, type SafeConnection } from "./ingest/connector-detect.ts";

export type InspectChannel = "web" | "imessage" | "telegram" | "whatsapp" | "terminal";

export interface InspectTool {
  name: string; description: string; kind: string; kindLabel: string; enabled: boolean; activeNow: boolean; needsConfirmation: boolean;
  detail: string | null;                // method + path / MCP tool name — never config secrets
  connection: string | null;
}
export interface InspectData {
  bot: { id: string; name: string; status: string; slug: string; joinCode: string };
  source: { label: string; versionNumber: number | null; isDraft: boolean; liveVersionNumber: number | null; draftDirty: boolean };
  channel: InspectChannel;
  instructions: string;
  tools: InspectTool[];
  channels: { channel: string; status: string; handle: string | null; updatedAt: string }[];
  connections: SafeConnection[];
  keys: { key: string; set: boolean; where: string }[];
  settings: { label: string; value: string }[];
  testQuestions: { question: string; expected: string | null }[];
  savedData: { name: string; description: string; filledBy: string; columns: string[]; rows: number; testRows: number }[];
  pages: { url: string | null; title: string | null; fetchedAt: string; chars: number }[];
  updates: { number: number; summary: string | null; createdBy: string | null; createdAt: string; live: boolean }[];
}

const KIND_LABEL: Record<string, string> = { builtin: "Built in", mock: "Practice data", http: "API", mcp: "MCP server" };

function toolDetail(t: ToolSpec): string | null {
  const c = t.config ?? {};
  if (c.via === "mcp" || t.kind === "mcp") return `MCP tool ${c.toolName ?? t.name}`;
  if (c.via === "plain") return c.method === "ANY" ? `POST/PUT/PATCH/DELETE ${c.baseUrl}/…` : `GET ${c.baseUrl}/…`;
  if (t.kind === "http" && c.path) return `${c.method ?? "GET"} ${String(c.baseUrl ?? "").replace(/\/$/, "")}${c.path}`;
  if (t.kind === "mock") return c.collection ? `${c.op ?? "list"} on practice "${c.collection}"` : null;
  return null;
}

/** Flatten credentials_json into dotted keys; values are never returned. */
function flattenKeys(o: any, prefix = ""): string[] {
  if (!o || typeof o !== "object") return prefix ? [prefix] : [];
  const out: string[] = [];
  for (const [k, v] of Object.entries(o)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) out.push(...flattenKeys(v, p));
    else out.push(p);
  }
  return out;
}

function hasColumn(table: string, col: string): boolean {
  return all<{ name: string }>(`PRAGMA table_info(${table})`).some((c) => c.name === col);
}

export function inspectBot(botId: string, opts: { channel?: InspectChannel; version?: "live" | "draft" } = {}): InspectData {
  const b = getBot(botId);
  const channel = opts.channel ?? "web";
  const live = b.current_version_id ? get<{ number: number }>("SELECT number FROM bot_versions WHERE id=?", [b.current_version_id]) : undefined;
  const useDraft = opts.version === "draft" || !b.current_version_id;
  const { config, versionId } = loadConfig(botId, useDraft ? { isTest: true } : {});
  const vnum = versionId ? get<{ number: number }>("SELECT number FROM bot_versions WHERE id=?", [versionId])?.number ?? null : null;

  // Same call runtime.chat() makes; the per-message parts (matching pages, this customer's memories) are empty here.
  const instructions = buildSystemPrompt(config, { channel, memories: {}, knowledge: [], isNewCustomer: false, nowIso: "<time of the message>" });

  const connections = listConnections(botId);
  const connName = new Map(connections.map((c) => [c.id, c.name]));
  const tools: InspectTool[] = config.tools.map((t) => {
    const cid = t.config?.connectionId as string | undefined;
    const activeNow = t.enabled && (t.kind !== "builtin" || t.name !== "fetch_page" || config.webAccess);
    return {
      name: t.name, description: t.description, kind: t.kind,
      kindLabel: cid ? `Connection · ${connName.get(cid) ?? t.config?.connection ?? "removed"}` : KIND_LABEL[t.kind] ?? t.kind,
      enabled: t.enabled, activeNow, needsConfirmation: t.requires_confirmation, detail: toolDetail(t), connection: cid ? connName.get(cid) ?? null : null,
    };
  });

  const creds = credentials(botId);
  const keys = [
    ...flattenKeys(creds).map((k) => ({ key: k, set: true, where: "Bot keys" })),
    ...connections.map((c) => ({ key: `${c.name} key${c.authName ? ` (${c.authName})` : ""}`, set: c.keySet, where: `Connection · ${c.address}` })),
  ];

  const settings = [
    { label: "Web access (read any public page)", value: b.web_access ? "On" : "Off" },
    { label: "Languages", value: config.languages || b.languages || "English" },
    { label: "Started with practice data", value: b.mock_mode ? "Yes (built from an idea)" : "No" },
    { label: "Join code", value: b.join_code },
    { label: "Built from", value: b.source_kind },
    { label: "Unsaved changes since the live version", value: !b.current_version_id ? "Not deployed yet" : b.draft_dirty ? "Yes" : "No" },
  ];

  const isTestCol = hasColumn("bot_table_rows", "is_test");
  const savedData = all<{ id: string; name: string; description: string | null; filled_by: string; columns_json: string; n: number; t: number }>(
    `SELECT bt.id, bt.name, bt.description, bt.filled_by, bt.columns_json,
            (SELECT count(*) FROM bot_table_rows r WHERE r.table_id=bt.id ${isTestCol ? "AND r.is_test=0" : ""}) n,
            ${isTestCol ? "(SELECT count(*) FROM bot_table_rows r WHERE r.table_id=bt.id AND r.is_test=1)" : "0"} t
       FROM bot_tables bt WHERE bt.bot_id=? ORDER BY bt.created_at, bt.rowid`, [botId],
  ).map((r) => {
    let cols: string[] = [];
    try { cols = (JSON.parse(r.columns_json) as { name: string }[]).map((c) => c.name); } catch { /* bad json */ }
    return { name: r.name, description: r.description ?? "", filledBy: r.filled_by, columns: cols, rows: r.n, testRows: r.t };
  });

  return {
    bot: { id: b.id, name: b.name, status: b.status, slug: b.slug, joinCode: b.join_code },
    source: {
      label: useDraft ? (b.current_version_id ? "Draft (what Test uses)" : "Draft (not deployed yet)") : `Live version v${vnum}`,
      versionNumber: vnum, isDraft: useDraft, liveVersionNumber: live?.number ?? null, draftDirty: !!b.draft_dirty,
    },
    channel,
    instructions,
    tools,
    channels: all<{ channel: string; status: string; line_handle: string | null; updated_at: string }>(
      "SELECT channel, status, line_handle, updated_at FROM channels WHERE bot_id=? ORDER BY channel", [botId],
    ).map((c) => ({ channel: c.channel, status: c.status, handle: c.line_handle, updatedAt: c.updated_at })),
    connections,
    keys,
    settings,
    testQuestions: config.testQuestions,
    savedData,
    pages: all<{ url: string | null; title: string | null; fetched_at: string; chars: number }>(
      "SELECT url, title, fetched_at, length(content) chars FROM knowledge_docs WHERE bot_id=? ORDER BY fetched_at, rowid", [botId],
    ).map((p) => ({ url: p.url, title: p.title, fetchedAt: p.fetched_at, chars: p.chars })),
    updates: all<{ id: string; number: number; summary: string | null; created_by: string | null; created_at: string }>(
      "SELECT id, number, summary, created_by, created_at FROM bot_versions WHERE bot_id=? ORDER BY number DESC LIMIT 10", [botId],
    ).map((v) => ({ number: v.number, summary: v.summary, createdBy: v.created_by, createdAt: v.created_at, live: v.id === b.current_version_id })),
  };
}
