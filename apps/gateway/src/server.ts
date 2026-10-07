// HTTP: GET /health, POST /spectrum/webhook (GATEWAY_INGEST=webhook).
import { createServer, type Server } from "node:http";
import type { Gateway } from "./gateway.ts";
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
      send(404, { error: "not found", routes: ["GET /health", "POST /spectrum/webhook"] });
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
