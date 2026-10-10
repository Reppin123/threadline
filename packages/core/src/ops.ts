// Error reporting + alerts (owned by agent production). Dependency-free on purpose: scripts/start-all.mjs imports it directly.
//   Errors  → one JSON line on stderr (Cloudflare Workers Observability / `docker logs` pick it up) and, when SENTRY_DSN is set,
//             a Sentry event via the envelope HTTP API (no SDK). Same message is sent at most once a minute.
//   Alerts  → "[alert] ..." on stderr and, when ALERT_WEBHOOK_URL is set, a POST {text, content} (Slack, Discord and most
//             chat webhooks accept one of the two). Same alert key at most once per ALERT_COOLDOWN_MIN (30).
// Env: SENTRY_DSN, SENTRY_ENVIRONMENT (production), RELEASE, ALERT_WEBHOOK_URL, ALERT_COOLDOWN_MIN, SERVICE_NAME.
import { randomBytes } from "node:crypto";
import { hostname } from "node:os";

const recent = new Map<string, number>();
function throttled(key: string, ms: number, now = Date.now()): boolean {
  const last = recent.get(key);
  if (last && now - last < ms) return true;
  recent.set(key, now);
  if (recent.size > 1000) for (const [k, t] of recent) if (now - t > ms) recent.delete(k);
  return false;
}

export function sentryTarget(dsn = process.env.SENTRY_DSN || ""): { url: string; dsn: string } | null {
  const m = dsn.match(/^(https?):\/\/([^@:]+)(?::[^@]*)?@([^/]+)\/(?:.*\/)?(\d+)$/);
  if (!m) return null;
  const [, proto, key, host, project] = m;
  return { url: `${proto}://${host}/api/${project}/envelope/?sentry_key=${key}&sentry_version=7`, dsn };
}

/** Never throws, never blocks the caller (Sentry upload is fire-and-forget). */
export function reportError(err: unknown, ctx: { service?: string; where?: string; [k: string]: unknown } = {}): void {
  try {
    const e = err instanceof Error ? err : new Error(String(err));
    const service = ctx.service || process.env.SERVICE_NAME || "app";
    const line = { level: "error", at: new Date().toISOString(), service, where: ctx.where, msg: e.message.slice(0, 1000), stack: e.stack?.split("\n").slice(0, 8).join("\n"), ...ctx };
    process.stderr.write(JSON.stringify(line) + "\n");
    const target = sentryTarget();
    if (!target || throttled(`err:${service}:${ctx.where}:${e.message.slice(0, 200)}`, 60_000)) return;
    const eventId = randomBytes(16).toString("hex");
    const { service: _s, where, ...extra } = ctx;
    const event = {
      event_id: eventId, timestamp: Date.now() / 1000, platform: "node", level: "error", logger: service,
      server_name: hostname(), environment: process.env.SENTRY_ENVIRONMENT || "production", release: process.env.RELEASE || undefined,
      tags: { service, where: where ?? "" },
      exception: { values: [{ type: e.name, value: e.message.slice(0, 1000), stacktrace: { frames: parseFrames(e.stack) } }] },
      extra,
    };
    const body = `${JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString(), dsn: target.dsn })}\n${JSON.stringify({ type: "event" })}\n${JSON.stringify(event)}\n`;
    fetch(target.url, { method: "POST", headers: { "Content-Type": "application/x-sentry-envelope" }, body, signal: AbortSignal.timeout(5000) })
      .catch(() => {});
  } catch { /* reporting must never break the caller */ }
}

function parseFrames(stack?: string) {
  // Sentry wants oldest call first.
  return (stack || "").split("\n").slice(1, 30).map((l) => {
    const m = l.match(/at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/);
    return m ? { function: m[1] || "?", filename: m[2], lineno: Number(m[3]), colno: Number(m[4]) } : { function: l.trim() };
  }).reverse();
}

/** Page a human. key groups repeats (e.g. "gateway-down"); resolved=true sends a recovery note (also throttled per key). */
export async function alert(key: string, text: string, opts: { cooldownMin?: number; resolved?: boolean } = {}): Promise<boolean> {
  const cooldown = (opts.cooldownMin ?? Number(process.env.ALERT_COOLDOWN_MIN || 30)) * 60_000;
  const k = `${opts.resolved ? "ok" : "alert"}:${key}`;
  if (throttled(k, cooldown)) return false;
  if (opts.resolved) recent.delete(`alert:${key}`); else recent.delete(`ok:${key}`);
  const prefix = opts.resolved ? "RESOLVED" : "ALERT";
  const msg = `[${prefix}] ${process.env.SERVICE_NAME || "threadline"} ${key}: ${text}`;
  process.stderr.write(`[alert] ${msg}\n`);
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return false;
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: msg, content: msg }), signal: AbortSignal.timeout(8000) });
    return r.ok;
  } catch { return false; }
}

export function _resetOps() { recent.clear(); }
