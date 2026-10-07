"use server";
import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { all, get, id, json, run, tx, logEvent } from "@threadline/db";
import { core, type WizardAnswer, type ChatResult } from "@threadline/core";
import { requireUser } from "@/lib/auth";
import { getBot } from "@/lib/data";
import { deriveSource, type Missing } from "@/lib/wizard";
import { startBuild, startChecks } from "@/lib/jobs";

function errMsg(e: unknown) {
  return String((e as Error)?.message ?? e).slice(0, 300);
}

// ── Wizard ────────────────────────────────────────────────────────────────
export async function wizardNext(answers: WizardAnswer[]): Promise<{ q: Missing | null; error?: string }> {
  await requireUser();
  try {
    const q = await core.nextWizardQuestion(answers);
    if (q) return { q };
    const d = deriveSource(answers);
    return { q: "missing" in d ? d.missing : null };
  } catch (e) {
    console.error("[web] wizardNext", e);
    const d = deriveSource(answers);
    if (answers.length && "missing" in d) return { q: d.missing };
    if (answers.length) return { q: null };
    return { q: null, error: errMsg(e) };
  }
}

export async function wizardCreate(answers: WizardAnswer[]): Promise<{ error: string } | void> {
  const user = await requireUser();
  const d = deriveSource(answers);
  if ("missing" in d) return { error: d.missing.question };
  let botId: string;
  try {
    ({ botId } = await core.createBot(user.id, d.source, answers));
  } catch (e) {
    console.error("[web] createBot", e);
    return { error: "Couldn't create the bot: " + errMsg(e) };
  }
  startBuild(botId);
  logEvent(botId, "bot_created", { via: "wizard", kind: d.source.kind });
  redirect(`/bots/${botId}/build`);
}

export async function rebuildBot(botId: string) {
  const user = await requireUser();
  getBot(user.id, botId);
  startBuild(botId);
  revalidatePath(`/bots/${botId}/build`);
}

// ── Builder + playground ─────────────────────────────────────────────────
export async function builderSend(botId: string, message: string, threadId: string) {
  const user = await requireUser();
  getBot(user.id, botId);
  const started = new Date(Date.now() - 1000).toISOString().replace("T", " ").slice(0, 19);
  try {
    const r = await core.builderChat(botId, message, threadId);
    // If the core didn't persist the exchange, keep the transcript ourselves.
    const saved = get("SELECT id FROM builder_messages WHERE bot_id=? AND thread_id=? AND role='user' AND content=? AND created_at >= ?", [botId, threadId, message, started]);
    if (!saved) {
      run("INSERT INTO builder_messages(id,bot_id,thread_id,role,content) VALUES (?,?,?,?,?)", [id("bm_"), botId, threadId, "user", message]);
      run("INSERT INTO builder_messages(id,bot_id,thread_id,role,content,suggestions_json) VALUES (?,?,?,?,?,?)", [id("bm_"), botId, threadId, "assistant", r.reply, json.str(r.suggestions)]);
    }
    revalidatePath(`/bots/${botId}/build`);
    return { ok: true as const, reply: r };
  } catch (e) {
    console.error("[web] builderChat", e);
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function playgroundSend(
  botId: string,
  text: string,
  extra: { attachments?: { path: string; mime: string; name: string }[]; location?: { lat: number; lng: number } } = {},
): Promise<{ ok: true; result: ChatResult } | { ok: false; error: string }> {
  const user = await requireUser();
  getBot(user.id, botId);
  try {
    const result = await core.chat({ botId, channel: "web", customerHandle: "owner-preview", customerName: user.name ?? "You", text, isTest: true, ...extra });
    return { ok: true, result };
  } catch (e) {
    console.error("[web] chat", e);
    return { ok: false, error: errMsg(e) };
  }
}

export async function playgroundClear(botId: string) {
  const user = await requireUser();
  getBot(user.id, botId);
  run("DELETE FROM customers WHERE bot_id=? AND channel='web' AND handle='owner-preview'", [botId]);
}

export async function setWebAccess(botId: string, on: boolean) {
  const user = await requireUser();
  getBot(user.id, botId);
  run("UPDATE bots SET web_access=?, draft_dirty=1, updated_at=datetime('now') WHERE id=?", [on ? 1 : 0, botId]);
  revalidatePath(`/bots/${botId}`, "layout");
}

export async function renameBot(botId: string, name: string) {
  const user = await requireUser();
  getBot(user.id, botId);
  const n = name.trim().slice(0, 60);
  if (!n) return;
  run("UPDATE bots SET name=?, updated_at=datetime('now') WHERE id=?", [n, botId]);
  revalidatePath("/", "layout");
}

export async function deleteBot(botId: string) {
  const user = await requireUser();
  getBot(user.id, botId);
  tx(() => {
    run("UPDATE scheduled_messages SET status='cancelled' WHERE bot_id=? AND status='scheduled'", [botId]);
    run("DELETE FROM line_routes WHERE bot_id=?", [botId]);
    run("DELETE FROM bots WHERE id=?", [botId]);
  });
  redirect("/dashboard");
}

// ── Deploy ───────────────────────────────────────────────────────────────
export async function connectChannel(botId: string, channel: "imessage" | "telegram", config?: Record<string, string>) {
  const user = await requireUser();
  getBot(user.id, botId);
  const handle = channel === "imessage" ? process.env.IMESSAGE_LINE_HANDLE || null : null;
  run(
    `INSERT INTO channels(bot_id,channel,status,line_handle,config_json,updated_at) VALUES (?,?,?,?,?,datetime('now'))
     ON CONFLICT(bot_id,channel) DO UPDATE SET status=excluded.status, line_handle=excluded.line_handle, config_json=COALESCE(excluded.config_json, channels.config_json), updated_at=excluded.updated_at`,
    [botId, channel, "live", handle, config ? json.str(config) : null],
  );
  // A bot that is reachable on a channel is live (once it has a deployed version).
  const b = get<{ current_version_id: string | null; status: string }>("SELECT current_version_id,status FROM bots WHERE id=?", [botId])!;
  if (b.current_version_id && b.status === "ready") run("UPDATE bots SET status='live' WHERE id=?", [botId]);
  logEvent(botId, "channel_connected", { channel });
  revalidatePath(`/bots/${botId}`, "layout");
}

export async function disconnectChannel(botId: string, channel: string) {
  const user = await requireUser();
  getBot(user.id, botId);
  run("UPDATE channels SET status='off', updated_at=datetime('now') WHERE bot_id=? AND channel=?", [botId, channel]);
  const anyLive = get("SELECT 1 FROM channels WHERE bot_id=? AND status='live'", [botId]);
  if (!anyLive) run("UPDATE bots SET status='ready' WHERE id=? AND status='live'", [botId]);
  revalidatePath(`/bots/${botId}`, "layout");
}

export async function deployBot(botId: string) {
  const user = await requireUser();
  getBot(user.id, botId);
  try {
    const v = await core.deploy(botId);
    const anyLive = get("SELECT 1 FROM channels WHERE bot_id=? AND status='live'", [botId]);
    if (anyLive) run("UPDATE bots SET status='live' WHERE id=? AND status IN ('ready','draft')", [botId]);
    revalidatePath(`/bots/${botId}`, "layout");
    return { ok: true as const, number: v.number };
  } catch (e) {
    console.error("[web] deploy", e);
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function runChecksAction(botId: string) {
  const user = await requireUser();
  getBot(user.id, botId);
  return { jobId: startChecks(botId) };
}

export async function rollbackTo(botId: string, versionId: string) {
  const user = await requireUser();
  getBot(user.id, botId);
  try {
    await core.rollback(botId, versionId);
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
  revalidatePath(`/bots/${botId}`, "layout");
  return { ok: true as const };
}

// ── Data ─────────────────────────────────────────────────────────────────
export async function cancelScheduled(botId: string, msgId: string) {
  const user = await requireUser();
  getBot(user.id, botId);
  run("UPDATE scheduled_messages SET status='cancelled' WHERE id=? AND bot_id=? AND status='scheduled'", [msgId, botId]);
  revalidatePath(`/bots/${botId}/data`);
}

function ownTable(botId: string, tableId: string) {
  const t = get<{ id: string; filled_by: string }>("SELECT id,filled_by FROM bot_tables WHERE id=? AND bot_id=?", [tableId, botId]);
  if (!t) throw new Error("Table not found");
  return t;
}
export async function saveTableRow(botId: string, tableId: string, rowId: string | null, data: Record<string, string>) {
  const user = await requireUser();
  getBot(user.id, botId);
  ownTable(botId, tableId);
  if (rowId) run("UPDATE bot_table_rows SET data_json=?, updated_at=datetime('now') WHERE id=? AND table_id=?", [json.str(data), rowId, tableId]);
  else run("INSERT INTO bot_table_rows(id,table_id,data_json) VALUES (?,?,?)", [id("row_"), tableId, json.str(data)]);
  revalidatePath(`/bots/${botId}/data`);
}
export async function deleteTableRow(botId: string, tableId: string, rowId: string) {
  const user = await requireUser();
  getBot(user.id, botId);
  ownTable(botId, tableId);
  run("DELETE FROM bot_table_rows WHERE id=? AND table_id=?", [rowId, tableId]);
  revalidatePath(`/bots/${botId}/data`);
}
export async function forgetCustomer(botId: string, customerId: string) {
  const user = await requireUser();
  getBot(user.id, botId);
  run("DELETE FROM memories WHERE customer_id IN (SELECT id FROM customers WHERE id=? AND bot_id=?)", [customerId, botId]);
  revalidatePath(`/bots/${botId}`, "layout");
}

// ── API keys ─────────────────────────────────────────────────────────────
export async function createApiKey(opts: { name?: string; botId?: string | null; canReadNotes?: boolean }) {
  const user = await requireUser();
  if (opts.botId) getBot(user.id, opts.botId);
  const key = "tl_live_" + randomBytes(24).toString("base64url");
  const hash = createHash("sha256").update(key).digest("hex");
  run("INSERT INTO api_keys(id,user_id,bot_id,name,key_hash,key_prefix,can_read_notes) VALUES (?,?,?,?,?,?,?)", [
    id("key_"), user.id, opts.botId || null, opts.name?.trim().slice(0, 60) || null, hash, key.slice(0, 12), opts.canReadNotes ? 1 : 0,
  ]);
  revalidatePath("/", "layout");
  return { key };
}
export async function revokeApiKey(keyId: string) {
  const user = await requireUser();
  run("DELETE FROM api_keys WHERE id=? AND user_id=?", [keyId, user.id]);
  revalidatePath("/", "layout");
}
export async function listApiKeys() {
  const user = await requireUser();
  return all<{ id: string; name: string | null; key_prefix: string; bot_id: string | null; can_read_notes: number; created_at: string; last_used_at: string | null }>(
    "SELECT id,name,key_prefix,bot_id,can_read_notes,created_at,last_used_at FROM api_keys WHERE user_id=? ORDER BY created_at DESC",
    [user.id],
  );
}
