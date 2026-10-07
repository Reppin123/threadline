// HTTP: GET /health, POST /spectrum/webhook (GATEWAY_INGEST=webhook), POST /invite (local/admin only).
import { createServer, type IncomingMessage, type Server } from "node:http";
import { InviteError, type Gateway } from "./gateway.ts";
import type { OutboundWorker } from "./outbound.ts";
import type { TransportSet } from "./transports.ts";
import { liveBotCount } from "./router.ts";

export function healthSnapshot(gw: Gateway, transports: TransportSet, outbound: OutboundWorker) {
  const providers = transports.health();
  const due = outbound.dueCount();
  return {
    ok: providers.length > 0 && providers.some((p) => p.status === "connected"),
    mode: gw.cfg.mode,
    ingest: gw.cfg.mode === "cloud" ? gw.cfg.ingest : "stream",
    providers,
    connectedProviders: providers.filter((p) => p.status === "connected").map((p) => p.name),
    liveBots: liveBotCount(),
    lastMessageAt: gw.lastMessageAt?.toISOString() ?? null,
    queueDepth: gw.queueDepth,
    scheduledDue: due,
    stats: { ...gw.stats, scheduled: outbound.stats },
    startedAt: gw.startedAt.toISOString(),
    uptimeSec: Math.round((Date.now() - gw.startedAt.getTime()) / 1000),
    lineHandle: gw.cfg.lineHandle ?? null,
  };
}

export function startServer(gw: Gateway, transports: TransportSet, outbound: OutboundWorker): Promise<Server> {
  const server = createServer(async (req, res) => {
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body, null, 2));
    };
    try {
      const url = new URL(req.url ?? "/", "http://x");
      if (req.method === "GET" && (url.pathname === "/health" || url.pathname === "/")) {
        const h = healthSnapshot(gw, transports, outbound);
        return send(h.ok ? 200 : 503, h);
      }
      if (req.method === "POST" && url.pathname === "/spectrum/webhook") {
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers[k] = v;
        const r = await transports.webhook(new Uint8Array(Buffer.concat(chunks)), headers);
        res.writeHead(r.status, r.headers);
        return res.end(Buffer.from(r.body));
      }
      if (req.method === "POST" && url.pathname === "/invite") {
        if (!adminAllowed(req)) return send(403, { error: "invite is only accepted from localhost or with Authorization: Bearer $GATEWAY_ADMIN_TOKEN" });
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        let body: { botId?: string; handle?: string; channel?: string };
        try { body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch { return send(400, { error: "body must be JSON {botId, handle}" }); }
        if (!body.botId || !body.handle) return send(400, { error: "botId (or join code) and handle are required" });
        try {
          return send(200, { ok: true, ...(await gw.invite(body.botId, body.handle, body.channel)) });
        } catch (e) {
          if (e instanceof InviteError) return send(400, { error: e.message });
          gw.fail(null, "invite", e);
          return send(502, { error: `could not send: ${e instanceof Error ? e.message : e}` });
        }
      }
      send(404, { error: "not found", routes: ["GET /health", "POST /spectrum/webhook", "POST /invite"] });
    } catch (e) {
      gw.fail(null, "http", e);
      send(500, { error: "internal error" });
    }
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(gw.cfg.port, gw.cfg.host, () => resolve(server));
  });
}

// /invite texts real people, so it must not be reachable through the public tunnel without a token.
function adminAllowed(req: IncomingMessage): boolean {
  const token = process.env.GATEWAY_ADMIN_TOKEN;
  if (token && req.headers.authorization === `Bearer ${token}`) return true;
  const proxied = ["cf-connecting-ip", "x-forwarded-for", "x-real-ip", "forwarded"].some((h) => req.headers[h]);
  const ip = req.socket.remoteAddress ?? "";
  return !proxied && (ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1");
}
