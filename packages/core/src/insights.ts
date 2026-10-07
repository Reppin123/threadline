// Stats page: exactly the Insights shape, from conversations / messages / usage / events (excludes test chats).
import { all, get } from "@threadline/db";
import type { Insights } from "./contract.ts";

export async function getInsights(botId: string): Promise<Insights> {
  const wk = "datetime('now','-7 days')";
  const chatsThisWeek = get<{ n: number }>(`SELECT COUNT(*) n FROM conversations WHERE bot_id=? AND is_test=0 AND started_at >= ${wk}`, [botId])!.n;
  const customersThisWeek = get<{ n: number }>(`SELECT COUNT(DISTINCT customer_id) n FROM conversations WHERE bot_id=? AND is_test=0 AND last_message_at >= ${wk}`, [botId])!.n;
  const replies = get<{ total: number; bad: number }>(
    `SELECT COUNT(*) total, COALESCE(SUM(m.couldnt_answer),0) bad FROM messages m JOIN conversations c ON c.id=m.conversation_id
     WHERE c.bot_id=? AND c.is_test=0 AND m.role='assistant' AND m.created_at >= ${wk}`, [botId])!;
  const answeredOnOwnPct = replies.total ? Math.round(((replies.total - replies.bad) / replies.total) * 100) : null;

  const perDay = all<{ d: string; channel: string; n: number }>(
    `SELECT date(started_at) d, channel, COUNT(*) n FROM conversations WHERE bot_id=? AND is_test=0 AND started_at >= date('now','-13 days') GROUP BY d, channel`, [botId]);
  const chatsPerDay: Insights["chatsPerDay"] = [];
  for (let i = 13; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400e3).toISOString().slice(0, 10);
    chatsPerDay.push({ date, byChannel: Object.fromEntries(perDay.filter((r) => r.d === date).map((r) => [r.channel, r.n])) });
  }

  const spend = all<{ category: string; c: number }>(`SELECT category, SUM(cost_usd) c FROM usage WHERE bot_id=? AND created_at >= date('now','start of month') GROUP BY category`, [botId]);
  const s = (k: string) => Math.round((spend.find((x) => x.category === k)?.c ?? 0) * 10000) / 10000;
  const spendThisMonth = { answering: s("answering"), build: s("build"), media: s("media"), tests: s("tests"), total: 0 };
  spendThisMonth.total = Math.round((spendThisMonth.answering + spendThisMonth.build + spendThisMonth.media + spendThisMonth.tests) * 10000) / 10000;

  const ca = all<{ topic: string | null; q: string | null }>(
    `SELECT m.topic, (SELECT u.content FROM messages u WHERE u.conversation_id=m.conversation_id AND u.role='user' AND u.created_at<=m.created_at ORDER BY u.created_at DESC, u.rowid DESC LIMIT 1) q
     FROM messages m JOIN conversations c ON c.id=m.conversation_id WHERE c.bot_id=? AND c.is_test=0 AND m.couldnt_answer=1 AND m.created_at >= ${wk}`, [botId]);
  const topics = new Map<string, { count: number; examples: string[] }>();
  for (const r of ca) {
    const t = (r.topic || "Other").trim().toLowerCase().replace(/^./, (c) => c.toUpperCase());
    const e = topics.get(t) ?? { count: 0, examples: [] };
    e.count++;
    if (r.q && e.examples.length < 3) e.examples.push(r.q.slice(0, 140));
    topics.set(t, e);
  }
  const couldntAnswerTopics = [...topics.entries()].map(([topic, v]) => ({ topic, ...v })).sort((a, b) => b.count - a.count).slice(0, 10);

  const topIntents = all<{ intent: string; count: number }>(
    `SELECT lower(intent) intent, COUNT(*) count FROM conversations WHERE bot_id=? AND is_test=0 AND intent IS NOT NULL AND started_at >= date('now','-30 days') GROUP BY lower(intent) ORDER BY count DESC LIMIT 8`, [botId]);

  const needsAttention: Insights["needsAttention"] = [];
  for (const h of all<{ data_json: string }>(`SELECT data_json FROM events WHERE bot_id=? AND type='handoff' AND created_at >= ${wk} ORDER BY created_at DESC LIMIT 10`, [botId])) {
    const d = JSON.parse(h.data_json || "{}");
    if (d.isTest) continue;
    needsAttention.push({ kind: "handoff", message: `A customer asked for a human: ${d.reason ?? ""}`.trim(), conversationId: d.conversationId });
  }
  for (const p of all<{ id: string }>(`SELECT id FROM conversations WHERE bot_id=? AND is_test=0 AND problem=1 AND last_message_at >= ${wk} LIMIT 5`, [botId]))
    needsAttention.push({ kind: "problem", message: "An action failed during a chat", conversationId: p.id });
  const errs = get<{ n: number }>(`SELECT COUNT(*) n FROM events WHERE bot_id=? AND type='tool_error' AND created_at >= ${wk} AND data_json NOT LIKE '%"isTest":true%'`, [botId])!.n;
  if (errs) needsAttention.push({ kind: "tool_errors", message: `${errs} tool call${errs > 1 ? "s" : ""} failed this week — check your API credentials` });
  const failed = get<{ n: number }>("SELECT COUNT(*) n FROM scheduled_messages WHERE bot_id=? AND status='failed'", [botId])!.n;
  if (failed) needsAttention.push({ kind: "scheduled_failed", message: `${failed} scheduled message${failed > 1 ? "s" : ""} failed to send` });
  if (couldntAnswerTopics.length) needsAttention.push({ kind: "couldnt_answer", message: `Customers asked about ${couldntAnswerTopics[0].topic.toLowerCase()} and the bot didn't know — teach it in Build` });

  return { chatsThisWeek, customersThisWeek, answeredOnOwnPct, chatsPerDay, spendThisMonth, couldntAnswerTopics, topIntents, needsAttention };
}
