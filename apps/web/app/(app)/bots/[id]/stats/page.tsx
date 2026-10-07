import type { Metadata } from "next";
import Link from "next/link";
import { core, type Insights } from "@threadline/core";
import { requireUser } from "@/lib/auth";
import { CHANNEL_LABEL, getBot, lastNDays, liveChannels, money, trialOf } from "@/lib/data";

export const metadata: Metadata = { title: "Stats" };

const COLORS: Record<string, string> = { imessage: "#0a7cff", telegram: "#2aabee", whatsapp: "#25d366", web: "#9a9ca3", terminal: "#6c5ce7" };

function Bars({ data }: { data: Insights["chatsPerDay"] }) {
  const days = lastNDays(14);
  const by = new Map(data.map((d) => [d.date.slice(0, 10), d.byChannel]));
  const series = days.map((d) => ({ d, ch: by.get(d) ?? {} }));
  const chans = [...new Set(series.flatMap((s) => Object.keys(s.ch)))];
  const max = Math.max(1, ...series.map((s) => Object.values(s.ch).reduce((a, b) => a + b, 0)));
  const W = 700, H = 180, pad = 22, bw = (W - pad) / 14 - 8;
  return (
    <>
      <svg className="chart" viewBox={`0 0 ${W} ${H + 22}`} role="img" aria-label="Chats per day, last 14 days, stacked by channel">
        {[0, 0.5, 1].map((g) => <line key={g} x1={pad} x2={W} y1={H - g * (H - 10)} y2={H - g * (H - 10)} stroke="#e8e6df" strokeDasharray={g ? "3 4" : undefined} />)}
        <text x={0} y={14} fontSize="10" fill="#9a9ca3">{max}</text>
        {series.map((s, i) => {
          let y = H;
          const x = pad + 4 + i * ((W - pad) / 14);
          return (
            <g key={s.d}>
              {chans.map((c) => {
                const v = s.ch[c] ?? 0;
                if (!v) return null;
                const h = (v / max) * (H - 10);
                y -= h;
                return <rect key={c} x={x} y={y} width={bw} height={h} rx="3" fill={COLORS[c] ?? "#6b6e76"}><title>{`${s.d}: ${v} on ${CHANNEL_LABEL[c] ?? c}`}</title></rect>;
              })}
              {Object.keys(s.ch).length === 0 && <rect x={x} y={H - 2} width={bw} height={2} rx="1" fill="#e4e2db" />}
              {(i % 2 === 1 || i === 13) && <text x={x + bw / 2} y={H + 16} fontSize="10" textAnchor="middle" fill="#9a9ca3">{i === 13 ? "Today" : s.d.slice(5)}</text>}
            </g>
          );
        })}
      </svg>
      <div className="legend">{(chans.length ? chans : ["imessage", "telegram"]).map((c) => <span key={c}><i style={{ background: COLORS[c] ?? "#6b6e76" }} />{CHANNEL_LABEL[c] ?? c}</span>)}</div>
    </>
  );
}

export default async function StatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/bots/${id}/stats`);
  const bot = getBot(user.id, id);
  let ins: Insights | null = null;
  let err: string | null = null;
  try { ins = await core.getInsights(bot.id); } catch (e) { err = String((e as Error).message); }
  const live = liveChannels(bot.id);
  const t = trialOf(user.id);
  const sp = ins?.spendThisMonth;
  const spendRows = sp ? [["Answering customers", sp.answering], ["Changes in Build", sp.build], ["Checks and simulated customers", sp.tests], ["Voice notes and files", sp.media]] as const : [];
  const spendMax = Math.max(0.0001, ...spendRows.map((r) => r[1]));
  return (
    <main id="main" className="ws-page">
      <div className="page-head">
        <div><div className="eyebrow">Stats</div><h1 style={{ fontSize: 28, marginTop: 4 }}>{bot.name}</h1></div>
        {live.length ? <span className="pill pill-live">Live on {live.map((c) => CHANNEL_LABEL[c] ?? c).join(", ")}</span> : (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}><span className="muted" style={{ fontSize: 13.5 }}>Not on a channel yet</span><Link className="btn btn-sm btn-blue" href={`/bots/${bot.id}/deploy`}>Connect a channel</Link></div>
        )}
      </div>
      {err && <div className="error-box">Couldn&apos;t load stats: {err}</div>}

      <section className="card box" style={{ display: "flex", gap: 28, flexWrap: "wrap" }} aria-label="What it can do">
        <div><div className="stat-k">What it can do</div></div>
        <div><div className="stat-k">Web access</div><div style={{ fontWeight: 600 }}>{bot.web_access ? "On" : "Off"}</div></div>
        <div><div className="stat-k">Languages</div><div style={{ fontWeight: 600 }}>{bot.languages || "English"}</div></div>
        <div><div className="stat-k">Voice notes</div><div style={{ fontWeight: 600 }}>Hears them</div></div>
        <div><div className="stat-k">Photos &amp; files</div><div style={{ fontWeight: 600 }}>Reads them</div></div>
      </section>

      {ins && (
        <>
          <div className="tiles" style={{ marginTop: 14 }} id="stats-tiles">
            <div className="card tile"><div className="stat-k">Chats this week</div><div className="stat-v">{ins.chatsThisWeek}</div></div>
            <div className="card tile"><div className="stat-k">Customers</div><div className="stat-v">{ins.customersThisWeek}</div><div className="hint">this week</div></div>
            <div className="card tile"><div className="stat-k">Answered on its own</div><div className="stat-v">{ins.answeredOnOwnPct == null ? "—" : `${Math.round(ins.answeredOnOwnPct)}%`}</div><div className="hint">of replies checked</div></div>
            <div className="card tile"><div className="stat-k">Account credit left</div><div className="stat-v">{money(t.left)}</div><div className="hint">{t.daysLeft != null ? `~${t.daysLeft} days at this rate` : "of " + money(t.credit)}</div></div>
          </div>

          <section className="sec card box">
            <div className="sec-head"><h2>Chats per day</h2><p>Last 14 days · per channel</p></div>
            <Bars data={ins.chatsPerDay} />
          </section>

          <div className="cards2 sec">
            <section className="card box">
              <div className="sec-head"><h2>Spend this month</h2><p>{money(sp!.total)} total</p></div>
              {spendRows.map(([k, v]) => (
                <div className="hbar" key={k}><span>{k}</span><span className="b"><i style={{ width: `${(v / spendMax) * 100}%` }} /></span><span className="mono" style={{ textAlign: "right", fontSize: 12.5 }}>{money(v)}</span></div>
              ))}
            </section>
            <section className="card box">
              <div className="sec-head"><h2>What people ask for</h2><p>Top intents</p></div>
              {ins.topIntents.length === 0 ? <p>Nothing yet — intents appear after real customer chats.</p> : (() => {
                const m = Math.max(...ins!.topIntents.map((x) => x.count));
                return ins!.topIntents.slice(0, 6).map((x) => (
                  <div className="hbar" key={x.intent}><span>{x.intent}</span><span className="b"><i style={{ width: `${(x.count / m) * 100}%`, background: "var(--violet)" }} /></span><span className="mono" style={{ textAlign: "right", fontSize: 12.5 }}>{x.count}</span></div>
                ));
              })()}
            </section>
          </div>

          <div className="cards2 sec">
            <section className="card box">
              <div className="sec-head"><h2>Questions it couldn&apos;t answer</h2><p>This week · grouped by topic</p></div>
              {ins.couldntAnswerTopics.length === 0 ? <p>None this week.</p> : ins.couldntAnswerTopics.map((c) => (
                <div key={c.topic} style={{ padding: "8px 0", borderTop: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><b style={{ fontSize: 14 }}>{c.topic}</b><span className="muted">{c.count}</span></div>
                  {c.examples.slice(0, 2).map((e, i) => <div key={i} className="muted" style={{ fontSize: 13 }}>“{e}”</div>)}
                </div>
              ))}
              {ins.couldntAnswerTopics.length > 0 && <Link className="btn btn-sm" style={{ marginTop: 10 }} href={`/bots/${bot.id}/build`}>Teach it in Build</Link>}
            </section>
            <section className="card box">
              <div className="sec-head"><h2>Needs attention</h2></div>
              {ins.needsAttention.length === 0 ? <p>Nothing needs you.</p> : ins.needsAttention.map((n, i) => (
                <div key={i} style={{ padding: "8px 0", borderTop: "1px solid var(--line)", fontSize: 14 }}>
                  <span className="pill pill-warn no-dot" style={{ marginRight: 8 }}>{n.kind}</span>{n.message}
                  {n.conversationId && <> · <Link href={`/bots/${bot.id}/conversations?c=${n.conversationId}`} style={{ textDecoration: "underline" }}>Open chat</Link></>}
                </div>
              ))}
            </section>
          </div>
        </>
      )}
    </main>
  );
}
