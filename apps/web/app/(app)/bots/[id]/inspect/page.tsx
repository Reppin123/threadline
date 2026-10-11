import type { Metadata } from "next";
import Link from "next/link";
import { inspect, connectors } from "@threadline/core";
import { requireUser } from "@/lib/auth";
import { CHANNEL_LABEL, getBot } from "@/lib/data";
import { InspectConnectForm, ConnectionActions, CopyButton } from "@/components/app/InspectConnect";
import "./inspect.css";

export const metadata: Metadata = { title: "Inspect" };
export const dynamic = "force-dynamic";

const PROMPT_CHANNELS = ["web", "imessage", "telegram", "whatsapp"] as const;
const MESSAGING = ["imessage", "telegram", "whatsapp"] as const;
const CH_STATUS: Record<string, string> = { live: "Live", pending: "Waiting", error: "Error", off: "Off" };

function when(s: string | null) {
  if (!s) return "never";
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T") + "Z");
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" }) + " UTC";
}

function Sec({ id, title, count, open, children, note }: { id: string; title: string; count?: number; open?: boolean; note?: string; children: React.ReactNode }) {
  return (
    <details className="card insp-sec" id={`insp-${id}`} open={open}>
      <summary><span className="insp-title">{title}{count !== undefined && <span className="muted"> · {count}</span>}</span>{note && <span className="muted insp-note">{note}</span>}</summary>
      <div className="insp-body">{children}</div>
    </details>
  );
}

export default async function InspectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ channel?: string; v?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/bots/${id}/inspect`);
  const bot = getBot(user.id, id);
  const channel = (PROMPT_CHANNELS as readonly string[]).includes(sp.channel ?? "") ? (sp.channel as inspect.InspectChannel) : "web";
  const version = sp.v === "draft" ? "draft" : "live";
  const d = inspect.inspectBot(bot.id, { channel, version });
  const q = (o: { channel?: string; v?: string }) => `?${new URLSearchParams({ channel: o.channel ?? channel, v: o.v ?? version }).toString()}`;
  const active = d.tools.filter((t) => t.activeNow).length;

  return (
    <main id="main" className="ws-page insp">
      <div className="page-head">
        <div>
          <div className="eyebrow">Inspect</div>
          <h1 style={{ fontSize: 28, marginTop: 4 }}>What {d.bot.name} is made of</h1>
          <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>Read from its files, exactly as the bot uses them. Nothing paraphrased, nothing hidden; keys are never shown.</p>
        </div>
        <div className="seg" role="group" aria-label="Which version">
          {d.source.liveVersionNumber !== null && <Link href={q({ v: "live" })} aria-current={!d.source.isDraft ? "page" : undefined} id="insp-v-live">Live v{d.source.liveVersionNumber}</Link>}
          <Link href={q({ v: "draft" })} aria-current={d.source.isDraft ? "page" : undefined} id="insp-v-draft">Draft{d.source.draftDirty ? " (changed)" : ""}</Link>
        </div>
      </div>
      <p className="muted insp-source" id="insp-source">Showing: <b>{d.source.label}</b>{d.source.isDraft && d.source.liveVersionNumber !== null ? ". Customers get the live version until you deploy." : !d.source.isDraft ? ". Test in Build uses the draft." : ""}</p>

      <Sec id="instructions" title="Instructions" open note="The exact system prompt sent to the model">
        <div className="insp-toolbar">
          <span className="muted">Channel</span>
          <div className="seg" role="group" aria-label="Prompt for channel">
            {PROMPT_CHANNELS.map((c) => <Link key={c} href={q({ channel: c })} aria-current={c === channel ? "page" : undefined}>{CHANNEL_LABEL[c] ?? c}</Link>)}
          </div>
          <span style={{ flex: 1 }} />
          <CopyButton text={d.instructions} label="Copy prompt" />
        </div>
        <p className="muted insp-small">Built by the same function the bot runs on every message. Two parts change per message and are shown empty here: the matching pages from your site, and what it remembers about that customer.</p>
        <pre className="insp-pre" id="insp-prompt">{d.instructions}</pre>
      </Sec>

      <Sec id="tools" title="Tools" count={d.tools.length} note={`${active} it can use right now`}>
        {d.tools.length === 0 ? <p className="muted">No tools yet.</p> : (
          <div className="table-wrap"><table className="insp-table">
            <thead><tr><th>Name</th><th>Kind</th><th>What it does</th><th>Rules</th></tr></thead>
            <tbody>{d.tools.map((t) => (
              <tr key={t.name} className={t.activeNow ? undefined : "insp-off"}>
                <td className="mono">{t.name}</td>
                <td>{t.kindLabel}</td>
                <td>{t.description}{t.detail && <div className="muted mono insp-small">{t.detail}</div>}</td>
                <td>{[!t.enabled && "Off", t.enabled && !t.activeNow && "Off while web access is off", t.needsConfirmation && "Asks the customer first"].filter(Boolean).join(" · ") || "—"}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Sec>

      <Sec id="connections" title="Connections" count={d.channels.filter((c) => c.status === "live").length + d.connections.length} open>
        <h3 className="insp-h3">Channels</h3>
        <div className="row-list insp-rows">
          {MESSAGING.map((c) => {
            const ch = d.channels.find((x) => x.channel === c);
            const st = ch?.status ?? "off";
            return (
              <div key={c} className="insp-row" id={`insp-ch-${c}`}>
                <b>{CHANNEL_LABEL[c]}</b>
                <span className={`pill ${st === "live" ? "pill-live" : st === "error" ? "pill-err" : st === "pending" ? "pill-warn" : "pill-off"}`}>{ch ? CH_STATUS[st] ?? st : "Not connected"}</span>
                <span className="muted">{ch?.handle ?? ""}{ch ? ` · since ${when(ch.updatedAt)}` : ""}</span>
              </div>
            );
          })}
        </div>
        <p className="insp-small"><Link href={`/bots/${bot.id}/deploy`} style={{ textDecoration: "underline" }}>Manage channels in Deploy</Link></p>

        <h3 className="insp-h3">Apps and servers</h3>
        {d.connections.length === 0 ? <p className="muted" id="insp-no-conn">None yet. Connect your own API or MCP server below and the bot can use it in Test right away.</p> : (
          <div className="row-list insp-rows" id="insp-conn-list">
            {d.connections.map((c) => (
              <div key={c.id} className="insp-conn" id={`insp-conn-${c.id}`}>
                <div className="insp-row">
                  <b>{c.name}</b>
                  <span className="pill pill-blue">{connectors.KIND_LABEL[c.kind]}</span>
                  <span className={`pill ${c.lastError ? "pill-err" : "pill-live"}`}>{c.lastError ? "Failing" : `Checked ${when(c.validatedAt)}`}</span>
                  <span style={{ flex: 1 }} />
                  <ConnectionActions botId={bot.id} connectionId={c.id} name={c.name} />
                </div>
                <div className="muted insp-small mono">{c.address}</div>
                <div className="insp-small">
                  Signs in with {connectors.AUTH_LABEL[c.authKind]}{c.authName ? ` (${c.authName})` : ""} · key {c.keySet ? "•••• (set)" : "not set"} · {c.canWrite ? "can change things (asks first)" : "read-only"}
                  {c.testPath ? <> · tested with GET <span className="mono">{c.testPath}</span></> : null}
                </div>
                {c.lastError && <div className="insp-err insp-small">{c.lastError}</div>}
                <div className="insp-small">Tools: {c.tools.length ? c.tools.map((t) => <span key={t} className="chip mono">{t}</span>) : <span className="insp-err">none in the draft (a rebuild or rollback removes them). Press Recheck to add them back.</span>}</div>
              </div>
            ))}
          </div>
        )}
        <InspectConnectForm botId={bot.id} />
      </Sec>

      <Sec id="keys" title="Keys and settings" count={d.keys.length}>
        {d.keys.length === 0 ? <p className="muted">No keys stored on this bot.</p> : (
          <div className="row-list insp-rows">
            {d.keys.map((k) => (
              <div key={k.key + k.where} className="insp-row"><span className="mono">{k.key}</span><span className="muted">{k.where}</span><span style={{ flex: 1 }} /><span className="mono">{k.set ? "•••• (set)" : "Not set"}</span></div>
            ))}
          </div>
        )}
      </Sec>

      <Sec id="settings" title="Settings">
        <dl className="insp-dl">
          {d.settings.map((s) => <div key={s.label}><dt className="muted">{s.label}</dt><dd className={s.label === "Join code" ? "mono" : undefined}>{s.value}</dd></div>)}
        </dl>
      </Sec>

      <Sec id="tests" title="Test questions" count={d.testQuestions.length} note="What Checks replays before every deploy">
        {d.testQuestions.length === 0 ? <p className="muted">None yet.</p> : (
          <ol className="insp-qs">{d.testQuestions.map((t, i) => (
            <li key={i}><div>{t.question}</div><div className="muted insp-small">{t.expected ? <>Good reply: {t.expected}</> : "No rubric: graded on grounding only"}</div></li>
          ))}</ol>
        )}
      </Sec>

      <Sec id="data" title="Saved data" count={d.savedData.length}>
        {d.savedData.length === 0 ? <p className="muted">This bot keeps no tables.</p> : (
          <div className="row-list insp-rows">
            {d.savedData.map((t) => (
              <div key={t.name} className="insp-conn">
                <div className="insp-row"><b>{t.name}</b><span className="muted">{t.filledBy === "bot" ? "the bot fills it" : "you fill it"}</span><span style={{ flex: 1 }} /><span>{t.rows} row{t.rows === 1 ? "" : "s"}{t.testRows ? <span className="muted"> + {t.testRows} from tests</span> : null}</span></div>
                {t.description && <div className="muted insp-small">{t.description}</div>}
                <div className="insp-small mono muted">{t.columns.join(" · ")}</div>
              </div>
            ))}
          </div>
        )}
        <p className="insp-small"><Link href={`/bots/${bot.id}/data`} style={{ textDecoration: "underline" }}>Open in Data</Link></p>
      </Sec>

      <Sec id="files" title="Files you gave it" count={0} note={d.pages.length ? `plus ${d.pages.length} pages it read from your site` : undefined}>
        <p className="muted">None yet. Threadline doesn&apos;t take file uploads yet; it learns from the pages below.</p>
        {d.pages.length > 0 && (
          <>
            <h3 className="insp-h3">Pages it read · {d.pages.length}</h3>
            <ul className="insp-pages">{d.pages.slice(0, 100).map((p, i) => (
              <li key={i}><span>{p.title || p.url || "Untitled"}</span>{p.url && <span className="muted mono insp-small"> {p.url}</span>}<span className="muted insp-small"> · {Math.round(p.chars / 100) / 10}k chars · {when(p.fetchedAt)}</span></li>
            ))}</ul>
            {d.pages.length > 100 && <p className="muted insp-small">…and {d.pages.length - 100} more.</p>}
          </>
        )}
      </Sec>

      <Sec id="updates" title="Updates" count={d.updates.length}>
        {d.updates.length === 0 ? <p className="muted">None yet.</p> : (
          <div className="row-list insp-rows">
            {d.updates.map((u) => (
              <div key={u.number} className="insp-row"><b>v{u.number}</b>{u.live && <span className="pill pill-live">Live</span>}<span>{u.summary ?? "—"}</span><span style={{ flex: 1 }} /><span className="muted insp-small">{u.createdBy === "threadline" ? "by Threadline" : "your change"} · {when(u.createdAt)}</span></div>
            ))}
          </div>
        )}
        <p className="insp-small"><Link href={`/bots/${bot.id}/versions`} style={{ textDecoration: "underline" }}>All versions</Link></p>
      </Sec>
    </main>
  );
}
