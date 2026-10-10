"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createApiKey, deleteBot, renameBot, revokeApiKey } from "@/app/(app)/actions";
import { IX } from "./icons";

export interface SettingsData {
  user: { name: string | null; email: string; plan: string };
  bots: { id: string; name: string; status: string }[];
  apiKeys: { id: string; name: string | null; key_prefix: string; bot_id: string | null; can_read_notes: number; created_at: string; last_used_at: string | null }[];
  trial: { pct: number; used: number; left: number; credit: number; daysLeft: number | null };
  appUrl: string;
}

export function SettingsModal(props: SettingsData & { currentBotId: string | null; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const bot = props.bots.find((b) => b.id === props.currentBotId) ?? null;
  const [name, setName] = useState(bot?.name ?? "");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [keyName, setKeyName] = useState("");
  const [onlyBot, setOnlyBot] = useState(!!bot);
  const [notes, setNotes] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") props.onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [props]);

  const exampleBot = bot?.id ?? props.bots[0]?.id ?? "BOT_ID";
  const curl = `curl -X POST ${props.appUrl}/api/v1/bots/${exampleBot}/messages \\
  -H "Authorization: Bearer $THREADLINE_KEY" \\
  -H "Idempotency-Key: order-1042-ready" \\
  -H "Content-Type: application/json" \\
  -d '{"to": "imessage:+15551234567", "prompt": "Tell them order 1042 is ready for pickup"}'`;

  return (
    <div className="modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) props.onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" id="settings-modal">
        <div className="modal-head">
          <h2 id="settings-title">Settings</h2>
          <button className="icon-btn" onClick={props.onClose} aria-label="Close settings"><IX /></button>
        </div>
        <div className="modal-body">
          <section className="modal-sec">
            <h3>Your bots</h3>
            <div className="card row-list" style={{ marginTop: 10 }}>
              {props.bots.length === 0 && <div className="row muted">No bots yet.</div>}
              {props.bots.map((b) => (
                <div className="row" key={b.id}>
                  <div className="grow"><div className="title">{b.name}</div><div className="meta">{b.status}</div></div>
                  {b.id === bot?.id ? <span className="pill pill-blue no-dot">Open now</span> : <Link className="btn btn-sm" href={`/bots/${b.id}/build`} onClick={props.onClose}>Open</Link>}
                </div>
              ))}
            </div>
            <Link className="btn btn-sm" style={{ marginTop: 10 }} href="/bots/new" onClick={props.onClose}>New bot</Link>
          </section>

          {bot && (
            <section className="modal-sec">
              <h3>This bot</h3>
              <p>Rename it, or delete it for good.</p>
              <form className="toolbar" onSubmit={(e) => { e.preventDefault(); start(async () => { await renameBot(bot.id, name); router.refresh(); }); }}>
                <label className="sr-only" htmlFor="bot-name">Name</label>
                <input id="bot-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
                <button className="btn" disabled={pending || !name.trim() || name === bot.name}>Rename</button>
              </form>
              <details>
                <summary className="btn btn-danger btn-sm" style={{ listStyle: "none", display: "inline-flex" }}>Delete this bot…</summary>
                <div className="note-box" style={{ marginTop: 10 }}>
                  Customers can no longer reach it: its channels and scheduled messages stop, and its chats and saved data are deleted.
                  Type <b>{bot.name}</b> to confirm.
                  <div className="toolbar" style={{ marginTop: 10, marginBottom: 0 }}>
                    <input className="input" value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} aria-label="Type the bot name to confirm" />
                    <button className="btn btn-danger" disabled={pending || confirmDelete !== bot.name} onClick={() => start(async () => { await deleteBot(bot.id); })}>Delete forever</button>
                  </div>
                </div>
              </details>
            </section>
          )}

          <section className="modal-sec">
            <h3>Plan</h3>
            <p>
              Free trial: {props.trial.pct}% used — ${props.trial.used.toFixed(2)} of ${props.trial.credit.toFixed(2)}, ${props.trial.left.toFixed(2)} left
              {props.trial.daysLeft !== null ? `. At this rate it lasts about ${props.trial.daysLeft} more days.` : "."}
            </p>
            <div className="toolbar" style={{ marginBottom: 0 }}>
              <span className="muted" style={{ fontSize: 13.5 }}>Plan, monthly messages and invoices live on the Billing page.</span>
              <a className="btn btn-sm" href="/billing" id="settings-billing-link">Billing</a>
            </div>
          </section>

          <section className="modal-sec">
            <h3>API</h3>
            <p>Let your own systems send customers check-ins, schedule follow-ups, and read customers, chats and tables.</p>
            {newKey && (
              <div style={{ marginBottom: 12 }}>
                <div className="ok-box" style={{ marginBottom: 8 }}>Copy your key now — we only show it once.</div>
                <div className="keybox" id="new-api-key">{newKey}</div>
                <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => { navigator.clipboard?.writeText(newKey); setCopied(true); }}>{copied ? "Copied" : "Copy key"}</button>
              </div>
            )}
            <form
              className="toolbar"
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  const r = await createApiKey({ name: keyName, botId: onlyBot ? bot?.id : null, canReadNotes: notes });
                  setNewKey(r.key); setCopied(false); setKeyName(""); router.refresh();
                });
              }}
            >
              <input className="input" placeholder="Key name (optional)" value={keyName} onChange={(e) => setKeyName(e.target.value)} aria-label="Key name" />
              {bot && <label className="check"><input type="checkbox" checked={onlyBot} onChange={(e) => setOnlyBot(e.target.checked)} /> Only this bot</label>}
              <label className="check"><input type="checkbox" checked={notes} onChange={(e) => setNotes(e.target.checked)} /> Can read customer notes</label>
              <button className="btn btn-primary btn-sm" disabled={pending} id="create-key">Create key</button>
            </form>
            {props.apiKeys.length > 0 && (
              <div className="card row-list" style={{ marginBottom: 12 }}>
                {props.apiKeys.map((k) => (
                  <div className="row" key={k.id}>
                    <div className="grow">
                      <div className="title mono" style={{ fontSize: 13 }}>{k.key_prefix}…</div>
                      <div className="meta">
                        {k.name || "Unnamed"} · {k.bot_id ? props.bots.find((b) => b.id === k.bot_id)?.name ?? "one bot" : "all bots"}
                        {k.can_read_notes ? " · reads notes" : ""} · {k.last_used_at ? `last used ${k.last_used_at.slice(0, 10)}` : "never used"}
                      </div>
                    </div>
                    <button className="btn btn-sm btn-danger" disabled={pending} onClick={() => start(async () => { await revokeApiKey(k.id); router.refresh(); })}>Revoke</button>
                  </div>
                ))}
              </div>
            )}
            <pre className="code">{curl}</pre>
            <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
              Your bot writes the message itself from the prompt. Add <span className="mono">&quot;send_at&quot;</span> (ISO time) to schedule it.
              Also: <span className="mono">GET /api/v1/bots/:id/customers</span>, <span className="mono">/conversations</span>, <span className="mono">/tables/:name/rows</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
