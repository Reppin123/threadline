"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { connectTelegram, disconnectTelegram } from "@/app/(app)/bots/[id]/deploy/telegram-actions";
import { ITelegram } from "./icons";

export interface TelegramState { status: "live" | "error" | "off"; username: string | null }

/** Channel card: 3-step BotFather setup → token → validated + connected. */
export function TelegramCard({ botId, tg }: { botId: string; tg: TelegramState }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(tg.status === "error");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const live = tg.status === "live";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await connectTelegram(botId, token);
      if (!r.ok) { setError(r.error); return; }
      setToken("");
      setOpen(false);
      router.refresh();
    });
  };
  const off = () => start(async () => { await disconnectTelegram(botId); router.refresh(); });

  return (
    <div className="card ch-card" id="telegram-card">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="ch-ic" style={{ background: "#2aabee" }}><ITelegram /></span>
        <div style={{ flex: 1 }}>
          <b>Telegram</b>
          <div className="muted" style={{ fontSize: 12.5 }} id="telegram-status">
            {live ? `Connected as @${tg.username}` : tg.status === "error" ? "Token stopped working" : "Not set up"}
          </div>
        </div>
        {live && <span className="pill pill-live">On</span>}
        {tg.status === "error" && <span className="pill pill-err">Error</span>}
      </div>

      {live ? (
        <>
          <p className="muted" style={{ fontSize: 13.5 }}>Customers message <b>@{tg.username}</b> on Telegram and your bot answers.</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a className="btn btn-sm" href={`https://t.me/${tg.username}`} target="_blank" rel="noreferrer">Open in Telegram</a>
            <button className="btn btn-sm" disabled={pending} onClick={off} id="telegram-disconnect">{pending ? "Turning off…" : "Turn off Telegram"}</button>
          </div>
        </>
      ) : open ? (
        <form onSubmit={submit} style={{ display: "grid", gap: 10 }} id="telegram-form">
          {tg.status === "error" && (
            <p style={{ fontSize: 13, color: "var(--red)", margin: 0 }}>Telegram rejected the saved token (it was revoked or regenerated). Paste the current one.</p>
          )}
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, display: "grid", gap: 4 }}>
            <li>Open <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>@BotFather</a> in Telegram.</li>
            <li>Send <span className="mono">/newbot</span>, then pick a name and a username ending in “bot”.</li>
            <li>Paste the token it sends you here.</li>
          </ol>
          <input
            className="input" placeholder="123456789:AAH4k…" value={token} onChange={(e) => { setToken(e.target.value); setError(null); }}
            aria-label="Telegram bot token" aria-invalid={!!error} aria-describedby={error ? "telegram-error" : undefined}
            autoComplete="off" spellCheck={false} id="telegram-token"
          />
          {error && <p role="alert" id="telegram-error" style={{ fontSize: 13, color: "var(--red)", margin: 0 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-sm btn-primary" disabled={pending || !token.trim()} id="telegram-connect">{pending ? "Checking with Telegram…" : "Connect"}</button>
            <button type="button" className="btn btn-sm" onClick={() => { setOpen(false); setError(null); }}>Cancel</button>
          </div>
        </form>
      ) : (
        <>
          <p className="muted" style={{ fontSize: 13.5 }}>Make a bot with @BotFather in three steps, paste its token, and we answer on it.</p>
          <button className="btn" onClick={() => setOpen(true)} id="connect-telegram">Connect Telegram</button>
        </>
      )}
    </div>
  );
}

/** Shown under the cards once Telegram is live: the link customers use + QR. */
export function TelegramShare({ username, qr }: { username: string; qr: string }) {
  const [copied, setCopied] = useState(false);
  const url = `https://t.me/${username}`;
  return (
    <div className="card join" id="telegram-share">
      <div>
        <div className="eyebrow">How customers start on Telegram</div>
        <p style={{ margin: "8px 0 10px", fontSize: 15 }}>
          Share <a className="mono" href={url} target="_blank" rel="noreferrer" id="telegram-link" style={{ fontWeight: 600 }}>t.me/{username}</a>
        </p>
        <p className="muted" style={{ fontSize: 13.5 }}>They tap <b>Start</b> and get your greeting. Every message after that goes to your bot.</p>
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <a className="btn btn-sm" style={{ background: "#2aabee", borderColor: "#2aabee", color: "#fff" }} href={url} target="_blank" rel="noreferrer" id="telegram-open">Open in Telegram</a>
          <button className="btn btn-sm" onClick={() => { navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied" : "Copy link"}</button>
        </div>
      </div>
      <figure style={{ margin: 0, textAlign: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="qr" src={qr} alt={`QR code: t.me/${username}`} id="telegram-qr" />
        <figcaption className="muted" style={{ fontSize: 12, marginTop: 6 }}>Scan with a phone camera</figcaption>
      </figure>
    </div>
  );
}
