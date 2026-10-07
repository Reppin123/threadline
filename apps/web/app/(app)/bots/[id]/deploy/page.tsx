import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import { get, json } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { channelsOf, getBot, profileOf, fmtDate } from "@/lib/data";
import { currentVersion, versionsOf } from "@/lib/versions";
import { diff } from "@/lib/diff";
import { DiffList } from "@/components/app/DiffList";
import { ChannelCards } from "@/components/app/ChannelCards";
import { DeployButton } from "@/components/app/DeployButton";
import { ChecksPanel } from "@/components/app/ChecksPanel";

export const metadata: Metadata = { title: "Review and deploy" };

export default async function DeployPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/bots/${id}/deploy`);
  const bot = getBot(user.id, id);
  const channels = channelsOf(bot.id);
  const live = channels.filter((c) => c.status === "live");
  const versions = versionsOf(bot.id);
  const cur = currentVersion(bot.id, bot.current_version_id) ?? versions.find((v) => v.status === "current");
  const nothingToDeploy = !!bot.current_version_id && !bot.draft_dirty;
  const isLive = live.length > 0 && !!bot.current_version_id;

  const handle = process.env.IMESSAGE_LINE_HANDLE || null;
  const body = `START ${bot.join_code}`;
  const sms = handle ? `sms:${handle}?&body=${encodeURIComponent(body)}` : `sms:?&body=${encodeURIComponent(body)}`;
  const qr = await QRCode.toDataURL(sms, { margin: 1, width: 320, color: { dark: "#0b0c0f", light: "#ffffff" } });
  const tg = channels.find((c) => c.channel === "telegram");

  const draft = { profile: profileOf(bot), web_access: !!bot.web_access };
  const curSnap = cur ? json.parse<any>(cur.snapshot_json, {}) : null;
  const changes = curSnap ? diff({ profile: curSnap.profile ?? curSnap, web_access: curSnap.web_access ?? curSnap.webAccess ?? draft.web_access }, draft) : [];
  const latestRun = get<{ id: string }>("SELECT id FROM test_runs WHERE bot_id=? ORDER BY created_at DESC, rowid DESC LIMIT 1", [bot.id]);

  return (
    <main id="main" className="ws-page">
      <div className="page-head" style={{ marginBottom: 18 }}>
        <div>
          <div className="eyebrow">{bot.name}</div>
          <h1 style={{ fontSize: 28, marginTop: 4 }}>Review and <span className="h-serif">deploy</span></h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link className="btn" href={`/bots/${bot.id}/build`}>Back to Build</Link>
          <DeployButton botId={bot.id} nothing={nothingToDeploy} />
        </div>
      </div>
      {nothingToDeploy ? (
        <div className="note-box" style={{ background: "#fff", borderColor: "var(--line)", color: "var(--ink-2)" }}>
          Nothing to deploy: your latest version{cur ? ` (v${cur.number})` : ""} is the current one.{isLive ? "" : " Connect a channel so customers can reach it."}
        </div>
      ) : !bot.current_version_id ? (
        <div className="note-box" style={{ background: "var(--blue-soft)", borderColor: "#b8d7ff", color: "#004a9f" }}>
          Your draft hasn&apos;t been deployed yet. Connect iMessage below, then press <b>Deploy to customers</b> — customers get exactly what you tested.
        </div>
      ) : (
        <div className="note-box">Your draft has changes customers don&apos;t have yet. Run the checks, then deploy.</div>
      )}

      <section className="sec">
        <div className="card status-block" id="deploy-status">
          <span className={`pill ${isLive ? "pill-live" : "pill-off"}`}>{isLive ? "Live" : "Not live"}</span>
          <div>
            <div style={{ fontWeight: 600 }}>{isLive ? `Customers can reach ${bot.name}` : "Customers can't reach your bot yet"}</div>
            <div className="muted" style={{ fontSize: 13.5 }}>
              {isLive ? `On ${live.map((c) => (c.channel === "imessage" ? "iMessage" : c.channel === "telegram" ? "Telegram" : c.channel)).join(", ")}` : live.length ? "A channel is connected — deploy a version to go live." : "Connect a channel, then deploy."}
            </div>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="sec-head"><h2>Channels</h2><p>iMessage first. Your customers text one shared Threadline number with your code.</p></div>
        <ChannelCards
          botId={bot.id}
          joinCode={bot.join_code}
          handle={handle}
          sms={sms}
          qr={qr}
          imessage={channels.find((c) => c.channel === "imessage")?.status === "live"}
          telegram={tg?.status === "live"}
          telegramHasToken={!!json.parse<any>(tg?.config_json, {})?.token}
        />
      </section>

      <section className="sec">
        <div className="sec-head">
          <h2>Current version</h2>
          <p>{cur ? <>v{cur.number} · <span className="mono">{cur.hash.slice(0, 7)}</span> · {fmtDate(cur.created_at)}</> : bot.current_version_id ? "Deployed" : "None yet — your first deploy becomes v1."}</p>
        </div>
        <div className="card box">
          <h3>What changed</h3>
          <p style={{ marginBottom: 10 }}>{cur ? `Your draft compared with v${cur.number}.` : "Everything is new in the first version."}</p>
          {cur ? <DiffList changes={changes} empty="No changes since the current version." /> : (
            <DiffList changes={diff({}, { profile: { capabilities: draft.profile.capabilities ?? [], guardrails: draft.profile.guardrails ?? [] } })} empty="Your first version." />
          )}
        </div>
      </section>

      <section className="sec">
        <div className="sec-head"><h2>Checks</h2></div>
        <ChecksPanel botId={bot.id} initialRunId={latestRun?.id ?? null} />
      </section>

      <p className="muted" style={{ fontSize: 13.5, marginTop: 26 }}>
        Changed your mind after deploying? Every version stays in <Link href={`/bots/${bot.id}/versions`} style={{ textDecoration: "underline" }}>Versions</Link>, and you can roll back to one from there.
      </p>
    </main>
  );
}
