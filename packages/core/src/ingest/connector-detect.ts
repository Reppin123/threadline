// "Connect an app or server" (inspect): given an address + optional key, work out WHAT it is (MCP server over
// Streamable HTTP / OpenAPI description / plain API) and HOW it signs in (bearer / key in a header / user+password /
// key in the address / none / OAuth), validate with one harmless GET, then save a bot_connections row whose tools the
// bot can call straight away (tools/http.ts turns the row into tools). Detection reports its best guess + the
// alternatives so the UI can show "Detected: X" with an override dropdown.
import YAML from "yaml";
import { run, get, all, id, encryptJson } from "@threadline/db";
import {
  applyAuth, connectionAuth, connectionTools, writeConnectionTools, addressBase, redactUrl, type ConnectionRow,
} from "../tools/http.ts";

export type ConnKind = "plain" | "openapi" | "mcp";
export type AuthKind = "none" | "bearer" | "header" | "basic" | "query" | "oauth";
export const KIND_LABEL: Record<ConnKind, string> = { plain: "Plain API (tools call it)", openapi: "API description (OpenAPI)", mcp: "MCP server (Streamable HTTP)" };
export const AUTH_LABEL: Record<AuthKind, string> = {
  header: "Key in a header", bearer: "Bearer token", basic: "User and password", query: "Key in the address (?api_key=)", none: "No key", oauth: "Sign in (OAuth)",
};

export interface DetectInput {
  address: string;
  key?: string;                       // raw secret; for user+password use "user:password"
  kind?: ConnKind | "detect";
  auth?: AuthKind | "detect";
  authName?: string;                  // header / query-param name override (default detected, else x-api-key / api_key)
  testPath?: string;                  // "Test with a GET to" — a path (or full URL on the same host) for one harmless read
  canWrite?: boolean;                 // "Can change things": off = read-only tools only
  name?: string;
  timeoutMs?: number;
}

export interface DetectResult {
  address: string;                    // normalised
  kind: ConnKind; kindAlternatives: ConnKind[]; kindEvidence: string; kindForced: boolean;
  auth: AuthKind; authAlternatives: AuthKind[]; authEvidence: string; authForced: boolean; authName?: string;
  authConfirmed: boolean;             // the endpoint rejected no-key and accepted this scheme
  specUrl?: string; title?: string;
  test: { url: string; status: number; ok: boolean; sample: string } | null;
  ok: boolean;                        // validated: safe to save
  error?: string;
  tools: { name: string; description: string; method?: string; write: boolean }[];
}

const ALL_KINDS: ConnKind[] = ["mcp", "openapi", "plain"];
const ALL_AUTH: AuthKind[] = ["bearer", "header", "basic", "query", "none", "oauth"];
const HEADER_NAMES = ["x-api-key", "api-key", "apikey"];
const QUERY_NAMES = ["api_key", "apikey", "key"];
const UA = "Threadline/0.1 (+connector check)";

// ───────── small HTTP helpers ─────────

export function normaliseAddress(a: string): string {
  let s = String(a ?? "").trim();
  if (!s) throw new Error("Enter an address");
  if (!/^https?:\/\//i.test(s)) s = (/^(localhost|127\.|\[::1\])/.test(s) ? "http://" : "https://") + s;
  const u = new URL(s);
  if (!/^https?:$/.test(u.protocol)) throw new Error("Address must start with http:// or https://");
  return u.toString().replace(/\/$/, "");
}

/** Production guard against pointing the server at itself / the cloud metadata service (hostname literals only). */
export function assertPublicAddress(address: string) {
  if (process.env.NODE_ENV !== "production" || process.env.THREADLINE_ALLOW_PRIVATE_CONNECTIONS === "1") return;
  const h = new URL(address).hostname.replace(/^\[|\]$/g, "");
  if (/^(localhost|0\.0\.0\.0|::1?|.*\.local|.*\.internal)$/i.test(h) || /^(127|10)\./.test(h) || /^192\.168\./.test(h)
    || /^169\.254\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || /^f[cd][0-9a-f]{2}:/i.test(h))
    throw new Error("That address is on a private network. Use a public address.");
}

interface Probe { status: number; type: string; text: string; headers: Headers; url: string }
async function probe(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Probe> {
  const r = await fetch(url, { redirect: "follow", ...init, headers: { "user-agent": UA, ...(init.headers as any) }, signal: AbortSignal.timeout(init.timeoutMs ?? 8000) });
  const text = await r.text();
  return { status: r.status, type: r.headers.get("content-type") ?? "", text, headers: r.headers, url: r.url || url };
}

/** The credential object stored (encrypted) and used by tools/http.ts applyAuth. */
export function credFor(auth: AuthKind, key: string | undefined, name?: string): any {
  const k = key ?? "";
  if (auth === "bearer") return { auth: { type: "bearer", token: k } };
  if (auth === "header") return { auth: { type: "header", name: name || "x-api-key", value: k } };
  if (auth === "query") return { auth: { type: "query", name: name || "api_key", value: k } };
  if (auth === "basic") { const i = k.indexOf(":"); return { auth: { type: "basic", username: i >= 0 ? k.slice(0, i) : k, password: i >= 0 ? k.slice(i + 1) : "" } }; }
  return {};
}

function authed(url: string, cred: any): { url: string; headers: Record<string, string> } {
  const u = new URL(url);
  const headers: Record<string, string> = {};
  applyAuth(cred, headers, u);
  return { url: u.toString(), headers };
}

const okStatus = (s: number) => s >= 200 && s < 300;
const denied = (s: number) => s === 401 || s === 403;

// ───────── protocol probes ─────────

/** MCP Streamable HTTP handshake: JSON-RPC initialize, answered as JSON or as an SSE event. */
export async function mcpHandshake(address: string, cred: any, timeoutMs = 8000): Promise<{ status: number; isMcp: boolean; server?: string; oauth?: boolean }> {
  const { url, headers } = authed(address, cred);
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "threadline-detect", version: "0.1.0" } } });
  let p: Probe;
  try {
    p = await probe(url, { method: "POST", body, timeoutMs, headers: { ...headers, "content-type": "application/json", accept: "application/json, text/event-stream" } });
  } catch { return { status: 0, isMcp: false }; }
  const wwwAuth = p.headers.get("www-authenticate") ?? "";
  if (denied(p.status)) return { status: p.status, isMcp: /resource_metadata|mcp/i.test(wwwAuth), oauth: /resource_metadata/i.test(wwwAuth) };
  let msg: any = null;
  if (/event-stream/.test(p.type)) {
    for (const line of p.text.split(/\r?\n/)) if (line.startsWith("data:")) { try { msg = JSON.parse(line.slice(5).trim()); break; } catch { /* next */ } }
  } else { try { msg = JSON.parse(p.text); } catch { /* not json */ } }
  const isMcp = !!(msg && msg.jsonrpc === "2.0" && (msg.result?.protocolVersion || msg.result?.serverInfo || msg.result?.capabilities));
  const sid = p.headers.get("mcp-session-id");
  if (sid) fetch(url, { method: "DELETE", headers: { ...headers, "mcp-session-id": sid }, signal: AbortSignal.timeout(3000) }).catch(() => {});
  return { status: p.status, isMcp, server: msg?.result?.serverInfo?.name };
}

function parseSpec(text: string): any | null {
  let doc: any = null;
  try { doc = JSON.parse(text); } catch { try { doc = YAML.parse(text); } catch { return null; } }
  return doc && typeof doc === "object" && (doc.openapi || doc.swagger) && doc.paths && typeof doc.paths === "object" ? doc : null;
}

export function specCandidates(address: string): string[] {
  const u = new URL(address);
  const here = (u.origin + u.pathname).replace(/\/$/, "");
  const out = [address];
  for (const p of ["/openapi.json", "/swagger.json", "/openapi.yaml", "/v3/api-docs", "/swagger/v1/swagger.json", "/api-docs"]) {
    out.push(here + p);
    out.push(u.origin + p);
  }
  return [...new Set(out)];
}

/** Look for an OpenAPI/Swagger doc at the address itself, then at common paths (address-relative, then host root). */
export async function findOpenApi(address: string, cred: any, timeoutMs = 8000): Promise<{ specUrl: string; spec: any; tried: string[] } | { specUrl: null; tried: string[]; denied: boolean }> {
  const tried: string[] = [];
  let sawDenied = false;
  for (const c of specCandidates(address)) {
    tried.push(c);
    for (const withCred of [false, true]) {
      if (withCred && !cred?.auth) break;
      try {
        const { url, headers } = withCred ? authed(c, cred) : { url: c, headers: {} };
        const p = await probe(url, { timeoutMs, headers: { ...headers, accept: "application/json, application/yaml, text/yaml, */*" } });
        if (denied(p.status)) { sawDenied = true; continue; }
        if (!okStatus(p.status) || p.text.length > 8_000_000) break;
        const spec = parseSpec(p.text);
        if (spec) return { specUrl: c, spec, tried };
        break;
      } catch { break; }
    }
  }
  return { specUrl: null, tried, denied: sawDenied };
}

/** What the OpenAPI doc itself says about auth (first scheme wins). */
export function specAuth(spec: any): { auth: AuthKind; name?: string } | null {
  const schemes: Record<string, any> = spec?.components?.securitySchemes ?? spec?.securityDefinitions ?? {};
  const s = Object.values(schemes)[0];
  if (!s) return null;
  if (s.type === "apiKey") return s.in === "query" ? { auth: "query", name: s.name } : s.in === "header" ? (String(s.name).toLowerCase() === "authorization" ? { auth: "bearer" } : { auth: "header", name: s.name }) : null;
  if (s.type === "http") return /bearer/i.test(s.scheme) ? { auth: "bearer" } : /basic/i.test(s.scheme) ? { auth: "basic" } : null;
  if (s.type === "basic") return { auth: "basic" };
  if (s.type === "oauth2" || s.type === "openIdConnect") return { auth: "oauth" };
  return null;
}

/** First GET operation without required params — a harmless read to validate against. */
function specTestPath(spec: any): string | null {
  for (const [path, item] of Object.entries<any>(spec?.paths ?? {})) {
    const op = item?.get;
    if (!op || path.includes("{")) continue;
    const params = [...(item.parameters ?? []), ...(op.parameters ?? [])];
    if (params.some((p: any) => p?.required && !p.$ref)) continue;
    return path;
  }
  return null;
}

function testUrlFor(address: string, kind: ConnKind, testPath: string | undefined, apiBase: string): string {
  if (testPath?.trim()) {
    const t = testPath.trim();
    if (/^https?:\/\//i.test(t)) {
      if (new URL(t).origin !== new URL(apiBase).origin) throw new Error("The test GET must be on the same host as the address");
      return t;
    }
    return apiBase.replace(/\/$/, "") + "/" + t.replace(/^\/+/, "");
  }
  return kind === "plain" ? address : apiBase;
}

// ───────── auth detection ─────────

type AuthTry = { auth: AuthKind; name?: string };
function authOrder(key: string | undefined, hint: AuthTry | null, nameOverride?: string): AuthTry[] {
  if (!key) return [{ auth: "none" }];
  const tries: AuthTry[] = [];
  if (hint && hint.auth !== "none" && hint.auth !== "oauth") tries.push(hint);
  const looksUserPass = /^[^\s:]{1,64}:[^\s]+$/.test(key) && !/^(sk|pk|ghp|gho|xox|key)[-_]/i.test(key);
  if (looksUserPass) tries.push({ auth: "basic" });
  tries.push({ auth: "bearer" });
  for (const n of nameOverride ? [nameOverride] : HEADER_NAMES) tries.push({ auth: "header", name: n });
  for (const n of nameOverride ? [nameOverride] : QUERY_NAMES) tries.push({ auth: "query", name: n });
  if (!looksUserPass) tries.push({ auth: "basic" });
  const seen = new Set<string>();
  return tries.filter((t) => { const k = `${t.auth}:${t.name ?? ""}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

async function detectAuthHttp(testUrl: string, key: string | undefined, hint: AuthTry | null, nameOverride: string | undefined, timeoutMs: number) {
  const order = authOrder(key, hint, nameOverride);
  if (!key) {
    const base = await probe(testUrl, { timeoutMs, headers: { accept: "application/json" } });
    return { pick: { auth: (hint?.auth === "oauth" ? "oauth" : "none") as AuthKind }, confirmed: okStatus(base.status), evidence: hint?.auth === "oauth" ? "The API description says it signs in with OAuth" : "No key given, so no sign-in", last: base };
  }
  const base = await probe(testUrl, { timeoutMs, headers: { accept: "application/json" } });
  if (!denied(base.status)) {
    // open endpoint: it can't tell us which scheme is right — use the doc's hint, else bearer (most common)
    const pick = order[0];
    const withKey = await probe(authed(testUrl, credFor(pick.auth, key, pick.name)).url, { timeoutMs, headers: { ...authed(testUrl, credFor(pick.auth, key, pick.name)).headers, accept: "application/json" } });
    // a wrong key on an open endpoint can still be refused; fall back to the first scheme that is accepted
    if (denied(withKey.status)) {
      for (const t of order.slice(1)) {
        const a = authed(testUrl, credFor(t.auth, key, t.name));
        const p = await probe(a.url, { timeoutMs, headers: { ...a.headers, accept: "application/json" } });
        if (!denied(p.status)) return { pick: t, confirmed: okStatus(p.status), evidence: `${AUTH_LABEL[pick.auth]} was refused (${withKey.status}); ${AUTH_LABEL[t.auth]}${t.name ? ` (${t.name})` : ""} was accepted`, last: p };
      }
    }
    return { pick, confirmed: false, evidence: hint && pick === hint ? `The API description says ${AUTH_LABEL[pick.auth]}${pick.name ? ` (${pick.name})` : ""}; the test GET also answers without a key, so we couldn't confirm it` : `The test GET answers without a key too, so we couldn't confirm the scheme; guessing ${AUTH_LABEL[pick.auth]} (most common)`, last: withKey };
  }
  let last = base;
  for (const t of order) {
    const a = authed(testUrl, credFor(t.auth, key, t.name));
    const p = await probe(a.url, { timeoutMs, headers: { ...a.headers, accept: "application/json" } });
    last = p;
    if (!denied(p.status)) return { pick: t, confirmed: true, evidence: `Without a key the test GET was refused (${base.status}); with the key as ${AUTH_LABEL[t.auth]}${t.name ? ` (${t.name})` : ""} it answered ${p.status}`, last: p };
  }
  return { pick: order[0], confirmed: false, evidence: `The test GET refused the key every way we tried (${base.status}). Check the key, or pick how it signs in.`, last };
}

// ───────── main entry ─────────

export async function detectConnector(input: DetectInput): Promise<DetectResult> {
  const timeoutMs = input.timeoutMs ?? 8000;
  const address = normaliseAddress(input.address);
  assertPublicAddress(address);
  const key = input.key?.trim() || undefined;
  const forcedKind = input.kind && input.kind !== "detect" ? input.kind : null;
  const forcedAuth = input.auth && input.auth !== "detect" ? input.auth : null;
  const res: DetectResult = {
    address, kind: "plain", kindAlternatives: [], kindEvidence: "", kindForced: !!forcedKind,
    auth: "none", authAlternatives: [], authEvidence: "", authForced: !!forcedAuth, authConfirmed: false,
    test: null, ok: false, tools: [],
  };
  // credential to use while probing protocol: the forced scheme, else bearer (most MCP servers / modern APIs)
  const probeCred = key ? credFor(forcedAuth ?? "bearer", key, input.authName) : {};

  // 1. protocol — MCP handshake first, then an OpenAPI doc, else a plain API
  let spec: any = null;
  let mcp: Awaited<ReturnType<typeof mcpHandshake>> | null = null;
  if (!forcedKind || forcedKind === "mcp") {
    mcp = await mcpHandshake(address, probeCred, timeoutMs);
    if (!mcp.isMcp && key && denied(mcp.status) && !forcedAuth) {
      for (const t of authOrder(key, null, input.authName).slice(1, 3)) {
        const m = await mcpHandshake(address, credFor(t.auth, key, t.name), timeoutMs);
        if (m.isMcp) { mcp = m; break; }
      }
    }
  }
  if (forcedKind === "mcp" || (!forcedKind && mcp?.isMcp)) {
    res.kind = "mcp";
    res.kindEvidence = forcedKind ? "You chose MCP server" : `Answered the MCP handshake${mcp?.server ? ` as "${mcp.server}"` : ""}`;
    res.title = mcp?.server;
  } else {
    const found = !forcedKind || forcedKind === "openapi" ? await findOpenApi(address, probeCred, timeoutMs) : null;
    if (found?.specUrl) {
      spec = found.spec;
      res.kind = "openapi";
      res.specUrl = found.specUrl;
      res.title = spec.info?.title;
      res.kindEvidence = forcedKind ? `You chose API description; found it at ${found.specUrl}` : `Found an ${spec.openapi ? `OpenAPI ${spec.openapi}` : `Swagger ${spec.swagger}`} description at ${found.specUrl}`;
    } else if (forcedKind === "openapi") {
      res.kind = "openapi";
      res.kindEvidence = "You chose API description";
      res.error = `No OpenAPI/Swagger description found (tried ${found?.tried.length ?? 0} places${found && "denied" in found && found.denied ? "; some needed a key" : ""}).`;
    } else {
      res.kind = "plain";
      res.kindEvidence = forcedKind ? "You chose Plain API" : `No MCP handshake and no OpenAPI description (tried ${found?.tried.length ?? 0} places), so tools call it directly`;
    }
  }
  res.kindAlternatives = ALL_KINDS.filter((k) => k !== res.kind);

  // 2. auth — independently of protocol
  const hint: AuthTry | null = spec ? specAuth(spec) : mcp?.oauth ? { auth: "oauth" } : null;
  if (forcedAuth) {
    res.auth = forcedAuth; res.authName = forcedAuth === "header" || forcedAuth === "query" ? (input.authName || hint?.name || (forcedAuth === "header" ? "x-api-key" : "api_key")) : undefined;
    res.authEvidence = "You chose this";
  }
  const cred = () => credFor(res.auth, key, res.authName);

  if (res.kind === "mcp") {
    if (!forcedAuth) {
      if (!key) { res.auth = mcp?.oauth ? "oauth" : "none"; res.authEvidence = mcp?.oauth ? "The server asks for an OAuth sign-in" : "No key given, so no sign-in"; }
      else {
        const open = await mcpHandshake(address, {}, timeoutMs);
        let picked: AuthTry | null = null;
        for (const t of authOrder(key, null, input.authName)) {
          const m = await mcpHandshake(address, credFor(t.auth, key, t.name), timeoutMs);
          if (m.isMcp && okStatus(m.status)) { picked = t; break; }
        }
        const t = picked ?? { auth: "bearer" as AuthKind };
        res.auth = t.auth; res.authName = t.name;
        res.authConfirmed = !!picked && !open.isMcp;
        res.authEvidence = !picked ? "The server refused the key every way we tried" : open.isMcp ? `The server also answers without a key, so we couldn't confirm; using ${AUTH_LABEL[t.auth]}` : `Refused without a key; accepted it as ${AUTH_LABEL[t.auth]}${t.name ? ` (${t.name})` : ""}`;
      }
    }
    // validate: a real MCP session listing tools (one harmless read)
    try {
      const row = fakeRow(address, res, input, key);
      const tools = await connectionTools(row);
      res.tools = tools.map((t) => ({ name: t.name, description: t.description, write: t.requires_confirmation }));
      res.test = { url: address, status: 200, ok: true, sample: `${tools.length} tools: ${tools.slice(0, 8).map((t) => t.name).join(", ")}` };
      res.ok = res.auth !== "oauth";
    } catch (e) {
      res.test = { url: address, status: mcp?.status ?? 0, ok: false, sample: "" };
      res.error = `Couldn't list the server's tools: ${(e as Error).message}`;
    }
  } else {
    const apiBase = res.kind === "openapi" ? (specBase(spec, res.specUrl!) || addressBase(address)) : addressBase(address);
    let testUrl: string;
    try {
      testUrl = testUrlFor(address, res.kind, input.testPath || (spec ? specTestPath(spec) ?? undefined : undefined), apiBase);
    } catch (e) { res.error = (e as Error).message; res.authAlternatives = ALL_AUTH.filter((a) => a !== res.auth); return res; }
    try {
      let last: Probe;
      if (!forcedAuth) {
        const d = await detectAuthHttp(testUrl, key, hint, input.authName, timeoutMs);
        res.auth = d.pick.auth; res.authName = d.pick.name; res.authConfirmed = d.confirmed && !!key; res.authEvidence = d.evidence;
        last = d.last;
      } else {
        const a = authed(testUrl, cred());
        last = await probe(a.url, { timeoutMs, headers: { ...a.headers, accept: "application/json" } });
      }
      // final validation GET with exactly what will be saved
      if (forcedAuth || !okStatus(last.status)) {
        const a = authed(testUrl, cred());
        last = await probe(a.url, { timeoutMs, headers: { ...a.headers, accept: "application/json" } });
      }
      res.test = { url: redactUrl(testUrl, cred()), status: last.status, ok: okStatus(last.status), sample: last.text.replace(/\s+/g, " ").slice(0, 300) };
      if (!res.test.ok) res.error ??= `The test GET to ${res.test.url} answered ${last.status}${denied(last.status) ? " (the key was refused)" : ""}.`;
    } catch (e) {
      res.test = { url: testUrl, status: 0, ok: false, sample: "" };
      res.error = `Couldn't reach ${testUrl}: ${(e as Error).message}`;
    }
    if (res.auth === "oauth") res.error = "Sign in (OAuth) isn't supported yet. Use an API key or token instead.";
    if (res.kind === "openapi" && !spec) { /* forced openapi without a doc: error already set */ }
    else {
      try {
        const tools = await connectionTools(fakeRow(address, res, input, key), { spec });
        res.tools = tools.map((t) => ({ name: t.name, description: t.description, method: t.config?.method, write: t.requires_confirmation }));
        if (!tools.length && !res.error) res.error = "The API description has no read operations. Turn on \"Can change things\" to use its write operations.";
      } catch (e) { res.error ??= `Couldn't build tools: ${(e as Error).message}`; }
    }
    res.ok = !res.error && !!res.test?.ok && res.tools.length > 0;
  }
  res.authAlternatives = ALL_AUTH.filter((a) => a !== res.auth);
  return res;
}

function specBase(spec: any, specUrl: string): string {
  let b = spec?.servers?.[0]?.url ?? (spec?.host ? `${spec.schemes?.[0] ?? "https"}://${spec.host}${spec.basePath ?? ""}` : "");
  if (!b) return "";
  if (!/^https?:/.test(b)) b = new URL(b, specUrl).toString();
  return b.replace(/\/$/, "");
}

function fakeRow(address: string, r: DetectResult, input: DetectInput, key: string | undefined): ConnectionRow {
  return {
    id: "preview", bot_id: "preview", name: connectionName(input, r), address, kind: r.kind, auth_kind: r.auth,
    key_encrypted: key && r.auth !== "none" ? encryptJson(credFor(r.auth, key, r.authName)) : null,
    can_write: input.canWrite ? 1 : 0, validated_at: null, last_error: null, created_at: "", auth_name: r.authName ?? null,
    spec_url: r.specUrl ?? null, test_path: input.testPath ?? null, tool_count: 0,
  };
}

function connectionName(input: DetectInput, r: DetectResult): string {
  const n = input.name?.trim() || r.title?.trim();
  if (n) return n.slice(0, 40);
  const host = new URL(r.address).hostname.replace(/^(www|api)\./, "");
  return host.split(".")[0] || "api";
}

// ───────── persistence (bot_connections) ─────────

export type AddConnectionInput = DetectInput;
export interface SafeConnection {
  id: string; name: string; address: string; kind: ConnKind; authKind: AuthKind; authName: string | null; keySet: boolean; canWrite: boolean;
  validatedAt: string | null; lastError: string | null; createdAt: string; specUrl: string | null; testPath: string | null; toolCount: number; tools: string[];
}

/** Detect (honouring the owner's overrides), validate, and only then write the row + its tools. */
export async function addConnection(botId: string, input: AddConnectionInput): Promise<{ ok: true; connection: SafeConnection; detect: DetectResult } | { ok: false; error: string; detect?: DetectResult }> {
  let d: DetectResult;
  try { d = await detectConnector(input); }
  catch (e) { return { ok: false, error: (e as Error).message }; }
  if (!d.ok) return { ok: false, error: d.error ?? "The connection didn't validate.", detect: d };
  const key = input.key?.trim() || undefined;
  const cid = id("cn_");
  const name = connectionName(input, d);
  run(`INSERT INTO bot_connections(id,bot_id,name,address,kind,auth_kind,key_encrypted,can_write,validated_at,last_error,auth_name,spec_url,test_path)
       VALUES (?,?,?,?,?,?,?,?,datetime('now'),NULL,?,?,?)`,
    [cid, botId, name, d.address, d.kind, d.auth, key && d.auth !== "none" ? encryptJson(credFor(d.auth, key, d.authName)) : null,
      input.canWrite ? 1 : 0, d.authName ?? null, d.specUrl ?? null, input.testPath?.trim() || null]);
  try {
    const row = get<ConnectionRow>("SELECT * FROM bot_connections WHERE id=?", [cid])!;
    const spec = d.kind === "openapi" && d.specUrl ? (await findOpenApi(d.specUrl, credFor(d.auth, key, d.authName), input.timeoutMs)) : null;
    writeConnectionTools(botId, cid, await connectionTools(row, { spec: spec && spec.specUrl ? spec.spec : undefined }));
  } catch (e) {
    run("DELETE FROM tools WHERE bot_id=? AND json_extract(config_json,'$.connectionId')=?", [botId, cid]);
    run("DELETE FROM bot_connections WHERE id=?", [cid]);
    return { ok: false, error: `Validated, but couldn't add its tools: ${(e as Error).message}`, detect: d };
  }
  return { ok: true, connection: listConnections(botId).find((c) => c.id === cid)!, detect: d };
}

export function listConnections(botId: string): SafeConnection[] {
  const tools = all<{ name: string; cid: string }>("SELECT name, json_extract(config_json,'$.connectionId') cid FROM tools WHERE bot_id=? AND cid IS NOT NULL ORDER BY rowid", [botId]);
  return all<ConnectionRow>("SELECT * FROM bot_connections WHERE bot_id=? ORDER BY created_at, rowid", [botId]).map((r) => ({
    id: r.id, name: r.name, address: r.address, kind: r.kind, authKind: r.auth_kind as AuthKind, authName: r.auth_name, keySet: !!r.key_encrypted,
    canWrite: !!r.can_write, validatedAt: r.validated_at, lastError: r.last_error, createdAt: r.created_at, specUrl: r.spec_url, testPath: r.test_path,
    toolCount: r.tool_count, tools: tools.filter((t) => t.cid === r.id).map((t) => t.name),
  }));
}

export function removeConnection(botId: string, connectionId: string): boolean {
  const r = get("SELECT 1 FROM bot_connections WHERE id=? AND bot_id=?", [connectionId, botId]);
  if (!r) return false;
  run("DELETE FROM tools WHERE bot_id=? AND json_extract(config_json,'$.connectionId')=?", [botId, connectionId]);
  run("DELETE FROM bot_connections WHERE id=?", [connectionId]);
  run("UPDATE bots SET draft_dirty=1, updated_at=datetime('now') WHERE id=?", [botId]);
  return true;
}

/** Re-run the validation GET with the stored settings and refresh the tools (e.g. after a rebuild wiped them). */
export async function recheckConnection(botId: string, connectionId: string): Promise<{ ok: boolean; error?: string; tools: string[] }> {
  const row = get<ConnectionRow>("SELECT * FROM bot_connections WHERE id=? AND bot_id=?", [connectionId, botId]);
  if (!row) return { ok: false, error: "Connection not found", tools: [] };
  const c = connectionAuth(row)?.auth ?? {};
  const key = c.type === "bearer" ? c.token : c.type === "basic" ? `${c.username}:${c.password ?? ""}` : c.value;
  const d = await detectConnector({ address: row.address, key, kind: row.kind, auth: row.auth_kind as AuthKind, authName: row.auth_name ?? undefined, testPath: row.test_path ?? undefined, canWrite: !!row.can_write })
    .catch((e) => ({ ok: false, error: (e as Error).message } as DetectResult));
  if (!d.ok) { run("UPDATE bot_connections SET last_error=? WHERE id=?", [d.error ?? "failed", row.id]); return { ok: false, error: d.error, tools: [] }; }
  run("UPDATE bot_connections SET validated_at=datetime('now'), last_error=NULL WHERE id=?", [row.id]);
  const spec = row.kind === "openapi" && row.spec_url ? await findOpenApi(row.spec_url, connectionAuth(row)) : null;
  const tools = writeConnectionTools(botId, row.id, await connectionTools(row, { spec: spec && spec.specUrl ? spec.spec : undefined }));
  return { ok: true, tools };
}
