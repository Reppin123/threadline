"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { builderSend, playgroundClear, playgroundSend, setWebAccess, renameBot } from "@/app/(app)/actions";
import { IAttach, IMic, IPin, ISend, IPlus } from "./icons";
import { BuilderMark } from "./BuilderMark";
import { initials } from "./TopBar";

export type BMsg = { id: string; role: "user" | "assistant"; content: string };
export type PMsg = { id: string; kind: "me" | "them" | "tool" | "note"; text: string; pending?: boolean };
type Skin = "imessage" | "telegram" | "whatsapp";

function Composer(props: { id: string; placeholder: string; busy: boolean; onSend: (t: string) => void; onFile?: (f: File) => void; hint?: boolean; extra?: React.ReactNode }) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const send = () => { const t = text.trim(); if (!t || props.busy) return; props.onSend(t); setText(""); };
  useEffect(() => { const el = ref.current; if (el) { el.style.height = "auto"; el.style.height = Math.min(200, el.scrollHeight) + "px"; } }, [text]);
  return (
    <form className="composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
      <div className="composer-box">
        <label className="sr-only" htmlFor={props.id}>{props.placeholder}</label>
        <textarea id={props.id} ref={ref} rows={1} placeholder={props.placeholder} value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <div className="composer-row">
          {props.onFile && (
            <label className="icon-btn" title="Attach a file" style={{ cursor: "pointer" }}>
              <IAttach /><span className="sr-only">Attach a file</span>
              <input type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) props.onFile!(f); e.target.value = ""; }} />
            </label>
          )}
          {props.extra}
          {props.hint && <span className="composer-hint">Enter to send · Shift+Enter for a new line</span>}
          <button className="send-btn" type="submit" disabled={!text.trim() || props.busy} aria-label="Send" style={{ marginLeft: props.hint ? 0 : "auto" }}><ISend size={17} /></button>
        </div>
      </div>
    </form>
  );
}

export function Builder(props: { botId: string; name: string; status: string; greeting: string | null; webAccess: boolean; thread: string; messages: BMsg[]; suggestions: string[]; preview: PMsg[] }) {
  const router = useRouter();
  const [bmsgs, setBmsgs] = useState<BMsg[]>(props.messages);
  const [sugg, setSugg] = useState(props.suggestions);
  const [bBusy, setBBusy] = useState(false);
  const [bErr, setBErr] = useState<string | null>(null);
  const [pmsgs, setPmsgs] = useState<PMsg[]>(props.preview);
  const [pBusy, setPBusy] = useState(false);
  const [skin, setSkin] = useState<Skin>("imessage");
  const [web, setWeb] = useState(props.webAccess);
  const [name, setName] = useState(props.name);
  const [editing, setEditing] = useState(false);
  const [, start] = useTransition();
  const bEnd = useRef<HTMLDivElement>(null);
  const pBody = useRef<HTMLDivElement>(null);

  useEffect(() => { setBmsgs(props.messages); }, [props.messages]);
  useEffect(() => { bEnd.current?.scrollIntoView({ block: "end" }); }, [bmsgs, bBusy]);
  useEffect(() => { pBody.current?.scrollTo({ top: pBody.current.scrollHeight, behavior: "smooth" }); }, [pmsgs, pBusy]);

  async function sendBuilder(t: string) {
    setBErr(null);
    setBmsgs((m) => [...m, { id: "tmp" + Date.now(), role: "user", content: t }]);
    setBBusy(true);
    const r = await builderSend(props.botId, t, props.thread);
    setBBusy(false);
    if (!r.ok) { setBErr(r.error); return; }
    setBmsgs((m) => [...m, { id: "r" + Date.now(), role: "assistant", content: r.reply.reply }]);
    if (r.reply.suggestions?.length) setSugg(r.reply.suggestions);
    router.refresh();
  }

  async function sendPreview(t: string, extra: Parameters<typeof playgroundSend>[2] = {}) {
    setPmsgs((m) => [...m, { id: "u" + Date.now(), kind: "me", text: t }]);
    setPBusy(true);
    const r = await playgroundSend(props.botId, t, extra);
    if (!r.ok) {
      setPBusy(false);
      setPmsgs((m) => [...m, { id: "e" + Date.now(), kind: "note", text: `Couldn't get a reply: ${r.error}` }]);
      return;
    }
    const tools: PMsg[] = r.result.toolCalls.map((tc, i) => ({ id: `t${Date.now()}${i}`, kind: "tool", text: `${tc.ok ? "⚙" : "⚠"} ${tc.name}` }));
    if (tools.length) setPmsgs((m) => [...m, ...tools]);
    const replies = r.result.replies.length ? r.result.replies : ["(no reply)"];
    for (let i = 0; i < replies.length; i++) {
      if (i > 0) await new Promise((res) => setTimeout(res, 450));
      setPmsgs((m) => [...m, { id: `a${Date.now()}${i}`, kind: "them", text: replies[i]! }]);
    }
    setPBusy(false);
  }

  async function uploadAndSend(f: File) {
    const fd = new FormData(); fd.set("file", f);
    const up = await fetch(`/api/app/bots/${props.botId}/upload`, { method: "POST", body: fd }).then((r) => r.json()).catch(() => null);
    if (!up?.path) { setPmsgs((m) => [...m, { id: "e" + Date.now(), kind: "note", text: up?.error || "Upload failed" }]); return; }
    await sendPreview(`📎 ${f.name}`, { attachments: [up] });
  }

  function shareLocation() {
    const go = (lat: number, lng: number) => void sendPreview("📍 Shared a location", { location: { lat, lng } });
    if (!navigator.geolocation) return go(37.7749, -122.4194);
    navigator.geolocation.getCurrentPosition((p) => go(p.coords.latitude, p.coords.longitude), () => go(37.7749, -122.4194), { timeout: 4000 });
  }

  const statusLine = props.status === "live" ? "Live on your channels" : pBusy ? "typing…" : "Preview · uses your draft";
  return (
    <main id="main" className="build">
      <section className="build-left" aria-label="Builder">
        <div className="pane-head">
          <div>
            <div className="eyebrow">Edit</div>
            <h1>Tell the builder what to change</h1>
          </div>
          <Link className="btn btn-sm" href={`/bots/${props.botId}/build?thread=t${Date.now().toString(36)}`} id="new-chat"><IPlus size={14} /> New chat</Link>
        </div>
        <div className="bchat" aria-live="polite" id="builder-chat">
          {bmsgs.map((m) =>
            m.role === "user" ? <div key={m.id} className="bmsg user">{m.content}</div> : (
              <div key={m.id} className="bmsg assistant"><BuilderMark /><div className="txt">{m.content}</div></div>
            ),
          )}
          {bmsgs.length === 0 && <p className="muted" style={{ fontSize: 14 }}>New chat. Describe a change and the builder edits your draft.</p>}
          {bBusy && <div className="bmsg assistant"><BuilderMark /><div className="typing"><i /><i /><i /></div></div>}
          {bErr && <div className="error-box" role="alert">{bErr}</div>}
          <div ref={bEnd} />
        </div>
        {sugg.length > 0 && (
          <div className="sugg chips" aria-label="Suggestions">
            {sugg.map((s) => <button key={s} className="chip" onClick={() => !bBusy && sendBuilder(s)} disabled={bBusy}>{s}</button>)}
          </div>
        )}
        <Composer
          id="builder-input"
          placeholder="Describe a change, like 'ask about allergies first'"
          busy={bBusy}
          onSend={sendBuilder}
          hint
          onFile={async (f) => {
            const isText = /^text\/|json|csv|markdown/.test(f.type) || /\.(txt|md|csv|json)$/i.test(f.name);
            if (!isText) { setBErr("For now the builder reads text files (.txt, .md, .csv, .json)."); return; }
            await sendBuilder(`Use this file (${f.name}):\n${(await f.text()).slice(0, 12000)}`);
          }}
        />
      </section>

      <section className={`build-right skin-${skin}`} aria-label="Preview">
        <div className="preview-bar">
          <span className="muted" style={{ fontSize: 12.5 }}>Preview as</span>
          <div className="seg" role="radiogroup" aria-label="Preview as">
            {(["imessage", "telegram", "whatsapp"] as Skin[]).map((s) => (
              <button key={s} role="radio" aria-checked={skin === s} onClick={() => setSkin(s)} id={`skin-${s}`}>{s === "imessage" ? "iMessage" : s === "telegram" ? "Telegram" : "WhatsApp"}</button>
            ))}
          </div>
          <span style={{ flex: 1 }} />
          <button className="toggle" role="switch" aria-checked={web} onClick={() => { setWeb(!web); start(() => setWebAccess(props.botId, !web)); }} title="Let the bot look things up on the web">
            <span className="sw" /> Web access {web ? "on" : "off"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setPmsgs([]); start(() => playgroundClear(props.botId)); }} id="preview-clear">Clear</button>
        </div>
        <div className="phone-wrap">
          <div className="phone">
            <div className="phone-head">
              <span className="avatar">{initials(name)}</span>
              <div>
                {editing ? (
                  <form onSubmit={(e) => { e.preventDefault(); setEditing(false); start(async () => { await renameBot(props.botId, name); router.refresh(); }); }}>
                    <input autoFocus className="input" style={{ height: 28, padding: "2px 8px", fontSize: 13, textAlign: "center" }} value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setEditing(false)} aria-label="Bot name" />
                  </form>
                ) : (
                  <button className="nm" style={{ background: "none", border: 0, padding: 0, color: "inherit" }} onClick={() => setEditing(true)} title="Click to rename">{name} ›</button>
                )}
                <div className="st">{skin === "imessage" ? (pBusy ? "typing…" : "iMessage") : statusLine}</div>
              </div>
            </div>
            <div className="phone-body" ref={pBody} id="preview-thread">
              <div className="imsg">
                <div className="day">{skin === "imessage" ? "iMessage · Today" : "Today"}</div>
                {pmsgs.length === 0 && (
                  <div className="empty-chat">
                    Text your bot like a customer would.{props.greeting ? <><br /><br />It opens with: “{props.greeting}”</> : null}
                  </div>
                )}
                {pmsgs.map((m, i) => {
                  if (m.kind === "tool") return <div key={m.id} className="toolchip">{m.text}</div>;
                  if (m.kind === "note") return <div key={m.id} className="empty-chat" style={{ padding: "6px 10px", color: "var(--red)" }}>{m.text}</div>;
                  const nxt = pmsgs[i + 1];
                  const tail = !nxt || nxt.kind !== m.kind;
                  const prev = pmsgs[i - 1];
                  const gap = prev && prev.kind !== m.kind && prev.kind !== "tool";
                  return <div key={m.id} className={`bub ${m.kind}${tail ? " tail" : ""}${gap ? " gap" : ""}`} data-role={m.kind}>{m.text}</div>;
                })}
                {pBusy && <div className="typing" aria-label="Bot is typing"><i /><i /><i /></div>}
                {!pBusy && pmsgs.length > 0 && pmsgs.at(-1)!.kind === "them" && skin === "imessage" ? null : null}
              </div>
            </div>
            <div className="phone-foot">
              <label className="icon-btn" title="Send a photo or file" style={{ cursor: "pointer" }}>
                <IAttach size={17} /><span className="sr-only">Send a photo or file</span>
                <input type="file" hidden accept="image/*,application/pdf,.txt,.csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadAndSend(f); e.target.value = ""; }} />
              </label>
              <button className="icon-btn" type="button" onClick={shareLocation} title="Share a location" aria-label="Share a location" disabled={pBusy}><IPin size={17} /></button>
              <PreviewInput busy={pBusy} onSend={(t) => void sendPreview(t)} skin={skin} />
              <button className="icon-btn" type="button" disabled title="Voice notes: coming soon" aria-label="Record a voice note (coming soon)"><IMic size={17} /></button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function PreviewInput({ busy, onSend, skin }: { busy: boolean; onSend: (t: string) => void; skin: Skin }) {
  const [t, setT] = useState("");
  const go = () => { const v = t.trim(); if (!v || busy) return; onSend(v); setT(""); };
  return (
    <form style={{ display: "flex", flex: 1, gap: 4, minWidth: 0 }} onSubmit={(e) => { e.preventDefault(); go(); }}>
      <label className="sr-only" htmlFor="preview-input">Message your bot</label>
      <input id="preview-input" value={t} onChange={(e) => setT(e.target.value)} placeholder={skin === "imessage" ? "iMessage" : "Message"} autoComplete="off" />
      <button className="send-btn" type="submit" disabled={!t.trim() || busy} aria-label="Send" id="preview-send"><ISend size={16} /></button>
    </form>
  );
}
