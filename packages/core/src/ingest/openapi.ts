// OpenAPI 3 / Swagger 2 → one http tool per operation.
import YAML from "yaml";
import type { ToolSpec } from "../config.ts";
import { fetchText } from "./website.ts";

export async function loadSpec(url: string): Promise<any> {
  const accept = "application/json, application/yaml, text/yaml, */*";
  // one retry: public spec hosts are often slow/cold
  const r = await fetchText(url, 20_000, accept).catch(() => fetchText(url, 30_000, accept));
  if (r.status >= 400) throw new Error(`spec ${r.status}`);
  try { return JSON.parse(r.text); } catch { return YAML.parse(r.text); }
}

function deref(spec: any, node: any, depth = 0): any {
  if (!node || typeof node !== "object" || depth > 6) return node;
  if (Array.isArray(node)) return node.map((n) => deref(spec, n, depth + 1));
  if (typeof node.$ref === "string" && node.$ref.startsWith("#/")) {
    const target = node.$ref.slice(2).split("/").reduce((o: any, k: string) => o?.[k.replace(/~1/g, "/").replace(/~0/g, "~")], spec);
    return deref(spec, target ?? {}, depth + 1);
  }
  const out: any = {};
  for (const [k, v] of Object.entries(node)) if (!["xml", "example", "examples"].includes(k)) out[k] = deref(spec, v, depth + 1);
  return out;
}

const toolName = (s: string) => s.replace(/[^a-zA-Z0-9_]+/g, "_").replace(/^_|_$/g, "").slice(0, 60) || "op";

export function specToTools(spec: any, opts: { specUrl?: string; baseUrl?: string } = {}): { tools: ToolSpec[]; baseUrl: string; title: string; description: string } {
  let baseUrl = opts.baseUrl ?? "";
  if (!baseUrl) {
    if (spec.servers?.[0]?.url) baseUrl = spec.servers[0].url;
    else if (spec.host) baseUrl = `${(spec.schemes?.[0] ?? "https")}://${spec.host}${spec.basePath ?? ""}`;
    if (baseUrl && opts.specUrl && !/^https?:/.test(baseUrl)) baseUrl = new URL(baseUrl, opts.specUrl).toString();
  }
  const tools: ToolSpec[] = [];
  const used = new Set<string>();
  for (const [path, item] of Object.entries<any>(spec.paths ?? {})) {
    for (const method of ["get", "post", "put", "patch", "delete"]) {
      const op = item?.[method];
      if (!op) continue;
      let name = toolName(op.operationId ?? `${method}_${path}`);
      while (used.has(name)) name += "_";
      used.add(name);
      const params = [...(item.parameters ?? []), ...(op.parameters ?? [])].map((p: any) => deref(spec, p));
      const properties: Record<string, any> = {};
      const required: string[] = [];
      const plist: { name: string; in: string }[] = [];
      let hasBody = false;
      for (const p of params) {
        if (p.in === "body") { hasBody = true; properties.body = { ...(deref(spec, p.schema) ?? {}), description: p.description ?? "request body" }; if (p.required) required.push("body"); continue; }
        if (!["path", "query", "header"].includes(p.in)) continue;
        const schema = deref(spec, p.schema ?? { type: p.type ?? "string", enum: p.enum, items: p.items });
        properties[p.name] = { ...schema, description: p.description ?? schema.description };
        plist.push({ name: p.name, in: p.in });
        if (p.required || p.in === "path") required.push(p.name);
      }
      const rb = op.requestBody ? deref(spec, op.requestBody) : null;
      if (rb) {
        const schema = rb.content?.["application/json"]?.schema ?? Object.values<any>(rb.content ?? {})[0]?.schema;
        if (schema) { hasBody = true; properties.body = { ...schema, description: rb.description ?? "JSON request body" }; if (rb.required) required.push("body"); }
      }
      const desc = [op.summary, op.description].filter(Boolean).join(" — ") || `${method.toUpperCase()} ${path}`;
      tools.push({
        name, kind: "http", enabled: true, requires_confirmation: method !== "get",
        description: `${desc} (${method.toUpperCase()} ${path})`.slice(0, 900),
        input_schema: { type: "object", properties, required: [...new Set(required)] },
        config: { method: method.toUpperCase(), baseUrl, path, params: plist, hasBody },
      });
    }
  }
  return { tools, baseUrl, title: spec.info?.title ?? "API", description: spec.info?.description ?? "" };
}
