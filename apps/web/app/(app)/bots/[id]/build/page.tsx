import type { Metadata } from "next";
import { all, json } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getBot, profileOf, progressOf } from "@/lib/data";
import { summarizeAnswers } from "@/lib/wizard";
import { BuildProgressView } from "@/components/app/BuildProgress";
import { Builder, type BMsg, type PMsg } from "@/components/app/Builder";

export const metadata: Metadata = { title: "Build" };

export default async function BuildPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ thread?: string }> }) {
  const { id } = await params;
  const { thread = "main" } = await searchParams;
  const user = await requireUser(`/bots/${id}/build`);
  const bot = getBot(user.id, id);
  const progress = progressOf(bot);

  if (bot.status === "draft" && !progress) {
    return <BuildProgressView botId={bot.id} name={bot.name} initial={{ step: "read_source", label: "Not built yet", pct: 0, error: "This bot hasn't been built yet." }} sourceKind={bot.source_kind} failed />;
  }
  if (bot.status === "building" || (bot.status === "draft" && progress && progress.pct < 100) || (bot.status === "draft" && !bot.profile_json)) {
    return <BuildProgressView botId={bot.id} name={bot.name} initial={progress} sourceKind={bot.source_kind} />;
  }
  if (bot.status === "error") {
    return <BuildProgressView botId={bot.id} name={bot.name} initial={progress} sourceKind={bot.source_kind} failed />;
  }

  const profile = profileOf(bot);
  const rows = all<{ id: string; role: string; content: string; suggestions_json: string | null }>(
    "SELECT id,role,content,suggestions_json FROM builder_messages WHERE bot_id=? AND thread_id=? ORDER BY created_at, rowid",
    [bot.id, thread],
  );
  let msgs: BMsg[] = rows.map((r) => ({ id: r.id, role: r.role as BMsg["role"], content: r.content }));
  const lastSugg = [...rows].reverse().find((r) => r.role === "assistant" && r.suggestions_json);
  let suggestions: string[] = lastSugg ? json.parse<string[]>(lastSugg.suggestions_json, []) : [];
  if (msgs.length === 0 && thread === "main") {
    const wizard = json.parse<any[]>(bot.wizard_json, []);
    const caps = profile.capabilities?.length ? profile.capabilities.slice(0, 5).join(", ").toLowerCase() : null;
    msgs = [
      ...(wizard.length ? [{ id: "w0", role: "user" as const, content: summarizeAnswers(wizard) }] : []),
      {
        id: "w1",
        role: "assistant",
        content: caps
          ? `I set up ${bot.name} to ${caps}. Try it on the right, then tell me what to change.`
          : `${bot.name} is ready for a first try. Text it on the right, then tell me what to change — tone, what it knows, what it should do.`,
      },
    ];
  }
  if (!suggestions.length) suggestions = (profile.suggestions ?? []).slice(0, 3);
  if (!suggestions.length) suggestions = ["Ask for the customer's name first", "Keep replies shorter", "Add our opening hours"];

  // Playground history: the owner's preview conversation(s)
  const pRows = all<{ id: string; role: string; content: string; tool_name: string | null }>(
    `SELECT m.id,m.role,m.content,m.tool_name FROM messages m JOIN conversations c ON c.id=m.conversation_id JOIN customers cu ON cu.id=c.customer_id
     WHERE c.bot_id=? AND cu.channel='web' AND cu.handle='owner-preview' ORDER BY m.created_at, m.rowid LIMIT 400`,
    [bot.id],
  );
  const preview: PMsg[] = pRows
    .filter((r) => r.role === "user" || r.role === "assistant" || r.role === "tool")
    .map((r) => (r.role === "tool" ? { id: r.id, kind: "tool", text: r.tool_name || "tool" } : { id: r.id, kind: r.role === "user" ? "me" : "them", text: r.content }));

  return (
    <Builder
      botId={bot.id}
      name={bot.name}
      status={bot.status}
      greeting={profile.greeting ?? null}
      webAccess={!!bot.web_access}
      thread={thread}
      messages={msgs}
      suggestions={suggestions}
      preview={preview}
    />
  );
}
