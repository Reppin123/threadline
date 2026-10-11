"use server";
// Inspect tab actions (agent inspect): check / save / recheck / remove a bot connection. All scoped to the owner.
import { revalidatePath } from "next/cache";
import { connectors } from "@threadline/core";
import { requireUser } from "@/lib/auth";
import { getBot } from "@/lib/data";
import { logEvent } from "@/lib/db";

export interface ConnectForm {
  address: string; key: string; canWrite: boolean; name: string;
  kind: "detect" | "plain" | "openapi" | "mcp";
  auth: "detect" | "none" | "bearer" | "header" | "basic" | "query" | "oauth";
  authName: string; testPath: string;
}
export type DetectView = Awaited<ReturnType<typeof connectors.detectConnector>>;

async function owned(botId: string) {
  const user = await requireUser();
  return getBot(user.id, botId);
}

function input(f: ConnectForm): connectors.DetectInput {
  return {
    address: f.address, key: f.key || undefined, canWrite: !!f.canWrite, name: f.name || undefined,
    kind: f.kind, auth: f.auth, authName: f.authName.trim() || undefined, testPath: f.testPath.trim() || undefined,
  };
}

/** Probe only — nothing is saved. */
export async function checkConnection(botId: string, f: ConnectForm): Promise<{ ok: true; result: DetectView } | { ok: false; error: string }> {
  await owned(botId);
  try { return { ok: true, result: await connectors.detectConnector(input(f)) }; }
  catch (e) { return { ok: false, error: (e as Error).message }; }
}

/** Re-validates with the owner's (possibly overridden) choices, then writes the row + tools. */
export async function saveConnection(botId: string, f: ConnectForm): Promise<{ ok: true; name: string; tools: string[] } | { ok: false; error: string; result?: DetectView }> {
  const bot = await owned(botId);
  const r = await connectors.addConnection(bot.id, input(f));
  if (!r.ok) return { ok: false, error: r.error, result: r.detect };
  logEvent(bot.id, "connection_added", { connectionId: r.connection.id, kind: r.connection.kind, auth: r.connection.authKind, tools: r.connection.toolCount });
  revalidatePath(`/bots/${bot.id}`, "layout");
  return { ok: true, name: r.connection.name, tools: r.connection.tools };
}

export async function recheckConnectionAction(botId: string, connectionId: string): Promise<{ ok: boolean; error?: string; tools: string[] }> {
  const bot = await owned(botId);
  const r = await connectors.recheckConnection(bot.id, connectionId).catch((e) => ({ ok: false, error: (e as Error).message, tools: [] as string[] }));
  revalidatePath(`/bots/${bot.id}/inspect`);
  return r;
}

export async function removeConnectionAction(botId: string, connectionId: string): Promise<{ ok: boolean }> {
  const bot = await owned(botId);
  const ok = connectors.removeConnection(bot.id, connectionId);
  if (ok) logEvent(bot.id, "connection_removed", { connectionId });
  revalidatePath(`/bots/${bot.id}`, "layout");
  return { ok };
}
