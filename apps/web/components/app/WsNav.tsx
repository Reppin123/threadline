"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IBuild, IData, IChat, IVersions, IStats, ISettings, IDeploy } from "./icons";
import { initials } from "./TopBar";
import { IInspect } from "./InspectIcon";

const ITEMS = [
  ["build", "Build", IBuild],
  ["inspect", "Inspect", IInspect],
  ["deploy", "Deploy", IDeploy],
  ["data", "Data", IData],
  ["conversations", "Conversations", IChat],
  ["versions", "Versions", IVersions],
  ["stats", "Stats", IStats],
] as const;

export function WsNav({ botId, name, status }: { botId: string; name: string; status: string }) {
  const path = usePathname();
  return (
    <nav className="ws-nav" aria-label="Bot">
      <div className="ws-bot">
        <span className="avatar">{initials(name)}</span>
        <div style={{ minWidth: 0 }}><b>{name}</b><span className="muted" style={{ fontSize: 12 }}>{status === "live" ? "Live" : status === "building" ? "Building…" : status === "error" ? "Needs attention" : "Not live"}</span></div>
      </div>
      {ITEMS.map(([seg, label, Icon]) => {
        const href = `/bots/${botId}/${seg}`;
        return (
          <Link key={seg} href={href} aria-current={path?.startsWith(href) ? "page" : undefined} id={`nav-${seg}`}>
            <Icon /> {label}
          </Link>
        );
      })}
      <div className="bottom">
        <button type="button" onClick={() => window.dispatchEvent(new Event("tl:settings"))} id="nav-settings"><ISettings /> Settings</button>
      </div>
    </nav>
  );
}
