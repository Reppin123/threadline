// Gateway configuration, read once from process.env. Secrets are never logged.
export type GatewayMode = "cloud" | "local" | "terminal";
export type IngestMode = "stream" | "webhook";
export type TerminalUi = "tui" | "plain";

export interface GatewayConfig {
  mode: GatewayMode;
  ingest: IngestMode;
  terminalUi: TerminalUi;
  port: number;
  host: string;
  debounceMs: number;           // burst window: messages from one sender inside it become one turn
  bubbleDelayScale: number;     // 0 disables human-like pauses between bubbles (tests)
  outboundPollMs: number;
  heartbeatMs: number;
  maxSendAttempts: number;
  retryBaseMs: number;
  lineHandle: string | undefined;
  quietUnbound: boolean;        // don't answer unbound senders without a join code (local mode: it's your personal Messages!)
  photon: { projectId?: string; projectSecret?: string; webhookSecret?: string };
}

function num(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`${name} must be a number (got "${v}")`);
  return n;
}

function oneOf<T extends string>(name: string, allowed: readonly T[], fallback: T): T {
  const v = (process.env[name] ?? "").trim().toLowerCase();
  if (!v) return fallback;
  if (!(allowed as readonly string[]).includes(v)) throw new Error(`${name} must be one of ${allowed.join(" | ")} (got "${v}")`);
  return v as T;
}

export function loadConfig(): GatewayConfig {
  const mode = oneOf("GATEWAY_MODE", ["cloud", "local", "terminal"] as const, "terminal");
  const quiet = process.env.GATEWAY_QUIET_UNBOUND;
  return {
    mode,
    ingest: oneOf("GATEWAY_INGEST", ["stream", "webhook"] as const, "stream"),
    terminalUi: oneOf("GATEWAY_TERMINAL_UI", ["tui", "plain"] as const, process.stdin.isTTY ? "tui" : "plain"),
    port: num("GATEWAY_PORT", num("PORT", 3100)),
    host: process.env.GATEWAY_HOST || "0.0.0.0",
    debounceMs: num("GATEWAY_DEBOUNCE_MS", 1200),
    bubbleDelayScale: num("GATEWAY_BUBBLE_DELAY_SCALE", 1),
    outboundPollMs: num("GATEWAY_OUTBOUND_POLL_MS", 3000),
    heartbeatMs: num("GATEWAY_HEARTBEAT_MS", 60_000),
    maxSendAttempts: num("GATEWAY_MAX_SEND_ATTEMPTS", 3),
    retryBaseMs: num("GATEWAY_RETRY_BASE_MS", 500),
    lineHandle: process.env.IMESSAGE_LINE_HANDLE || undefined,
    quietUnbound: quiet ? quiet === "1" || quiet === "true" : mode === "local",
    photon: {
      projectId: process.env.PHOTON_PROJECT_ID || process.env.SPECTRUM_PROJECT_ID || undefined,
      projectSecret: process.env.PHOTON_PROJECT_SECRET || process.env.SPECTRUM_PROJECT_SECRET || undefined,
      webhookSecret: process.env.SPECTRUM_WEBHOOK_SECRET || undefined,
    },
  };
}

export class ConfigError extends Error {}

// Cloud mode must fail fast and say exactly what's missing.
export function assertCloudConfig(cfg: GatewayConfig) {
  const missing: string[] = [];
  if (!cfg.photon.projectId) missing.push("PHOTON_PROJECT_ID");
  if (!cfg.photon.projectSecret) missing.push("PHOTON_PROJECT_SECRET");
  if (cfg.ingest === "webhook" && !cfg.photon.webhookSecret) missing.push("SPECTRUM_WEBHOOK_SECRET (required because GATEWAY_INGEST=webhook)");
  if (missing.length) {
    throw new ConfigError(
      [
        `GATEWAY_MODE=cloud needs Photon Spectrum Cloud credentials. Missing: ${missing.join(", ")}.`,
        "  1. Sign up at https://app.photon.codes and create a project (Free plan: shared iMessage line, up to 10 users).",
        "  2. Copy the Project ID and Secret Key from the project's Settings page.",
        "  3. export PHOTON_PROJECT_ID=... PHOTON_PROJECT_SECRET=...  (SPECTRUM_PROJECT_ID/SECRET also accepted)",
        "  4. Optional: IMESSAGE_LINE_HANDLE=<the line's phone/email> so help texts show it.",
        "Or run without credentials: GATEWAY_MODE=terminal (default) or GATEWAY_MODE=local on a Mac.",
      ].join("\n"),
    );
  }
}
