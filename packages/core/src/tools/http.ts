// HTTP tools imported from OpenAPI: config { method, baseUrl, path, params: [{name,in}], hasBody }
import type { ToolImpl } from "./types.ts";
import { credentials } from "../config.ts";

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
