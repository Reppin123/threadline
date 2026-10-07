import type { Metadata } from "next";
import Link from "next/link";
import { all, get } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { CHANNEL_LABEL, fmtDate, getBot, timeAgo } from "@/lib/data";

export const metadata: Metadata = { title: "Conversations" };

type Conv = { id: string; channel: string; customer_id: string; handle: string; display_name: string | null; last_message_at: string; couldnt_answer: number; problem: number; intent: string | null; preview: string | null };

function pretty(s: string | null) {
  if (!s) return "";
  try { return JSON.stringify(JSON.parse(s), null, 1).slice(0, 600); } catch { return s.slice(0, 600); }
}

export default async function ConversationsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/bots/${id}/conversations`);
  const bot = getBot(user.id, id);
  const f = sp.f === "couldnt" || sp.f === "problems" ? sp.f : "all";
  const q = (sp.q || "").trim();
  const allChannels = all<{ channel: string }>("SELECT DISTINCT channel FROM conversations WHERE bot_id=? AND is_test=0", [bot.id]).map((r) => r.channel);
  const chSel = sp.ch ? sp.ch.split(",").filter(Boolean) : allChannels;

  const where = ["c.bot_id=?", "c.is_test=0"];
  const args: unknown[] = [bot.id];
  if (f === "couldnt") where.push("c.couldnt_answer=1");
  if (f === "problems") where.push("c.problem=1");
  if (sp.ch) { where.push(`c.channel IN (${chSel.map(() => "?").join(",") || "''"})`); args.push(...chSel); }
  if (q) { where.push("(cu.handle LIKE ? OR cu.display_name LIKE ? OR EXISTS(SELECT 1 FROM messages mm WHERE mm.conversation_id=c.id AND mm.content LIKE ?))"); args.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  const convs = all<Conv>(
    `SELECT c.id,c.channel,c.customer_id,cu.handle,cu.display_name,c.last_message_at,c.couldnt_answer,c.problem,c.intent,
       (SELECT content FROM messages m WHERE m.conversation_id=c.id AND m.role IN ('user','assistant') ORDER BY m.created_at DESC, m.rowid DESC LIMIT 1) preview
     FROM conversations c JOIN customers cu ON cu.id=c.customer_id WHERE ${where.join(" AND ")} ORDER BY c.last_message_at DESC LIMIT 200`,
    args,
  );
  const counts = get<{ a: number; c: number; p: number }>("SELECT count(*) a, COALESCE(SUM(couldnt_answer),0) c, COALESCE(SUM(problem),0) p FROM conversations WHERE bot_id=? AND is_test=0", [bot.id])!;
  const sel = convs.find((c) => c.id === sp.c) ?? convs[0];
  const msgs = sel
    ? all<{ id: string; role: string; content: string; tool_name: string | null; tool_input_json: string | null; tool_output_json: string | null; created_at: string; couldnt_answer: number }>(
        "SELECT id,role,content,tool_name,tool_input_json,tool_output_json,created_at,couldnt_answer FROM messages WHERE conversation_id=? ORDER BY created_at, rowid",
        [sel.id],
      )
    : [];
  const mems = sel ? all<{ key: string; value: string; updated_at: string }>("SELECT key,value,updated_at FROM memories WHERE customer_id=? ORDER BY updated_at DESC", [sel.customer_id]) : [];
  const link = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const m = { f, q, ch: sp.ch, c: sel?.id, ...o };
    for (const [k, v] of Object.entries(m)) if (v && !(k === "f" && v === "all")) p.set(k, v);
    return `/bots/${bot.id}/conversations?${p}`;
  };

  if (counts.a === 0) {
    return (
      <main id="main" className="ws-page">
        <div className="page-head"><div><div className="eyebrow">{bot.name}</div><h1 style={{ fontSize: 28, marginTop: 4 }}>Conversations</h1></div></div>
        <div className="card empty" id="conversations-empty">
          <div className="empty-icon">💬</div>
          <h2>No customer chats yet</h2>
          <p>When customers text your bot on iMessage or Telegram, their chats show here — every message and every action it took. Your chats in the Build preview aren&apos;t listed.</p>
          <Link className="btn btn-blue" href={`/bots/${bot.id}/deploy`}>Connect iMessage</Link>
        </div>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 16, textAlign: "center" }}>Customers are told their chats are kept for 90 days and seen by the bot&apos;s owner. Chats older than that are deleted.</p>
      </main>
    );
  }

  return (
    <main id="main" className="inbox">
      <section className="inbox-list" aria-label="Chats">
        <div className="filters">
          <form action={`/bots/${bot.id}/conversations`} role="search">
            {f !== "all" && <input type="hidden" name="f" value={f} />}
            <label className="sr-only" htmlFor="conv-q">Search chats</label>
            <input id="conv-q" className="input" name="q" defaultValue={q} placeholder="Search chats" style={{ height: 36 }} />
          </form>
          <div className="chips">
            <Link className="chip" style={{ minHeight: 28, fontSize: 12.5, padding: "3px 10px" }} aria-pressed={f === "all"} href={link({ f: "all", c: undefined })}>All {counts.a}</Link>
            <Link className="chip" style={{ minHeight: 28, fontSize: 12.5, padding: "3px 10px" }} aria-pressed={f === "couldnt"} href={link({ f: "couldnt", c: undefined })}>Couldn&apos;t answer {counts.c}</Link>
            <Link className="chip" style={{ minHeight: 28, fontSize: 12.5, padding: "3px 10px" }} aria-pressed={f === "problems"} href={link({ f: "problems", c: undefined })}>Problems {counts.p}</Link>
          </div>
          {allChannels.length > 1 && (
            <div className="chips" style={{ fontSize: 12.5 }}>
              {allChannels.map((ch) => {
                const on = chSel.includes(ch);
                const next = on ? chSel.filter((x) => x !== ch) : [...chSel, ch];
                return <Link key={ch} href={link({ ch: next.join(",") || "none", c: undefined })} className="check"><input type="checkbox" readOnly checked={on} tabIndex={-1} /> {CHANNEL_LABEL[ch] ?? ch}</Link>;
              })}
            </div>
          )}
        </div>
        <div className="inbox-items">
          {convs.length === 0 && <p className="muted" style={{ padding: 16, fontSize: 13.5 }}>No chats match.</p>}
          {convs.map((c) => (
            <Link key={c.id} className="inbox-item" href={link({ c: c.id })} aria-current={c.id === sel?.id ? "true" : undefined}>
              <div className="top"><span>{c.display_name || c.handle}</span><span>{timeAgo(c.last_message_at)}</span></div>
              <div className="prev">{c.preview || "…"}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <span className="pill no-dot" style={{ height: 18, fontSize: 10 }}>{CHANNEL_LABEL[c.channel] ?? c.channel}</span>
                {!!c.couldnt_answer && <span className="pill pill-warn no-dot" style={{ height: 18, fontSize: 10 }}>Couldn&apos;t answer</span>}
                {!!c.problem && <span className="pill pill-err no-dot" style={{ height: 18, fontSize: 10 }}>Problem</span>}
              </div>
            </Link>
          ))}
        </div>
        <div className="retention">Customers are told chats are kept for 90 days and seen by the bot&apos;s owner. Older chats are deleted.</div>
      </section>
      <section className="thread" aria-label="Chat">
        <div className="pane-head">
          <div><h2>{sel ? sel.display_name || sel.handle : "Chat"}</h2><div className="muted" style={{ fontSize: 12.5 }}>{sel ? `${CHANNEL_LABEL[sel.channel] ?? sel.channel}${sel.intent ? ` · ${sel.intent}` : ""}` : ""}</div></div>
        </div>
        <div className="thread-body">
          <div className="imsg">
            {msgs.map((m, i) => {
              if (m.role === "tool") {
                return (
                  <div key={m.id} className="toolcall">
                    <b>⚙ {m.tool_name || "tool"}</b>{m.tool_input_json ? `\n→ ${pretty(m.tool_input_json)}` : ""}{m.tool_output_json ? `\n← ${pretty(m.tool_output_json)}` : m.content ? `\n← ${m.content.slice(0, 600)}` : ""}
                  </div>
                );
              }
              if (m.role === "system") return <div key={m.id} className="day" style={{ textAlign: "center", fontSize: 11.5, color: "var(--muted)" }}>{m.content}</div>;
              const me = m.role === "assistant";
              const nxt = msgs[i + 1];
              return (
                <div key={m.id} style={{ display: "contents" }}>
                  <div className={`bub ${me ? "me" : "them"}${!nxt || nxt.role !== m.role ? " tail" : ""}`} title={fmtDate(m.created_at)}>{m.content}</div>
                  {!!m.couldnt_answer && <div className="pill pill-warn no-dot" style={{ alignSelf: "flex-end", height: 18, fontSize: 10 }}>Couldn&apos;t answer</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <aside className="side" aria-label="Customer">
        {sel && (
          <>
            <div style={{ fontWeight: 600 }}>{sel.display_name || sel.handle}</div>
            <div className="muted" style={{ fontSize: 12.5 }}>{CHANNEL_LABEL[sel.channel] ?? sel.channel} · {sel.handle}</div>
            <h3>What it remembers</h3>
            {mems.length === 0 ? <p className="muted">Nothing yet.</p> : mems.map((m) => <div className="mem" key={m.key}><b>{m.key}</b>{m.value}</div>)}
          </>
        )}
      </aside>
    </main>
  );
}
