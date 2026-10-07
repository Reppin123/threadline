"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { BuildProgress } from "@threadline/core";
import { rebuildBot } from "@/app/(app)/actions";
import { ICheck } from "./icons";

const STEPS: { id: BuildProgress["step"]; label: string }[] = [
  { id: "read_source", label: "Reading what you gave us" },
  { id: "understand", label: "Understanding the business" },
  { id: "knowledge", label: "Building what it knows" },
  { id: "tools", label: "Setting up what it can do" },
  { id: "tables", label: "Deciding what it keeps" },
  { id: "mock_data", label: "Filling in sample data" },
  { id: "checks", label: "Trying it out" },
  { id: "done", label: "Ready" },
];

export function BuildProgressView({ botId, name, initial, sourceKind, failed }: { botId: string; name: string; initial: BuildProgress | null; sourceKind: string; failed?: boolean }) {
  const router = useRouter();
  const [p, setP] = useState<BuildProgress | null>(initial);
  const [status, setStatus] = useState(failed ? "error" : "building");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (status === "error") return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/app/bots/${botId}/progress`, { cache: "no-store" }).then((r) => r.json());
        if (stop) return;
        if (r.progress) setP(r.progress);
        setStatus(r.status);
        if (r.status !== "building" && r.status !== "draft") { router.refresh(); return; }
        if (r.status === "draft" && r.progress?.pct >= 100) { router.refresh(); return; }
      } catch {}
      if (!stop) setTimeout(tick, 1200);
    };
    const t = setTimeout(tick, 600);
    return () => { stop = true; clearTimeout(t); };
  }, [botId, router, status]);

  const steps = sourceKind === "idea" ? STEPS : STEPS.filter((s) => s.id !== "mock_data");
  const curIdx = Math.max(0, steps.findIndex((s) => s.id === p?.step));
  const pct = Math.max(3, Math.min(100, p?.pct ?? 3));
  const err = status === "error" ? p?.error || "The build stopped before it finished." : null;
  return (
    <main id="main" className="ws-page">
      <div className="card progress-card" aria-live="polite" id="build-progress">
        <div className="eyebrow">{err ? "Build stopped" : "Building"}</div>
        <h1 style={{ fontSize: 26, marginTop: 6 }}>{err ? `${name} hit a snag` : <>Writing <span className="h-serif">{name}</span></>}</h1>
        <p className="muted" style={{ marginTop: 6, fontSize: 14 }}>{err ? err : p?.detail || p?.label || "Getting started…"}</p>
        <div className="progress-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
        <ol className="steps">
          {steps.map((s, i) => {
            const cls = i < curIdx || p?.step === "done" ? "done" : i === curIdx && !err ? "cur" : "";
            return (
              <li key={s.id} className={cls}>
                <span className="dot">{cls === "done" ? <ICheck size={12} /> : cls === "cur" ? <span className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} /> : null}</span>
                {i === curIdx && p?.label && !err ? p.label : s.label}
              </li>
            );
          })}
        </ol>
        {err ? (
          <button className="btn btn-primary" style={{ marginTop: 22 }} disabled={pending} onClick={() => start(async () => { await rebuildBot(botId); setStatus("building"); setP(null); })}>
            Try the build again
          </button>
        ) : (
          <p className="muted" style={{ fontSize: 13, marginTop: 22 }}>Usually a minute or two. You can leave this page — the build keeps going.</p>
        )}
      </div>
    </main>
  );
}
