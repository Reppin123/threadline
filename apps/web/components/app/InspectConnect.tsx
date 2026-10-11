"use client";
// Inspect tab client pieces (agent inspect): "Connect an app or server" form, per-connection actions, copy button.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  checkConnection, saveConnection, recheckConnectionAction, removeConnectionAction, type ConnectForm, type DetectView,
} from "@/app/(app)/bots/[id]/inspect/actions";

export const KIND_LABEL: Record<string, string> = { detect: "Detect", plain: "Plain API (tools call it)", openapi: "API description (OpenAPI)", mcp: "MCP server (Streamable HTTP)" };
export const AUTH_LABEL: Record<string, string> = {
  detect: "Detect", header: "Key in a header", bearer: "Bearer token", basic: "User and password", query: "Key in the address (?api_key=)", none: "No key", oauth: "Sign in (OAuth)",
};
const EMPTY: ConnectForm = { address: "", key: "", canWrite: false, name: "", kind: "detect", auth: "detect", authName: "", testPath: "" };

export function InspectConnectForm({ botId }: { botId: string }) {
  const router = useRouter();
  const [f, setF] = useState<ConnectForm>(EMPTY);
  const [more, setMore] = useState(false);
  const [result, setResult] = useState<DetectView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState<"check" | "save" | null>(null);
  const [, start] = useTransition();

  // any edit invalidates the last check: what gets saved is always what was just validated
  const set = <K extends keyof ConnectForm>(k: K, v: ConnectForm[K]) => { setF((p) => ({ ...p, [k]: v })); setResult(null); setError(null); setSaved(null); };

  const check = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null); setSaved(null); setBusy("check");
    start(async () => {
      const r = await checkConnection(botId, f);
      setBusy(null);
      if (!r.ok) { setError(r.error); return; }
      setResult(r.result);
      if (!r.result.ok) setError(r.result.error ?? "It didn't validate.");
    });
  };
  const save = () => {
    if (!result) return;
    setBusy("save"); setError(null);
    // commit exactly what was detected (or overridden): the server re-validates before writing
    const confirmed: ConnectForm = { ...f, kind: result.kind, auth: result.auth, authName: result.authName ?? f.authName };
    start(async () => {
      const r = await saveConnection(botId, confirmed);
      setBusy(null);
      if (!r.ok) { setError(r.error); if (r.result) setResult(r.result); return; }
      setSaved(`Connected ${r.name}. Added ${r.tools.length} tool${r.tools.length === 1 ? "" : "s"}: ${r.tools.join(", ")}. Try it in Build → Test now; deploy to put it live.`);
      setF(EMPTY); setResult(null); setMore(false);
      router.refresh();
    });
  };

  return (
    <form onSubmit={check} className="card box insp-connect" id="connect-form" aria-label="Connect an app or server">
      <div className="insp-connect-head">
        <b>Connect an app or server</b>
        <span className="muted">Paste an address. We work out what it is and how it signs in, test it with one harmless read, then add its tools to this bot.</span>
      </div>
      <label className="insp-field"><span className="label">Address</span>
        <input className="input" id="conn-address" placeholder="https://api.yourshop.com" value={f.address} onChange={(e) => set("address", e.target.value)} autoComplete="off" spellCheck={false} required />
      </label>
      <label className="insp-field"><span className="label">Key <span className="muted">(optional)</span></span>
        <input className="input" id="conn-key" type="password" placeholder="Token, API key, or user:password" value={f.key} onChange={(e) => set("key", e.target.value)} autoComplete="new-password" spellCheck={false} />
      </label>
      <button type="button" className="toggle" role="switch" aria-checked={f.canWrite} onClick={() => set("canWrite", !f.canWrite)} id="conn-canwrite">
        <span className="sw" /> Can change things in this API {f.canWrite ? "(asks the customer before every change)" : "(off: read-only)"}
      </button>
      <details open={more} onToggle={(e) => setMore((e.target as HTMLDetailsElement).open)} className="insp-more">
        <summary>More options</summary>
        <div className="insp-more-grid">
          <label className="insp-field"><span className="label">Name</span>
            <input className="input" id="conn-name" placeholder="e.g. Orders" value={f.name} onChange={(e) => set("name", e.target.value)} />
          </label>
          <label className="insp-field"><span className="label">Kind</span>
            <select className="input" id="conn-kind" value={f.kind} onChange={(e) => set("kind", e.target.value as ConnectForm["kind"])}>
              {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="insp-field"><span className="label">Signs in with</span>
            <select className="input" id="conn-auth" value={f.auth} onChange={(e) => set("auth", e.target.value as ConnectForm["auth"])}>
              {Object.entries(AUTH_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          {(f.auth === "header" || f.auth === "query") && (
            <label className="insp-field"><span className="label">{f.auth === "header" ? "Header name" : "Parameter name"}</span>
              <input className="input" id="conn-authname" placeholder={f.auth === "header" ? "x-api-key" : "api_key"} value={f.authName} onChange={(e) => set("authName", e.target.value)} />
            </label>
          )}
          <label className="insp-field"><span className="label">Test with a GET to <span className="muted">(one harmless read)</span></span>
            <input className="input" id="conn-testpath" placeholder="/status" value={f.testPath} onChange={(e) => set("testPath", e.target.value)} spellCheck={false} />
          </label>
        </div>
      </details>

      {result && <DetectSummary r={result} onOverride={(k, v) => { set(k, v as never); setMore(true); }} />}
      {error && <p role="alert" className="insp-err" id="conn-error">{error}</p>}
      {saved && <p role="status" className="ok-box" id="conn-saved">{saved}</p>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn btn-sm" disabled={!!busy || !f.address.trim()} id="conn-check">{busy === "check" ? "Checking…" : result ? "Check again" : "Check connection"}</button>
        {result?.ok && <button type="button" className="btn btn-sm btn-primary" disabled={!!busy} onClick={save} id="conn-save">{busy === "save" ? "Saving…" : `Save and add ${result.tools.length} tool${result.tools.length === 1 ? "" : "s"}`}</button>}
      </div>
    </form>
  );
}

function DetectSummary({ r, onOverride }: { r: DetectView; onOverride: (k: "kind" | "auth", v: string) => void }) {
  return (
    <div className="insp-detect" id="conn-detected">
      <div className="insp-detect-row">
        <span className="stat-k">Detected</span>
        <b id="conn-detected-kind">{KIND_LABEL[r.kind]}</b>
        <select className="input input-sm" aria-label="Override kind" value={r.kind} onChange={(e) => onOverride("kind", e.target.value)}>
          {(["plain", "openapi", "mcp"] as const).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
        </select>
        <span className="muted">{r.kindEvidence}</span>
      </div>
      <div className="insp-detect-row">
        <span className="stat-k">Signs in with</span>
        <b id="conn-detected-auth">{AUTH_LABEL[r.auth]}{r.authName ? ` (${r.authName})` : ""}</b>
        <select className="input input-sm" aria-label="Override sign-in" value={r.auth} onChange={(e) => onOverride("auth", e.target.value)}>
          {(["bearer", "header", "basic", "query", "none", "oauth"] as const).map((k) => <option key={k} value={k}>{AUTH_LABEL[k]}</option>)}
        </select>
        <span className="muted">{r.authConfirmed ? "Confirmed. " : r.auth !== "none" && !r.authForced ? "Best guess. " : ""}{r.authEvidence}</span>
      </div>
      {r.test && (
        <div className="insp-detect-row">
          <span className="stat-k">Test</span>
          <span className={r.test.ok ? "pill pill-live" : "pill pill-err"}>{r.test.status || "no answer"}</span>
          <span className="mono insp-url">{r.kind === "mcp" ? "MCP handshake + list tools" : `GET ${r.test.url}`}</span>
          {r.test.sample && <span className="muted mono insp-sample">{r.test.sample.slice(0, 160)}</span>}
        </div>
      )}
      {r.tools.length > 0 && (
        <div className="insp-detect-row">
          <span className="stat-k">Tools to add</span>
          <span>{r.tools.map((t) => <span key={t.name} className="chip mono" title={t.description}>{t.name}{t.write ? " · asks first" : ""}</span>)}</span>
        </div>
      )}
    </div>
  );
}

export function ConnectionActions({ botId, connectionId, name }: { botId: string; connectionId: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="insp-actions">
      <button className="btn btn-sm" disabled={pending} onClick={() => start(async () => {
        const r = await recheckConnectionAction(botId, connectionId);
        setMsg(r.ok ? `OK · ${r.tools.length} tools` : r.error ?? "Failed");
        router.refresh();
      })}>{pending ? "…" : "Recheck"}</button>
      <button className="btn btn-sm btn-ghost" disabled={pending} onClick={() => {
        if (!confirm(`Remove ${name}? Its tools leave the draft now and the live bot on your next deploy.`)) return;
        start(async () => { await removeConnectionAction(botId, connectionId); router.refresh(); });
      }}>Remove</button>
      {msg && <span className="muted" role="status" style={{ fontSize: 12.5 }}>{msg}</span>}
    </span>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn btn-sm" onClick={() => { navigator.clipboard?.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}>
      {done ? "Copied" : label}
    </button>
  );
}
