// Mock tools for idea-only bots: CRUD over mock_records collections so the bot works before real APIs exist.
import { run, all, get, id, json } from "@threadline/db";
import type { ToolImpl } from "./types.ts";

// config: { collection, op: "list"|"search"|"get"|"create"|"update", idField? }
export const mockImpl: ToolImpl = async (input, ctx, spec) => {
  const { collection, op } = spec.config ?? {};
  const rows = () => all<{ id: string; data_json: string }>("SELECT id,data_json FROM mock_records WHERE bot_id=? AND collection=?", [ctx.botId, collection])
    .map((r) => ({ _id: r.id, ...json.parse<Record<string, unknown>>(r.data_json, {}) }));
  const matches = (r: Record<string, unknown>) => {
    const filters = Object.entries(input ?? {}).filter(([k, v]) => v !== undefined && v !== "" && !["confirmed", "data", "query", "limit"].includes(k));
    return filters.every(([k, v]) => String(r[k] ?? "").toLowerCase().includes(String(v).toLowerCase()));
  };
  switch (op) {
    case "list":
    case "search": {
      const q = String(input?.query ?? "").toLowerCase();
      const out = rows().filter((r) => matches(r) && (!q || JSON.stringify(r).toLowerCase().includes(q)));
      return { results: out.slice(0, Number(input?.limit ?? 20)), total: out.length };
    }
    case "get": {
      const key = Object.values(input ?? {})[0];
      const r = rows().find((x) => x._id === key || Object.values(x).some((v) => String(v).toLowerCase() === String(key).toLowerCase()));
      return r ?? { error: "not found" };
    }
    case "create": {
      const data = { ...(input?.data ?? input ?? {}) };
      delete (data as any).confirmed;
      if (ctx.dryRun) return { ok: true, dryRun: true, would_create: data };
      const rid = id("mr_");
      run("INSERT INTO mock_records(id,bot_id,collection,data_json) VALUES (?,?,?,?)", [rid, ctx.botId, collection, json.str({ ...data, created_at: new Date().toISOString() })]);
      return { ok: true, id: rid, record: data };
    }
    case "update": {
      const rid = String(input?.id ?? input?._id ?? "");
      const r = get<{ data_json: string }>("SELECT data_json FROM mock_records WHERE id=? AND bot_id=?", [rid, ctx.botId]);
      if (!r) return { ok: false, error: "not found" };
      const data = { ...json.parse<Record<string, unknown>>(r.data_json, {}), ...(input?.data ?? {}) };
      if (!ctx.dryRun) run("UPDATE mock_records SET data_json=? WHERE id=?", [json.str(data), rid]);
      return { ok: true, record: data };
    }
    default:
      return { error: `unknown mock op ${op}` };
  }
};
