// HTTP tools imported from OpenAPI: config { method, baseUrl, path, params: [{name,in}], hasBody }
import type { ToolImpl } from "./types.ts";
import { credentials } from "../config.ts";
import { run, get, all, id as newId, json, decryptJson, logEvent } from "@threadline/db";
import type { ToolSpec } from "../config.ts";
import { specToTools, loadSpec } from "../ingest/openapi.ts";
import { listMcpTools, withMcp } from "./mcp.ts";

export function applyAuth(cred: any, headers: Record<string, string>, url: URL) {
  if (!cred) return;
  const c = cred.auth ?? cred;
  if (c.type === "bearer" && c.token) headers.authorization = `Bearer ${c.token}`;
  else if (c.type === "header" && c.name) headers[c.name.toLowerCase()] = String(c.value ?? "");
  else if (c.type === "query" && c.name) url.searchParams.set(c.name, String(c.value ?? ""));
  else if (c.type === "basic" && c.username) headers.authorization = "Basic " + Buffer.from(`${c.username}:${c.password ?? ""}`).toString("base64");
}

export function buildRequest(cfg: any, input: any, cred: any) {
  let path = String(cfg.path);
  const url = new URL((cfg.baseUrl || "").replace(/\/$/, "") + "/");
  const headers: Record<string, string> = { accept: "application/json", "user-agent": "Threadline/0.1" };
  for (const p of cfg.params ?? []) {
    const v = input?.[p.name];
    if (v === undefined || v === null || v === "") continue;
    if (p.in === "path") path = path.replace(`{${p.name}}`, encodeURIComponent(String(v)));
    else if (p.in === "query") (Array.isArray(v) ? v : [v]).forEach((x) => url.searchParams.append(p.name, String(x)));
    else if (p.in === "header") headers[p.name.toLowerCase()] = String(v);
  }
  const full = new URL(url.pathname.replace(/\/$/, "") + path + url.search, url.origin);
  url.searchParams.forEach((v, k) => full.searchParams.set(k, v));
  applyAuth(cred, headers, full);
  let body: string | undefined;
  if (cfg.hasBody && input?.body !== undefined) { body = JSON.stringify(input.body); headers["content-type"] = "application/json"; }
  return { method: String(cfg.method || "GET").toUpperCase(), url: full.toString(), headers, body };
}

export const httpImpl: ToolImpl = async (input, ctx, spec) => {
  if (spec.config?.connectionId) return connectionImpl(input, ctx, spec);
  const req = buildRequest(spec.config, input, credentials(ctx.botId));
  if (ctx.dryRun && req.method !== "GET") return { dryRun: true, request: { method: req.method, url: req.url, body: req.body ? JSON.parse(req.body) : undefined } };
  const r = await fetch(req.url, { method: req.method, headers: req.headers, body: req.body, signal: AbortSignal.timeout(15_000) });
  const text = await r.text();
  let data: unknown = text;
  try { data = JSON.parse(text); } catch { /* not json */ }
  if (typeof data === "string" && data.length > 4000) data = data.slice(0, 4000) + "…";
  if (Array.isArray(data) && data.length > 25) data = { items: data.slice(0, 25), truncated: data.length };
  return { status: r.status, ok: r.ok, data };
};

// ───────── inspect: tools from a validated bot_connections row (added after the bot was built) ─────────
// Tools are materialised into `tools` (kind=http, config.connectionId) so the draft/Test and the next deployed
// version pick them up like any other tool. Credentials stay in bot_connections.key_encrypted and are resolved at
// call time — they never land in tools.config_json or a version snapshot.

export interface ConnectionRow {
  id: string; bot_id: string; name: string; address: string; kind: "plain" | "openapi" | "mcp"; auth_kind: string;
  key_encrypted: string | null; can_write: number; validated_at: string | null; last_error: string | null; created_at: string;
  auth_name: string | null; spec_url: string | null; test_path: string | null; tool_count: number;
}

export function connectionAuth(row: Pick<ConnectionRow, "key_encrypted">): any {
  return row.key_encrypted ? decryptJson<any>(row.key_encrypted, null) ?? {} : {};
}

/** Headers for an MCP connection (auth applied the same way as for HTTP). */
export function mcpHeaders(cred: any, address: string): { url: string; headers: Record<string, string> } {
  const headers: Record<string, string> = {};
  const url = new URL(address);
  applyAuth(cred, headers, url);
  return { url: url.toString(), headers };
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 24) || "api";
const READ_NAME = /^(get|list|search|read|fetch|find|query|lookup|describe|show|check|count|retrieve)/i;

/** Build the ToolSpecs a connection exposes. Read-only connections (can_write=0) only get reads. */
export async function connectionTools(row: ConnectionRow, opts: { spec?: any } = {}): Promise<ToolSpec[]> {
  const prefix = slug(row.name);
  const canWrite = !!row.can_write;
  const base = { connectionId: row.id, connection: row.name };
  if (row.kind === "openapi") {
    const spec = opts.spec ?? await loadSpec(row.spec_url || row.address);
    const specUrl = row.spec_url || row.address;
    // the spec's own server URL wins; a relative/missing one falls back to the address the owner typed
    const { tools } = specToTools(spec, { specUrl });
    return tools.filter((t) => canWrite || t.config.method === "GET").slice(0, 40).map((t) => ({
      ...t, config: { ...t.config, baseUrl: t.config.baseUrl || addressBase(row.address), ...base, via: "openapi" },
    }));
  }
  if (row.kind === "mcp") {
    const { url, headers } = mcpHeaders(connectionAuth(row), row.address);
    const tools = await listMcpTools(url, headers);
    return tools
      .filter((t) => canWrite || t.annotations?.readOnlyHint === true || (t.annotations?.readOnlyHint !== false && READ_NAME.test(t.name)))
      .slice(0, 40).map((t) => {
        const readOnly = t.annotations?.readOnlyHint === true || READ_NAME.test(t.name);
        return {
          name: t.name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60), description: (t.description ?? t.name).slice(0, 900), kind: "http" as const,
          input_schema: t.inputSchema ?? { type: "object", properties: {} }, enabled: true, requires_confirmation: !readOnly,
          config: { ...base, via: "mcp", toolName: t.name, readOnly },
        };
      });
  }
  // plain API: one generic read tool (+ one write tool when allowed), scoped to the address
  const where = addressBase(row.address);
  const out: ToolSpec[] = [{
    name: `${prefix}_get`, kind: "http", enabled: true, requires_confirmation: false,
    description: `Read data from ${row.name} (${where}) with a GET request. Pass the path relative to ${where}, e.g. "/" or "/items/42", and optional query parameters. Read-only.`,
    input_schema: { type: "object", properties: {
      path: { type: "string", description: `path under ${where}, starting with /` },
      query: { type: "object", description: "query-string parameters", additionalProperties: { type: "string" } },
    }, required: ["path"] },
    config: { ...base, via: "plain", method: "GET", baseUrl: where },
  }];
  if (canWrite) out.push({
    name: `${prefix}_change`, kind: "http", enabled: true, requires_confirmation: true,
    description: `Change something in ${row.name} (${where}) with a POST/PUT/PATCH/DELETE request. Only when the customer clearly asked for it.`,
    input_schema: { type: "object", properties: {
      method: { type: "string", enum: ["POST", "PUT", "PATCH", "DELETE"] },
      path: { type: "string", description: `path under ${where}, starting with /` },
      body: { type: "object", description: "JSON body" },
    }, required: ["method", "path"] },
    config: { ...base, via: "plain", method: "ANY", baseUrl: where },
  });
  return out;
}

/** Address with trailing slash and any query string removed: the root every plain-API path hangs off. */
export function addressBase(address: string): string {
  const u = new URL(address);
  return (u.origin + u.pathname).replace(/\/$/, "");
}

/** Replace this connection's tools in the draft. Name clashes with other tools get a _2, _3… suffix. */
export function writeConnectionTools(botId: string, connectionId: string, tools: ToolSpec[]): string[] {
  run("DELETE FROM tools WHERE bot_id=? AND json_extract(config_json,'$.connectionId')=?", [botId, connectionId]);
  const taken = new Set(all<{ name: string }>("SELECT name FROM tools WHERE bot_id=?", [botId]).map((r) => r.name.toLowerCase()));
  const names: string[] = [];
  for (const t of tools) {
    let name = t.name, n = 2;
    while (taken.has(name.toLowerCase())) name = `${t.name.slice(0, 56)}_${n++}`;
    taken.add(name.toLowerCase());
    names.push(name);
    run("INSERT INTO tools(id,bot_id,name,description,kind,input_schema_json,config_json,enabled,requires_confirmation) VALUES (?,?,?,?,?,?,?,?,?)",
      [newId("tl_"), botId, name, t.description, t.kind, json.str(t.input_schema), json.str(t.config), t.enabled ? 1 : 0, t.requires_confirmation ? 1 : 0]);
  }
  run("UPDATE bot_connections SET tool_count=? WHERE id=?", [names.length, connectionId]);
  run("UPDATE bots SET draft_dirty=1, updated_at=datetime('now') WHERE id=?", [botId]);
  return names;
}

/** Re-read a connection (spec / MCP tool list) and refresh its tools in the draft. */
export async function syncConnectionTools(connectionId: string, opts: { spec?: any } = {}): Promise<string[]> {
  const row = get<ConnectionRow>("SELECT * FROM bot_connections WHERE id=?", [connectionId]);
  if (!row) throw new Error("connection not found");
  const tools = await connectionTools(row, opts);
  return writeConnectionTools(row.bot_id, row.id, tools);
}

async function connectionImpl(input: any, ctx: Parameters<ToolImpl>[1], spec: ToolSpec): Promise<unknown> {
  const cfg = spec.config;
  const row = get<ConnectionRow>("SELECT * FROM bot_connections WHERE id=? AND bot_id=?", [cfg.connectionId, ctx.botId]);
  if (!row) return { ok: false, error: `The connection "${cfg.connection ?? "?"}" was removed from this bot.` };
  const cred = connectionAuth(row);
  if (cfg.via === "mcp") {
    const { url, headers } = mcpHeaders(cred, row.address);
    if (ctx.dryRun && !cfg.readOnly) return { dryRun: true, tool: cfg.toolName };
    return withMcp(url, headers, async (c) => {
      const res = await c.callTool({ name: cfg.toolName, arguments: input ?? {} });
      const text = (res.content ?? []).map((b: any) => (b.type === "text" ? b.text : `[${b.type}]`)).join("\n");
      return { isError: !!res.isError, content: text.slice(0, 6000), structured: res.structuredContent };
    });
  }
  let req: { method: string; url: string; headers: Record<string, string>; body?: string };
  if (cfg.via === "plain") {
    const method = cfg.method === "ANY" ? String(input?.method || "POST").toUpperCase() : "GET";
    const path = "/" + String(input?.path ?? "/").replace(/^\/+/, "");
    const url = new URL(String(cfg.baseUrl).replace(/\/$/, "") + path);
    if (url.origin !== new URL(cfg.baseUrl).origin) return { ok: false, error: "path must stay on the connected address" };
    for (const [k, v] of Object.entries(input?.query ?? {})) url.searchParams.set(k, String(v));
    const headers: Record<string, string> = { accept: "application/json", "user-agent": "Threadline/0.1" };
    applyAuth(cred, headers, url);
    let body: string | undefined;
    if (method !== "GET" && input?.body !== undefined) { body = JSON.stringify(input.body); headers["content-type"] = "application/json"; }
    req = { method, url: url.toString(), headers, body };
  } else req = buildRequest(cfg, input, cred);
  if (ctx.dryRun && req.method !== "GET") return { dryRun: true, request: { method: req.method, url: redactUrl(req.url, cred) } };
  const r = await fetch(req.url, { method: req.method, headers: req.headers, body: req.body, signal: AbortSignal.timeout(15_000) });
  const text = await r.text();
  let data: unknown = text;
  try { data = JSON.parse(text); } catch { /* not json */ }
  if (typeof data === "string" && data.length > 4000) data = data.slice(0, 4000) + "…";
  if (Array.isArray(data) && data.length > 25) data = { items: data.slice(0, 25), truncated: data.length };
  else if (data && typeof data === "object" && json.str(data).length > 12000) data = json.str(data).slice(0, 12000) + "…";
  if (!r.ok) logEvent(ctx.botId, "connection_error", { connectionId: row.id, status: r.status, isTest: ctx.isTest });
  return { status: r.status, ok: r.ok, data };
}

/** Never echo a key that lives in the query string. */
export function redactUrl(u: string, cred: any): string {
  const c = cred?.auth ?? cred;
  if (c?.type !== "query" || !c.name) return u;
  const url = new URL(u);
  if (url.searchParams.has(c.name)) url.searchParams.set(c.name, "****");
  return url.toString();
}
