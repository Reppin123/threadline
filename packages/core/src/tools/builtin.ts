// Builtin tools every bot gets (stored as tools rows with kind=builtin so the owner can see/disable them).
import { run, get, logEvent } from "@threadline/db";
import type { ToolSpec, TableSpec } from "../config.ts";
import type { ToolImpl } from "./types.ts";
import { searchKnowledge } from "../knowledge.ts";
import { getMemories, setMemory } from "../memory.ts";
import { tableId, insertRow, updateRow, findRows } from "../tables.ts";
import { fetchText } from "../ingest/website.ts";
import { extractPage } from "../ingest/extract.ts";
import { parseSchedule, insertScheduled, describeRecurrence } from "../schedule.ts";

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
    { name: "schedule_message", description: "Schedule a reminder/follow-up message to this customer, once or recurring. Pass the customer's own wording for when (e.g. 'in 3 days', 'tomorrow at 5pm', 'every Monday at 9am', 'every weekday at 8:30', 'monthly on the 1st'); recurrence is worked out from it. Informational follow-ups only, never promotions.",
      input_schema: obj({
        send_at: { type: "string", description: "When, in natural language or ISO 8601: 'in 2 hours', 'Friday 3pm', 'every Monday at 9am', '2026-11-10T09:00'" },
        prompt: { type: "string", description: "what the message should say / remind them about" },
        repeat: { type: "string", enum: ["none", "daily", "weekly", "monthly"], description: "optional; only if you're sure" },
        days: { type: "string", description: "optional; weekly: 'mon,wed,fri'; monthly: day of month '15'" },
        time: { type: "string", description: "optional wall-clock time like '09:00' or '5pm'" },
        timezone: { type: "string", description: "optional IANA timezone if the customer gave a city/timezone, e.g. America/New_York" },
      }, ["send_at", "prompt"]) },
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
    // The customer's latest message is passed as context: if the model flattened "every Monday at 9am" into one ISO
    // date (or the bot was built with the older one-shot tool schema), the recurrence still comes through.
    const said = get<{ content: string }>("SELECT content FROM messages WHERE conversation_id=? AND role='user' ORDER BY created_at DESC, rowid DESC LIMIT 1", [ctx.conversationId])?.content;
    const sched = parseSchedule({ when: input.send_at ?? input.when, repeat: input.repeat, days: input.days, time: input.time, timezone: input.timezone },
      { defaultTimezone: process.env.SCHEDULER_DEFAULT_TZ, context: said });
    const out = { scheduled_for: sched.first.toISOString(), repeat: sched.repeat ?? "none", schedule: describeRecurrence(sched), timezone: sched.timezone,
      ...(sched.note ? { note: sched.note } : {}) };
    // Checks/simulated users: nothing is persisted. The Build → Test preview (channel 'web') gets a real test row,
    // delivered into the test chat by the worker or the "Send now" chip, never to a real channel.
    if (ctx.dryRun || (ctx.isTest && ctx.channel !== "web")) return { ok: true, ...out, test: "not actually scheduled" };
    const sid = insertScheduled({ botId: ctx.botId, customerId: ctx.customerId, channel: ctx.channel, prompt: String(input.prompt ?? ""), schedule: sched, isTest: ctx.isTest });
    logEvent(ctx.botId, "scheduled_created", { id: sid, repeat: sched.repeat, isTest: ctx.isTest });
    return { ok: true, id: sid, ...out };
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
