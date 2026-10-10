// Cloudflare Worker fronting the Threadline container (web :3000 + gateway + worker inside one image).
// Edge-side ops (production agent, see launch/production/RUNBOOK.md):
//   - cron every 5 min → container GET /healthz. Keeps the singleton awake (the gateway's Photon stream and Telegram polling
//     only run while the container runs) and alerts ALERT_WEBHOOK_URL when the whole container is unhealthy or unreachable.
//   - MAINTENANCE=1 → 503 page for every request except /healthz, without touching the container (instant kill switch).
//   - CF_BEACON_TOKEN → injects the cookieless Cloudflare Web Analytics beacon into HTML pages.
//   - POST /__ops/restart with "Authorization: Bearer $OPS_TOKEN" → graceful container restart (SIGTERM: snapshot flush, worker drain).
//     After `wrangler secret put THREADLINE_KILL ...` this is how the new env reaches the running container in about a minute.
//   - CANONICAL_HOST (e.g. heybell.app) → 301 browser traffic from other hosts (workers.dev) there; /api/* stays put.
import { Container, getContainer } from "@cloudflare/containers";

interface Env {
  APP: DurableObjectNamespace<App>;
  ANTHROPIC_API_KEY: string;
  SPECTRUM_PROJECT_ID: string;
  SPECTRUM_PROJECT_SECRET: string;
  AUTH_SECRET: string;
  APP_URL: string;
  // Persistence: the container has no disk, so start-all restores/snapshots /data/threadline.db to Supabase Storage.
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  // Optional (unset = feature off). Secrets via `wrangler secret put`, plain values via wrangler.jsonc vars.
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  BRAND_NAME?: string;
  SENTRY_DSN?: string;
  ALERT_WEBHOOK_URL?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  IMESSAGE_LINE_HANDLE?: string;
  GATEWAY_ADMIN_TOKEN?: string;
  THREADLINE_KILL?: string;
  RELEASE?: string;
  MAINTENANCE?: string;
  CF_BEACON_TOKEN?: string;
  CANONICAL_HOST?: string;
  DEMO_DEV_LINKS?: string;
  OPS_TOKEN?: string;
  BILLING_DEFAULT_PLAN?: string;
  SUPABASE_SNAPSHOT_OBJECT?: string;
  SIGNUP_GLOBAL_PER_HOUR?: string;
  LLM_CAP_GLOBAL_DAY?: string;
}

// Passed into the container only when set on the Worker.
const OPTIONAL = ["RESEND_API_KEY", "EMAIL_FROM", "BRAND_NAME", "SENTRY_DSN", "ALERT_WEBHOOK_URL", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET",
  "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "IMESSAGE_LINE_HANDLE", "GATEWAY_ADMIN_TOKEN", "THREADLINE_KILL", "RELEASE",
  // billing: every existing user is on Free; set "starter" for pilots until Stripe is live (COORDINATION 2026-10-10 billing).
  "BILLING_DEFAULT_PLAN",
  // Data rollback (RUNBOOK.md §6): point a fresh container at an uploaded good copy instead of the bad "latest".
  "SUPABASE_SNAPSHOT_OBJECT",
  // Launch-day knobs (RUNBOOK.md §7), defaults in packages/core/src/safety.ts.
  "SIGNUP_GLOBAL_PER_HOUR", "LLM_CAP_GLOBAL_DAY"] as const;

export class App extends Container<Env> {
  defaultPort = 3000;
  // The cron below pings every 5 min, so this only matters if the cron is removed.
  sleepAfter = "24h";
  constructor(ctx: DurableObjectState<{}>, env: Env) {
    super(ctx, env);
    const optional: Record<string, string> = {};
    for (const k of OPTIONAL) if (env[k]) optional[k] = env[k]!;
    this.envVars = {
      ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
      SPECTRUM_PROJECT_ID: env.SPECTRUM_PROJECT_ID,
      SPECTRUM_PROJECT_SECRET: env.SPECTRUM_PROJECT_SECRET,
      AUTH_SECRET: env.AUTH_SECRET,
      THREADLINE_ENCRYPTION_KEY: env.AUTH_SECRET,
      APP_URL: env.APP_URL,
      GATEWAY_MODE: "cloud",
      // On-screen sign-in links let whoever types an email sign in as that account, so they are OFF in production.
      // DEMO_DEV_LINKS=1 turns them back on for a throwaway demo deployment only (never with real users or Resend).
      THREADLINE_DEV_LINKS: env.DEMO_DEV_LINKS === "1" && !env.RESEND_API_KEY ? "1" : "0",
      NEXT_PUBLIC_SITE_URL: env.APP_URL,
      THREADLINE_MODEL: "claude-sonnet-5-5",
      THREADLINE_FAST_MODEL: "claude-haiku-5-5",
      THREADLINE_DB: "/data/threadline.db",
      SUPABASE_URL: env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
      SERVICE_NAME: "threadline-container",
      ...optional,
    };
  }
}

const app = (env: Env) => getContainer(env.APP, "main-v2");

function maintenancePage(): Response {
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Back shortly</title>
<body style="font-family:-apple-system,system-ui,sans-serif;display:grid;place-items:center;min-height:90vh;margin:0;color:#111">
<div style="max-width:420px;padding:24px;text-align:center"><h1 style="font-size:22px">We'll be right back</h1>
<p style="color:#555;line-height:1.5">We're doing a quick bit of maintenance. Your bots' data is safe. Please try again in a few minutes.</p></div></body>`;
  return new Response(html, { status: 503, headers: { "content-type": "text/html; charset=utf-8", "retry-after": "300", "cache-control": "no-store" } });
}

async function notify(env: Env, text: string) {
  if (!env.ALERT_WEBHOOK_URL) return;
  const msg = `[ALERT] threadline-edge: ${text}`;
  await fetch(env.ALERT_WEBHOOK_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: msg, content: msg }) }).catch(() => {});
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/__ops/restart") {
      if (request.method !== "POST" || !env.OPS_TOKEN || request.headers.get("authorization") !== `Bearer ${env.OPS_TOKEN}`) return new Response("not found", { status: 404 });
      await app(env).stop();
      return Response.json({ ok: true, restarting: true, note: "next request or the 5-min cron starts it with the current env" });
    }
    if (env.MAINTENANCE === "1" && url.pathname !== "/healthz") return maintenancePage();
    if (env.CANONICAL_HOST && url.hostname !== env.CANONICAL_HOST && url.hostname.endsWith(".workers.dev") && !url.pathname.startsWith("/api/")
        && (request.method === "GET" || request.method === "HEAD")) {
      return Response.redirect(`https://${env.CANONICAL_HOST}${url.pathname}${url.search}`, 301);
    }
    // One singleton instance holds the SQLite DB and the live Photon connection.
    const res = await app(env).fetch(request);
    if (env.CF_BEACON_TOKEN && (res.headers.get("content-type") || "").includes("text/html")) {
      const tag = `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${env.CF_BEACON_TOKEN.replace(/[^a-zA-Z0-9]/g, "")}"}'></script>`;
      return new HTMLRewriter().on("body", { element(el) { el.append(tag, { html: true }); } }).transform(res);
    }
    return res;
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil((async () => {
      try {
        const r = await app(env).fetch(new Request("http://container/healthz", { headers: { "user-agent": "threadline-cron" } }));
        if (r.status !== 200) {
          const body = await r.text().catch(() => "");
          await notify(env, `/healthz returned ${r.status}: ${body.slice(0, 300)}`);
        }
      } catch (e) {
        await notify(env, `container unreachable: ${(e as Error).message}`);
      }
    })());
  },
};
