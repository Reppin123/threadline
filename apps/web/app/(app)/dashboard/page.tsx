import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { botCardStats, CHANNEL_LABEL, liveChannels, money, trialOf } from "@/lib/data";
import { Sparkline } from "@/components/app/Sparkline";
import { initials } from "@/components/app/TopBar";
import { IPlus } from "@/components/app/icons";

export const metadata: Metadata = { title: "Your bots" };

const STATUS: Record<string, [string, string]> = {
  live: ["Live", "pill-live"], ready: ["Not live", "pill-off"], draft: ["Draft", "pill-off"], building: ["Building", "pill-blue"], error: ["Needs attention", "pill-err"],
};

export default async function Dashboard() {
  const user = await requireUser("/dashboard");
  const bots = all<{ id: string; name: string; status: string; profile_json: string | null }>("SELECT id,name,status,profile_json FROM bots WHERE user_id=? ORDER BY created_at DESC", [user.id]);
  const t = trialOf(user.id);
  return (
    <main id="main" className="page">
      <div className="page-head">
        <div>
          <h1>Your <span className="h-serif">bots</span></h1>
        </div>
        <p id="trial-line">
          {money(t.used)} of {money(t.credit)} trial credit used, {money(t.left)} left.
          {t.daysLeft !== null ? ` At this rate it lasts about ${t.daysLeft} more days.` : " Nothing spent in the last two weeks."}
        </p>
      </div>
      {bots.length === 0 ? (
        <div className="card empty">
          <div className="empty-icon"><IPlus size={24} /></div>
          <h2>Make your first bot</h2>
          <p>Answer a few questions — a website, an API, or just an idea — and Threadline writes the first version for you. You can text it in a couple of minutes.</p>
          <Link className="btn btn-blue btn-lg" href="/bots/new">Start a bot</Link>
        </div>
      ) : (
        <div className="bot-grid">
          {bots.map((b) => {
            const s = botCardStats(b.id);
            const ch = liveChannels(b.id);
            const [label, cls] = b.status === "live" && ch.length === 0 ? ["Not live", "pill-off"] : STATUS[b.status] ?? [b.status, "pill-off"];
            let tagline = "";
            try { tagline = JSON.parse(b.profile_json || "{}").tagline || ""; } catch {}
            return (
              <article className="card bot-card" key={b.id} data-bot-id={b.id}>
                <div className="bot-card-head">
                  <span className="avatar lg">{initials(b.name)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2>{b.name}</h2>
                    <div className="sub">{ch.length ? `On ${ch.map((c) => CHANNEL_LABEL[c] ?? c).join(", ")}` : tagline || "Not on a channel yet"}</div>
                  </div>
                  <span className={`pill ${cls}`}>{label}</span>
                </div>
                <div className="spark">
                  <Sparkline data={s.perDay} />
                  <div className="spark-meta"><span>Chats per day · 14 days</span><span>Today</span></div>
                </div>
                <div className="stats3">
                  <div><div className="stat-k">This week</div><div className="stat-v">{s.week} <small>chats</small></div></div>
                  <div><div className="stat-k">This month</div><div className="stat-v">{money(s.spent)} <small>spent</small></div></div>
                  <div><div className="stat-k">Scheduled</div><div className="stat-v">{s.scheduled || <small>none coming</small>}</div></div>
                </div>
                <div className="bot-card-foot">
                  {s.problems ? <span className="ok-dot warn-dot">{s.problems} {s.problems === 1 ? "problem" : "problems"} this week</span> : <span className="ok-dot">No problems</span>}
                  <Link className="btn btn-sm" href={`/bots/${b.id}/build`}>Open</Link>
                </div>
              </article>
            );
          })}
          <div className="card new-card">
            <h2>Make another bot</h2>
            <p>Answer a few questions and Threadline writes the first version for you.</p>
            <Link className="btn btn-primary" href="/bots/new"><IPlus size={15} /> New bot</Link>
          </div>
        </div>
      )}
    </main>
  );
}
