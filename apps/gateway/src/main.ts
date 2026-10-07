// Threadline gateway: connects every live bot to messaging channels via Photon Spectrum.
//   GATEWAY_MODE=terminal (default) | local | cloud     — see apps/gateway/README.md
import { db, dbPath, logEvent } from "@threadline/db";
import { core } from "@threadline/core";
import { loadConfig, ConfigError } from "./config.ts";
import { Gateway } from "./gateway.ts";
import { OutboundWorker } from "./outbound.ts";
import { TransportSet } from "./transports.ts";
import { healthSnapshot, startServer } from "./server.ts";
import { log } from "./log.ts";

async function main() {
  const cfg = loadConfig();
  db();   // open + migrate before anything else
  const gw = new Gateway(cfg, core);
  const transports = new TransportSet(cfg, gw);
  await transports.start();

  const outbound = new OutboundWorker(gw, () => transports.channels());
  outbound.start();
  const server = await startServer(gw, transports, outbound).catch((e) => {
    log.warn(`health server not started on :${cfg.port} (${e.message}) — continuing without HTTP`);
    return null;
  });

  const beat = () => {
    try { logEvent(null, "gateway_heartbeat", healthSnapshot(gw, transports, outbound)); } catch (e) { gw.fail(null, "heartbeat", e); }
  };
  beat();
  const hb = setInterval(beat, cfg.heartbeatMs);

  log.info(`mode=${cfg.mode} db=${dbPath()} channels=[${transports.channels().join(", ")}]${server ? ` health=http://localhost:${cfg.port}/health` : ""}`);

  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    clearInterval(hb);
    outbound.stop();
    await Promise.race([gw.idle(), new Promise((r) => setTimeout(r, 10_000))]);
    await transports.stop();
    server?.close();
    process.exit(0);
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

process.on("unhandledRejection", (e) => log.error("unhandledRejection:", e instanceof Error ? e.message : e));
process.on("uncaughtException", (e) => log.error("uncaughtException:", e.message));

main().catch((e) => {
  if (e instanceof ConfigError) {
    console.error(`\n✖ ${e.message}\n`);
  } else {
    console.error("✖ gateway failed to start:", e);
  }
  process.exit(1);
});
