"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { connectChannel, disconnectChannel } from "@/app/(app)/actions";
import { IApple, IWhatsApp } from "./icons";
import { TelegramCard, TelegramShare, type TelegramState } from "./TelegramCard";

export function ChannelCards(p: { botId: string; joinCode: string; handle: string | null; sms: string; qr: string; imessage: boolean; tg: TelegramState; tgQr: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const act = (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh(); });
  return (
    <>
      <div className="ch-grid">
        <div className="card ch-card first">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="ch-ic" style={{ background: "linear-gradient(#5fd35f,#22b33a)" }}><IApple /></span>
            <div style={{ flex: 1 }}><b>iMessage</b><div className="muted" style={{ fontSize: 12.5 }}>{p.imessage ? "Connected" : "Not set up"}</div></div>
            {p.imessage && <span className="pill pill-live">On</span>}
          </div>
          <p className="muted" style={{ fontSize: 13.5 }}>Blue bubbles. Customers text the Threadline line with your code — no app, no sign-up.</p>
          {p.imessage ? (
            <button className="btn btn-sm" disabled={pending} onClick={() => act(() => disconnectChannel(p.botId, "imessage"))}>Turn off iMessage</button>
          ) : (
            <button className="btn btn-blue" disabled={pending} onClick={() => act(() => connectChannel(p.botId, "imessage"))} id="connect-imessage">Connect iMessage</button>
          )}
        </div>
        <TelegramCard botId={p.botId} tg={p.tg} />
        <div className="card ch-card">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="ch-ic" style={{ background: "#25d366" }}><IWhatsApp /></span>
            <div style={{ flex: 1 }}><b>WhatsApp</b><div className="muted" style={{ fontSize: 12.5 }}>Coming soon</div></div>
          </div>
          <p className="muted" style={{ fontSize: 13.5 }}>WhatsApp Business needs Meta&apos;s approval for your number. We&apos;ll walk you through it.</p>
          <a className="btn" href="mailto:hello@threadline.app?subject=WhatsApp%20early%20access">Join the waitlist</a>
        </div>
      </div>

      {p.imessage && (
        <div className="card join" id="imessage-join">
          <div>
            <div className="eyebrow">How customers start</div>
            <p style={{ margin: "8px 0 10px", fontSize: 15 }}>
              Text <span className="join-code" id="join-code">START {p.joinCode}</span>
            </p>
            <p style={{ fontSize: 14 }}>
              to{" "}
              {p.handle ? <b className="mono" id="line-handle">{p.handle}</b> : <span className="pill pill-warn no-dot" id="line-handle">line not configured</span>}
            </p>
            {!p.handle && (
              <p className="muted" style={{ fontSize: 12.5, marginTop: 8, maxWidth: 440 }}>
                The shared iMessage line isn&apos;t configured on this server yet (IMESSAGE_LINE_HANDLE). Your code works the moment it is.
              </p>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <a className="btn btn-blue btn-sm" href={p.sms} id="sms-link">Open in Messages</a>
              <button className="btn btn-sm" onClick={() => { navigator.clipboard?.writeText(`START ${p.joinCode}`); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied" : "Copy code"}</button>
            </div>
            <p className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>Later messages from that customer go straight to your bot. They can text “stop” any time.</p>
          </div>
          <figure style={{ margin: 0, textAlign: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="qr" src={p.qr} alt={`QR code: text START ${p.joinCode}`} id="imessage-qr" />
            <figcaption className="muted" style={{ fontSize: 12, marginTop: 6 }}>Scan with an iPhone camera</figcaption>
          </figure>
        </div>
      )}
      {p.tg.status === "live" && p.tg.username && p.tgQr && <TelegramShare username={p.tg.username} qr={p.tgQr} />}
    </>
  );
}
