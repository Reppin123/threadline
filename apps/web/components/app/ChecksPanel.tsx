"use client";
import { useEffect, useRef, useState } from "react";
import { runChecksAction } from "@/app/(app)/actions";
import { ICheck, IX } from "./icons";

type Case = { persona: string; goal: string; passed: boolean | null; notes: string | null; transcript: { role: string; text: string }[] };
type Run = { runId: string; status: "running" | "done" | "error"; total: number; passed: number; cases: Case[] };

export function ChecksPanel({ botId, initialRunId }: { botId: string; initialRunId: string | null }) {
  const [run, setRun] = useState<Run | null>(null);
  const [phase, setPhase] = useState<"idle" | "queued" | "running">("idle");
  const [err, setErr] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  async function pollRun(runId: string) {
    for (let i = 0; i < 900 && alive.current; i++) {
      const r = await fetch(`/api/app/bots/${botId}/test-runs/${runId}`, { cache: "no-store" }).then((r) => r.json()).catch(() => null);
      if (r && !r.error) {
        setRun(r);
        if (r.status !== "running") { setPhase("idle"); return; }
        setPhase("running");
      }
      await new Promise((res) => setTimeout(res, 1500));
    }
  }

  useEffect(() => { if (initialRunId) void pollRun(initialRunId); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [initialRunId]);

  async function start() {
    setErr(null); setPhase("queued");
    const { jobId } = await runChecksAction(botId);
    for (let i = 0; i < 600 && alive.current; i++) {
      const j = await fetch(`/api/app/jobs/${jobId}`, { cache: "no-store" }).then((r) => r.json()).catch(() => null);
      if (j?.status === "done") {
        if (j.result?.runId) return pollRun(j.result.runId);
        setPhase("idle"); return;
      }
      if (j?.status === "failed") { setErr(j.error || "The checks couldn't run."); setPhase("idle"); return; }
      await new Promise((res) => setTimeout(res, 1000));
    }
  }

  const busy = phase !== "idle";
  const pct = run && run.total ? Math.round((run.passed / run.total) * 100) : null;
  return (
    <div className="card box" id="checks">
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {run ? (
          <span className={`pill ${run.status === "running" ? "pill-blue" : run.status === "error" ? "pill-err" : pct !== null && pct >= 85 ? "pill-live" : "pill-warn"}`} id="checks-status">
            {run.status === "running" ? `Running · ${run.cases.filter((c) => c.passed !== null).length}/${run.total || "…"}` : run.status === "error" ? "Error" : `${run.passed}/${run.total} passing`}
          </span>
        ) : (
          <span className="pill pill-off" id="checks-status">{busy ? "Starting…" : "Not run yet"}</span>
        )}
        <span style={{ flex: 1 }} />
        <button className="btn btn-primary btn-sm" onClick={start} disabled={busy} id="run-checks">
          {busy ? <><span className="spinner" /> Running the checks</> : run ? "Run the checks again" : "Run the checks"}
        </button>
      </div>
      <p style={{ marginTop: 10 }}>
        Threadline calls each tool you changed once on your draft, plays your test questions and its own simulated customers — typos, mixed languages,
        people changing their minds — on your draft, and a judge grades every reply. It takes a minute or two.
      </p>
      {err && <div className="error-box" style={{ marginTop: 10 }}>{err}</div>}
      {run && run.status === "done" && run.total === 0 && <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>No checks ran for this version yet.</p>}
      {run && run.cases.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 14 }} id="checks-cases">
          {run.cases.map((c, i) => (
            <details className="case" key={i}>
              <summary>
                <span style={{ width: 20, height: 20, borderRadius: 99, display: "grid", placeItems: "center", color: "#fff", background: c.passed === null ? "var(--line-2)" : c.passed ? "var(--green)" : "var(--red)", flex: "none" }}>
                  {c.passed === null ? <span className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} /> : c.passed ? <ICheck size={12} /> : <IX size={12} />}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}><b style={{ fontWeight: 600 }}>{c.persona}</b> <span className="muted">— {c.goal}</span></span>
              </summary>
              <div className="tx">
                {c.notes && <div className="note-box" style={{ fontSize: 13 }}>Judge: {c.notes}</div>}
                {c.transcript.map((t, j) => (
                  <div key={j}><div className="r">{t.role}</div>{t.text}</div>
                ))}
                {c.transcript.length === 0 && <span className="muted">No transcript yet.</span>}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
