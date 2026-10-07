import type { Metadata } from "next";
import Link from "next/link";
import { json } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { CHANNEL_LABEL, fmtDate, getBot, liveChannels } from "@/lib/data";
import { runSummary, versionsOf } from "@/lib/versions";
import { diff } from "@/lib/diff";
import { DiffList } from "@/components/app/DiffList";
import { RollbackButton } from "@/components/app/SmallActions";

export const metadata: Metadata = { title: "Versions" };

export default async function VersionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/bots/${id}/versions`);
  const bot = getBot(user.id, id);
  const versions = versionsOf(bot.id);
  const live = liveChannels(bot.id);
  return (
    <main id="main" className="ws-page">
      <div className="page-head">
        <div><div className="eyebrow">{bot.name}</div><h1 style={{ fontSize: 28, marginTop: 4 }}>Versions</h1></div>
        <p>Each version customers got is listed here, newest first, with how its checks went. Open one to see what changed, or go back to it.</p>
      </div>
      {versions.length === 0 ? (
        <div className="card empty" id="versions-empty">
          <h2>No versions yet</h2>
          <p>Your first deploy becomes v1. Every deploy after that is kept, so you can always roll back.</p>
          <Link className="btn btn-blue" href={`/bots/${bot.id}/deploy`}>Review and deploy</Link>
        </div>
      ) : (
        <div className="card row-list" id="versions-list">
          {versions.map((v, i) => {
            const isCur = v.id === bot.current_version_id || (!bot.current_version_id && v.status === "current");
            const prev = versions[i + 1];
            const changes = diff(prev ? json.parse(prev.snapshot_json, {}) : {}, json.parse(v.snapshot_json, {}));
            const run = runSummary(v.checks_run_id);
            return (
              <div key={v.id} style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <b style={{ fontSize: 16 }}>v{v.number}</b>
                  {isCur && <span className="pill pill-live">Current</span>}
                  <span className="muted" style={{ fontSize: 13 }}>from {v.created_by === "builder" ? "Threadline" : v.created_by} · {fmtDate(v.created_at)} · <span className="mono">{v.hash.slice(0, 7)}</span></span>
                  <span style={{ flex: 1 }} />
                  {run && <span className={`pill ${run.status === "running" ? "pill-blue" : run.total && run.passed / run.total >= 0.85 ? "pill-live" : "pill-warn"}`}>{run.status === "running" ? "Checks running" : `${run.passed}/${run.total} checks`}</span>}
                  {!run && <span className="pill pill-off no-dot">No checks</span>}
                  {!isCur && <RollbackButton botId={bot.id} versionId={v.id} number={v.number} />}
                </div>
                {v.summary && <p style={{ marginTop: 6, fontSize: 14 }}>{v.summary}</p>}
                <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                  {isCur ? (live.length ? `Current version, live on ${live.map((c) => CHANNEL_LABEL[c] ?? c).join(", ")}` : "Current version, not on any channel yet") : "Not live"}
                </p>
                <details style={{ marginTop: 8 }}>
                  <summary className="btn btn-sm btn-ghost" style={{ listStyle: "none", display: "inline-flex", paddingLeft: 0 }}>See changes</summary>
                  <div style={{ marginTop: 8 }}><DiffList changes={changes} empty={prev ? "No changes from the version before." : "The first version."} /></div>
                </details>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
