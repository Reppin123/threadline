"use client";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { IChevron, IPlus, ISettings, IDeploy } from "./icons";
import { SettingsModal, type SettingsData } from "./SettingsModal";

export interface TopBarProps extends SettingsData {
  trial: { pct: number; used: number; left: number; credit: number; daysLeft: number | null };
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "B";
}

export function TopBar(props: TopBarProps) {
  const params = useParams<{ id?: string }>();
  const path = usePathname();
  const current = props.bots.find((b) => b.id === params?.id);
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onSettings = () => setSettings(true);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("tl:settings", onSettings);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); window.removeEventListener("tl:settings", onSettings); };
  }, []);

  const t = props.trial;
  const isBuild = !!current && path?.endsWith("/build");
  return (
    <>
      <header className="topbar">
        <Link href="/dashboard" aria-label="Threadline — your bots"><Logo word={false} /></Link>
        <Link href="/dashboard" className="tb-link" aria-current={path === "/dashboard" ? "page" : undefined}>Your bots</Link>
        {props.bots.length > 0 && (
          <>
            <span className="tb-sep hide-sm" aria-hidden="true" />
            <div className="tb-switch" ref={menuRef}>
              <button aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} id="bot-switcher">
                {current ? <span className="avatar">{initials(current.name)}</span> : null}
                <span className="name">{current ? current.name : "Switch bot"}</span>
                <IChevron size={15} />
              </button>
              {open && (
                <div className="menu" role="menu">
                  {props.bots.map((b) => (
                    <Link key={b.id} role="menuitem" href={`/bots/${b.id}/build`} onClick={() => setOpen(false)}>
                      <span className="avatar">{initials(b.name)}</span>
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</span>
                      {b.id === current?.id && <span className="muted" style={{ fontSize: 12 }}>Open now</span>}
                    </Link>
                  ))}
                  <hr />
                  <Link role="menuitem" href="/bots/new" onClick={() => setOpen(false)}><IPlus size={16} /> New bot</Link>
                </div>
              )}
            </div>
          </>
        )}
        <span className="tb-spacer" />
        <button className={`meter hide-sm${t.pct >= 80 ? " warn" : ""}`} onClick={() => setSettings(true)} title={`$${t.used.toFixed(2)} of $${t.credit.toFixed(2)} trial credit used`} id="trial-meter">
          <span className="bar"><i style={{ width: `${Math.max(2, t.pct)}%` }} /></span>
          {t.pct}% of trial used
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setSettings(true)} id="open-settings"><ISettings size={16} /><span className="hide-sm">Settings</span></button>
        <form method="post" action="/auth/logout" className="hide-sm"><button className="btn btn-ghost btn-sm" type="submit">Log out</button></form>
        {isBuild ? (
          <Link className="btn btn-blue btn-sm" href={`/bots/${current!.id}/deploy`} id="review-deploy">Review and deploy <IDeploy size={15} /></Link>
        ) : (
          <Link className="btn btn-primary btn-sm" href="/bots/new" id="new-bot"><IPlus size={15} /> New bot</Link>
        )}
      </header>
      {settings && <SettingsModal {...props} currentBotId={current?.id ?? null} onClose={() => setSettings(false)} />}
    </>
  );
}
