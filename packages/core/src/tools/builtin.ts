// Builtin tools every bot gets (stored as tools rows with kind=builtin so the owner can see/disable them).
import { run, id, logEvent } from "@threadline/db";
import type { ToolSpec, TableSpec } from "../config.ts";
import type { ToolImpl } from "./types.ts";
import { searchKnowledge } from "../knowledge.ts";
import { getMemories, setMemory } from "../memory.ts";
import { tableId, insertRow, updateRow, findRows } from "../tables.ts";
import { fetchText } from "../ingest/website.ts";
import { extractPage } from "../ingest/extract.ts";

const obj = (properties: Record<string, any>, required: string[] = []) => ({ type: "object", properties, required });

export function builtinToolSpecs(opts: { tables: TableSpec[]; webAccess: boolean }): ToolSpec[] {
  const tableNames = opts.tables.map((t) => t.name);
  const tableDesc = opts.tables.map((t) => `${t.name} (${t.filled_by === "bot" ? "you fill it" : "owner fills it, read-only for you"}; columns: ${t.columns.map((c) => c.name).join(", ")})`).join("; ");
  const specs: ToolSpec[] = [
    { name: "search_knowledge", description: "Search the business's knowledge base (website pages, FAQs, policies, product catalog). Use when the info you need isn't already in context.",
      input_schema: obj({ query: { type: "string" } }, ["query"]) },
    { name: "remember_fact", description: "Save a durable fact about THIS customer for future chats (e.g. name, address, phone, preferences, allergies).",
      input_schema: obj({ key: { type: "string", description: "short key like name, address, favourite_tea" }, value: { type: "string" } }, ["key", "value"]) },
    { name: "recall", description: "Read everything remembered about this customer.", input_schema: obj({}) },
    { name: "handoff_to_human", description: "Escalate to the business owner when the customer asks for a human, is upset, or you cannot resolve the request.",
      input_schema: obj({ reason: { type: "string" }, summary: { type: "string" } }, ["reason"]) },
    { name: "schedule_message", description: "Schedule a follow-up/reminder message to this customer at a later time.",
      input_schema: obj({ send_at: { type: "string", description: "ISO 8601 datetime, or relative like 'in 2 hours' / 'in 3 days'" }, prompt: { type: "string", description: "what the message should say" } }, ["send_at", "prompt"]) },
  ].map((s) => ({ ...s, kind: "builtin" as const, config: {}, enabled: true, requires_confirmation: false }));
  if (tableNames.length) {
    specs.push(
      { name: "save_row", description: `Save a new row in one of the bot's tables. Tables: ${tableDesc}. Only write to tables you fill.`,
        input_schema: obj({ table: { type: "string", enum: tableNames }, data: { type: "object", description: "column → value" } }, ["table", "data"]), kind: "builtin", config: {}, enabled: true, requires_confirmation: false },
      { name: "update_row", description: "Update an existing row (e.g. change an order's status or quantity). Use find_rows first to get row_id.",
        input_schema: obj({ table: { type: "string", enum: tableNames }, row_id: { type: "string" }, data: { type: "object" } }, ["table", "row_id", "data"]), kind: "builtin", config: {}, enabled: true, requires_confirmation: false },
      { name: "find_rows", description: "Look up rows in a table (e.g. this customer's orders, team tasks). mine_only=true limits to this customer's rows.",
        input_schema: obj({ table: { type: "string", enum: tableNames }, query: { type: "string" }, mine_only: { type: "boolean" } }, ["table"]), kind: "builtin", config: {}, enabled: true, requires_confirmation: false },
    );
  }
  if (opts.webAccess) specs.push({ name: "fetch_page", description: "Fetch a public web page and return its readable text (web access is on).",
    input_schema: obj({ url: { type: "string" } }, ["url"]), kind: "builtin", config: {}, enabled: true, requires_confirmation: false });
  return specs;
}

function parseWhen(s: string): Date | null {
  const rel = String(s).match(/in\s+(\d+(?:\.\d+)?)\s*(minute|min|hour|hr|day|week)s?/i);
  if (rel) {
    const n = Number(rel[1]);
    const unit = rel[2].toLowerCase();
    const ms = unit.startsWith("min") ? 60e3 : unit.startsWith("h") ? 3600e3 : unit.startsWith("d") ? 86400e3 : 7 * 86400e3;
    return new Date(Date.now() + n * ms);
  }
  if (/tomorrow/i.test(s)) return new Date(Date.now() + 86400e3);
  const d = new Date(s);
  return isNaN(+d) ? null : d;
}

export const builtinImpls: Record<string, ToolImpl> = {
  async search_knowledge(input, ctx) {
    const hits = await searchKnowledge(ctx.botId, String(input.query ?? ""), 6);
    return hits.length ? hits.map((h) => ({ source: h.url ?? h.title, text: h.text.slice(0, 900) })) : { results: [], note: "Nothing found in the knowledge base." };
  },
  async remember_fact(input, ctx) {
    setMemory(ctx.customerId, String(input.key), String(input.value));
    return { saved: true };
  },
  async recall(_input, ctx) { return getMemories(ctx.customerId); },
  async handoff_to_human(input, ctx) {
    logEvent(ctx.botId, "handoff", { conversationId: ctx.conversationId, reason: input.reason, summary: input.summary, isTest: ctx.isTest });
    run("UPDATE conversations SET outcome='handoff' WHERE id=?", [ctx.conversationId]);
    return { ok: true, note: "The owner has been notified and will reply in this thread." };
  },
  async schedule_message(input, ctx) {
    const when = parseWhen(String(input.send_at ?? ""));
    if (!when) return { ok: false, error: "Could not understand send_at. Use ISO datetime or 'in N hours'." };
    if (ctx.dryRun || ctx.isTest) return { ok: true, scheduled_for: when.toISOString(), note: "test mode: not actually scheduled" };
    const sid = id("sm_");
    run("INSERT INTO scheduled_messages(id,bot_id,customer_id,channel,prompt,send_at) VALUES (?,?,?,?,?,?)",
      [sid, ctx.botId, ctx.customerId, ctx.channel, String(input.prompt), when.toISOString()]);
    return { ok: true, id: sid, scheduled_for: when.toISOString() };
  },
  async save_row(input, ctx) {
    const spec = ctx.config.tables.find((t) => t.name.toLowerCase() === String(input.table).toLowerCase());
    if (spec && spec.filled_by === "owner") return { ok: false, error: `${spec.name} is filled by the owner; you can only read it.` };
    const tid = tableId(ctx.botId, String(input.table), ctx.config.tables);
    if (!tid) return { ok: false, error: `No table named ${input.table}` };
    const data = { ...(input.data ?? {}) };
    if (spec?.columns.some((c) => /placed.?at|created|date/i.test(c.name))) {
      const col = spec.columns.find((c) => /placed.?at|created/i.test(c.name));
      if (col && !data[col.name]) data[col.name] = new Date().toISOString();
    }
    if (spec?.columns.some((c) => c.name.toLowerCase() === "status") && !data.Status && !data.status) data[spec.columns.find((c) => c.name.toLowerCase() === "status")!.name] = "New";
    const rid = insertRow(tid, data, ctx.customerId);
    logEvent(ctx.botId, "row_saved", { table: input.table, rowId: rid, isTest: ctx.isTest });
    return { ok: true, row_id: rid, saved: data };
  },
  async update_row(input, ctx) {
    const tid = tableId(ctx.botId, String(input.table), ctx.config.tables);
    if (!tid) return { ok: false, error: `No table named ${input.table}` };
    const spec = ctx.config.tables.find((t) => t.name.toLowerCase() === String(input.table).toLowerCase());
    const data = updateRow(tid, String(input.row_id), input.data ?? {}, spec?.filled_by === "bot" ? ctx.customerId : null);
    return data ? { ok: true, row: data } : { ok: false, error: "Row not found (or not this customer's)." };
  },
  async find_rows(input, ctx) {
    const tid = tableId(ctx.botId, String(input.table), ctx.config.tables);
    if (!tid) return { ok: false, error: `No table named ${input.table}` };
    const spec = ctx.config.tables.find((t) => t.name.toLowerCase() === String(input.table).toLowerCase());
    const mine = input.mine_only ?? spec?.filled_by === "bot";
    return { rows: findRows(tid, { query: input.query, customerId: mine ? ctx.customerId : null }) };
  },
  async fetch_page(input) {
    const r = await fetchText(String(input.url), 10_000);
    const ex = extractPage(r.text, r.url);
    return { title: ex.title, text: ex.text.slice(0, 4000) };
  },
};

export function hasBuiltin(name: string) { return name in builtinImpls; }
