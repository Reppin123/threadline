import type { Metadata } from "next";
import Link from "next/link";
import { all, get } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { CHANNEL_LABEL, fmtDate, getBot, timeAgo } from "@/lib/data";
import { rowsMode, rowsOf, tablesOf, type RowsMode } from "@/lib/tables";
import { TableEditor } from "@/components/app/TableEditor";
import { CancelScheduled, ForgetCustomer } from "@/components/app/SmallActions";
import { ClearTestData } from "@/components/app/ClearTestData";

export const metadata: Metadata = { title: "Data" };
const TABS = [["saved", "Saved data"], ["tables", "Tables"], ["scheduled", "Scheduled"], ["customers", "Customers"]] as const;
// A real customer has a non-test conversation (or none yet, e.g. added via the API). Playground + check simulators only ever have test ones.
const LIVE_CUSTOMER = "c.handle!='owner-preview' AND (EXISTS(SELECT 1 FROM conversations v WHERE v.customer_id=c.id AND v.is_test=0) OR NOT EXISTS(SELECT 1 FROM conversations v WHERE v.customer_id=c.id))";

/** Flow's "Which rows: Customers | Test data" split for the Saved data and Tables views. */
function WhichRows({ mode, testCount, href }: { mode: RowsMode; testCount: number; href: (m: RowsMode) => string }) {
  return (
    <div className="card box" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }} id="which-rows">
      <span className="stat-k" style={{ margin: 0 }}>Which rows</span>
      <div role="group" aria-label="Which rows" style={{ display: "flex", gap: 8 }}>
        <Link className="chip" href={href("live")} aria-pressed={mode === "live"} data-rows="live">Customers</Link>
        <Link className="chip" href={href("test")} aria-pressed={mode === "test"} data-rows="test">
          Test data <span className={`pill no-dot ${testCount ? "pill-blue" : ""}`} data-test-count={testCount} aria-label={`${testCount} test rows`}>{testCount}</span>
        </Link>
      </div>
      <p className="muted" style={{ flex: 1, minWidth: 220, fontSize: 13 }}>
        {mode === "test" ? "What the bot saved in Test and your test questions. Real customers never see it." : "What real customers' chats saved. Nothing from your tests shows here."}
      </p>
    </div>
  );
}

export default async function DataPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; q?: string; rows?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = TABS.some(([k]) => k === sp.tab) ? sp.tab! : "saved";
  const q = (sp.q || "").trim().toLowerCase();
  const mode = rowsMode(sp.rows);
  const user = await requireUser(`/bots/${id}/data`);
  const bot = getBot(user.id, id);
  const tables = tablesOf(bot.id);
  const savedWeek = tables.reduce((a, t) => a + t.saves7d, 0);
  const testTotal = tables.reduce((a, t) => a + t.test, 0);
  const custWithData = get<{ n: number }>(
    `SELECT count(DISTINCT c.id) n FROM customers c WHERE c.bot_id=? AND ${LIVE_CUSTOMER} AND (EXISTS(SELECT 1 FROM memories m WHERE m.customer_id=c.id) OR EXISTS(SELECT 1 FROM bot_table_rows r JOIN bot_tables t ON t.id=r.table_id WHERE r.customer_id=c.id AND t.bot_id=c.bot_id AND r.is_test=0))`,
    [bot.id],
  )!.n;
  const scheduled = all<{ id: string; channel: string; prompt: string; text: string | null; send_at: string; status: string; handle: string }>(
    "SELECT s.id,s.channel,s.prompt,s.text,s.send_at,s.status,c.handle FROM scheduled_messages s JOIN customers c ON c.id=s.customer_id WHERE s.bot_id=? ORDER BY CASE s.status WHEN 'scheduled' THEN 0 ELSE 1 END, julianday(s.send_at) DESC LIMIT 200",
    [bot.id],
  );
  const upcoming = scheduled.filter((s) => s.status === "scheduled").length;
  const customers = all<{ id: string; channel: string; handle: string; display_name: string | null; last_seen: string }>(
    `SELECT c.id,c.channel,c.handle,c.display_name,c.last_seen FROM customers c WHERE c.bot_id=? AND ${LIVE_CUSTOMER} ORDER BY c.last_seen DESC LIMIT 300`,
    [bot.id],
  );
  const mems = all<{ customer_id: string; key: string; value: string }>("SELECT m.customer_id,m.key,m.value FROM memories m JOIN customers c ON c.id=m.customer_id WHERE c.bot_id=?", [bot.id]);
  const memBy = new Map<string, { key: string; value: string }[]>();
  for (const m of mems) memBy.set(m.customer_id, [...(memBy.get(m.customer_id) ?? []), m]);
  const match = (...xs: unknown[]) => !q || xs.some((x) => String(x ?? "").toLowerCase().includes(q));
  const href = (t: string, m: RowsMode = mode) => `/bots/${bot.id}/data?tab=${t}${m === "test" && (t === "saved" || t === "tables") ? "&rows=test" : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  const test = mode === "test";

  return (
    <main id="main" className="ws-page">
      <div className="page-head" style={{ marginBottom: 18 }}>
        <div><div className="eyebrow">{bot.name}</div><h1 style={{ fontSize: 28, marginTop: 4 }}>Data</h1></div>
        <div className="toolbar" style={{ margin: 0 }}>
          <form action={`/bots/${bot.id}/data`} role="search">
            <input type="hidden" name="tab" value={tab} />
            {test && (tab === "saved" || tab === "tables") && <input type="hidden" name="rows" value="test" />}
            <label className="sr-only" htmlFor="data-q">Search everything</label>
            <input id="data-q" className="input" name="q" defaultValue={sp.q} placeholder="Search everything" style={{ width: 240, height: 38 }} />
          </form>
          <a className="btn btn-sm" href={`/api/app/bots/${bot.id}/export`} id="export-all">Export all</a>
        </div>
      </div>
      <div className="tiles t3">
        <div className="card tile"><div className="stat-k">Things saved</div><div className="stat-v">{savedWeek || "None"}</div><div className="hint">this week</div></div>
        <div className="card tile"><div className="stat-k">Customers</div><div className="stat-v">{custWithData}</div><div className="hint">with saved data</div></div>
        <div className="card tile"><div className="stat-k">Scheduled</div><div className="stat-v">{upcoming || "Nothing"}</div><div className="hint">{upcoming ? "coming up" : "scheduled"}</div></div>
      </div>
      <nav className="tabs" style={{ marginTop: 24 }} aria-label="Data sections">
        {TABS.map(([k, label]) => <Link key={k} href={href(k)} aria-current={tab === k ? "page" : undefined}>{label}</Link>)}
      </nav>

      {tab === "saved" && (
        <>
          <div className="sec-head"><h2>What your bot keeps</h2><p>Tables it fills from chats, and tables you fill that it reads.</p></div>
          {tables.length > 0 && <WhichRows mode={mode} testCount={testTotal} href={(m) => href("saved", m)} />}
          {tables.length === 0 ? (
            <div className="card empty"><h2>No tables yet</h2><p>Your bot isn&apos;t keeping anything yet. Ask in Build: “keep a list of orders with name, phone and items”.</p><Link className="btn" href={`/bots/${bot.id}/build`}>Go to Build</Link></div>
          ) : (
            <div className="cards2">
              {tables.filter((t) => match(t.name, t.description, t.columns.join(" "))).map((t) => (
                <div key={t.id} className="card box" style={{ position: "relative", display: "flex", flexDirection: "column" }} data-table={t.name}>
                  <Link href={href("tables") + `#t-${t.id}`} aria-label={`Open ${t.name}`} style={{ position: "absolute", inset: 0, borderRadius: "inherit" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <h3>{t.name}</h3>
                    <span className="muted" style={{ fontSize: 12.5 }} data-saved7d={test ? t.test : t.saves7d}>{test ? (t.test ? `${t.test} test row${t.test === 1 ? "" : "s"}` : "None yet") : t.saves7d ? `${t.saves7d} saved · 7 days` : "None this week"}</span>
                  </div>
                  <p>{t.description || ""}</p>
                  <div className="cols">{t.columns.map((c) => <span className="col-tag" key={c}>{c}</span>)}</div>
                  <div style={{ marginTop: "auto", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <p style={{ fontSize: 12.5 }}>{t.filled_by === "owner" ? "You fill it, the bot reads it" : "The bot fills it from chats"}</p>
                    {test && t.test > 0 && <span style={{ position: "relative", zIndex: 1 }}><ClearTestData botId={bot.id} tableId={t.id} tableName={t.name} count={t.test} /></span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="card box" style={{ marginTop: 14, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <p style={{ flex: 1, minWidth: 240 }}>Want the bot to keep something else? Ask in Build: “keep a list of orders with name, phone and items”. The builder sets it up — your bot can&apos;t make tables on its own.</p>
            <Link className="btn btn-sm" href={`/bots/${bot.id}/build`}>Go to Build</Link>
          </div>
        </>
      )}

      {tab === "tables" && (
        tables.length === 0 ? <div className="card empty"><h2>No tables yet</h2><p>Ask the builder to keep something for you.</p></div> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <WhichRows mode={mode} testCount={testTotal} href={(m) => href("tables", m)} />
            {test && testTotal === 0 && (
              <div className="card empty"><h2>No test data</h2><p>Chat with your bot in Build. Anything it saves there lands here, never with your customers.</p><Link className="btn" href={`/bots/${bot.id}/build`}>Go to Build</Link></div>
            )}
            {tables.filter((t) => !test || t.test > 0).map((t) => {
              const n = test ? t.test : t.total;
              const rows = rowsOf(t.id, 200, mode).filter((r) => match(JSON.stringify(r.data)));
              return (
                <section key={t.id} id={`t-${t.id}`} data-table={t.name} data-rows-count={n}>
                  <div className="sec-head">
                    <h2>{t.name} <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>· {n} {test ? "test " : ""}row{n === 1 ? "" : "s"} · {t.filled_by === "owner" ? "you fill it" : "the bot fills it"}</span></h2>
                    {test
                      ? <ClearTestData botId={bot.id} tableId={t.id} tableName={t.name} count={t.test} />
                      : <a className="btn btn-sm btn-ghost" href={`/api/app/bots/${bot.id}/export?format=csv&table=${encodeURIComponent(t.name)}`}>CSV</a>}
                  </div>
                  <TableEditor botId={bot.id} tableId={t.id} columns={t.columns} rows={rows.map((r) => ({ id: r.id, data: r.data, created_at: r.created_at }))} editable={!test && t.filled_by === "owner"} />
                </section>
              );
            })}
          </div>
        )
      )}

      {tab === "scheduled" && (
        scheduled.length === 0 ? <div className="card empty"><h2>Nothing scheduled</h2><p>Reminders and follow-ups your bot sets — or ones you send through the API — show up here.</p></div> : (
          <div className="card row-list">
            {scheduled.filter((s) => match(s.prompt, s.text, s.handle)).map((s) => (
              <div className="row" key={s.id}>
                <div className="grow">
                  <div className="title">{s.text || s.prompt}</div>
                  <div className="meta">{CHANNEL_LABEL[s.channel] ?? s.channel} · {s.handle} · {s.status === "scheduled" ? `sends ${fmtDate(s.send_at)}` : `${s.status} ${fmtDate(s.send_at)}`}</div>
                </div>
                <span className={`pill ${s.status === "sent" ? "pill-live" : s.status === "failed" ? "pill-err" : s.status === "scheduled" ? "pill-blue" : "pill-off"}`}>{s.status}</span>
                {s.status === "scheduled" && <CancelScheduled botId={bot.id} id={s.id} />}
              </div>
            ))}
          </div>
        )
      )}

      {tab === "customers" && (
        customers.length === 0 ? <div className="card empty"><h2>No customers yet</h2><p>When people text your bot, they show up here with what it remembers about them.</p></div> : (
          <div className="card row-list">
            {customers.filter((c) => match(c.handle, c.display_name, JSON.stringify(memBy.get(c.id) ?? []))).map((c) => (
              <div className="row" key={c.id} style={{ alignItems: "flex-start" }}>
                <div className="grow">
                  <div className="title">{c.display_name || c.handle}</div>
                  <div className="meta">{CHANNEL_LABEL[c.channel] ?? c.channel} · {c.handle} · last seen {timeAgo(c.last_seen)}</div>
                  {(memBy.get(c.id) ?? []).length > 0 && (
                    <div className="cols">{memBy.get(c.id)!.map((m) => <span className="col-tag" key={m.key} style={{ fontFamily: "var(--sans)" }}><b>{m.key}:</b> {m.value}</span>)}</div>
                  )}
                </div>
                {(memBy.get(c.id) ?? []).length > 0 && <ForgetCustomer botId={bot.id} id={c.id} />}
              </div>
            ))}
          </div>
        )
      )}
    </main>
  );
}
