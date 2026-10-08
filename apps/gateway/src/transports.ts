// Builds the Spectrum app(s) for a GATEWAY_MODE and pumps their messages into the Gateway.
import { openSync, closeSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { Spectrum, type Message, type Space, type SpectrumInstance } from "spectrum-ts";
import { all, logEvent, run } from "@threadline/db";
import { assertCloudConfig, ConfigError, type GatewayConfig } from "./config.ts";
import type { Gateway, PlatformBinding } from "./gateway.ts";
import { memoryClient, sim, stdio } from "./platforms/memory.ts";
import { log } from "./log.ts";
import { TelegramApi, TelegramPoller, telegramBinding, telegramMessage, telegramSpace, telegramToken } from "./telegram.ts";

type AnyApp = SpectrumInstance<any>;

export interface Transport {
  name: string;                         // "imessage-cloud", "telegram:<botId>", "terminal", ...
  app: AnyApp;
  bindings: Map<string, PlatformBinding>;   // by spectrum platform id
  status: "connecting" | "connected" | "error" | "stopped";
  error?: string;
  botId?: string;
  connectedAt?: Date;
  telegram?: { api: TelegramApi; poller: TelegramPoller; binding: PlatformBinding };
}

export class TransportSet {
  list: Transport[] = [];
  private telegramTimer: NodeJS.Timeout | null = null;
  private telegramSyncing = false;

  constructor(readonly cfg: GatewayConfig, readonly gw: Gateway) {}

  channels(): string[] {
    return [...new Set(this.list.filter((t) => t.status !== "stopped").flatMap((t) => [...t.bindings.values()].map((b) => b.channel)))];
  }

  primary(): Transport | undefined { return this.list[0]; }

  health() {
    return this.list.map((t) => ({
      name: t.name, status: t.status, platforms: [...t.bindings.keys()], botId: t.botId,
      ...(t.telegram?.poller.me ? { username: t.telegram.poller.me.username } : {}),
      connectedAt: t.connectedAt?.toISOString() ?? null, ...(t.error ? { error: t.error } : {}),
    }));
  }

  /** Register an app + bindings, and (unless webhook ingest) pump app.messages into the gateway. */
  add(name: string, app: AnyApp, bindings: PlatformBinding[], opts: { pump: boolean; botId?: string }) {
    const t: Transport = { name, app, bindings: new Map(bindings.map((b) => [b.id, b])), status: "connected", botId: opts.botId, connectedAt: new Date() };
    this.list.push(t);
    for (const b of bindings) this.gw.addBinding(b);
    if (opts.pump) void this.pump(t);
    return t;
  }

  private async pump(t: Transport) {
    try {
      for await (const [space, message] of t.app.messages) this.dispatch(t, space, message);
      if (t.status !== "stopped") { t.status = "error"; t.error = "message stream ended"; log.warn(`${t.name}: message stream ended`); }
    } catch (e) {
      t.status = "error";
      t.error = e instanceof Error ? e.message : String(e);
      this.gw.fail(t.botId ?? null, `stream:${t.name}`, e);
    }
  }

  dispatch(t: Transport, space: Space, message: Message) {
    const b = t.bindings.get(message.platform) ?? t.bindings.values().next().value;
    if (!b) return;
    this.gw.ingest(space, message, b);
  }

  /** Native/Fusor webhook delivery for the cloud app (GATEWAY_INGEST=webhook). */
  async webhook(body: Uint8Array, headers: Record<string, string>) {
    const t = this.list.find((x) => x.name === "imessage-cloud");
    if (!t) return { status: 404, headers: { "content-type": "application/json" }, body: new TextEncoder().encode(JSON.stringify({ error: "webhook ingest needs GATEWAY_MODE=cloud" })) };
    return await t.app.webhook({ body, headers }, (space, message) => this.dispatch(t, space, message));
  }

  async stop() {
    if (this.telegramTimer) clearInterval(this.telegramTimer);
    await Promise.all(this.list.map(async (t) => { t.status = "stopped"; await t.app.stop().catch(() => {}); }));
  }

  // ---------------- modes ----------------

  async start() {
    const { cfg } = this;
    if (cfg.mode === "cloud") await this.startCloud();
    else if (cfg.mode === "local") await this.startLocal();
    else await this.startTerminal();
    // Telegram runs in every mode: it only needs bot tokens from the DB (polling, no Photon credentials, no public URL).
    await this.syncTelegram();
    this.telegramTimer = setInterval(() => void this.syncTelegram(), Number(process.env.GATEWAY_TELEGRAM_SYNC_MS || 5000));
  }

  private async startCloud() {
    const { cfg } = this;
    assertCloudConfig(cfg);
    const { imessage } = await import("spectrum-ts/providers/imessage");
    let app;
    try {
      app = await Spectrum({
        projectId: cfg.photon.projectId!,
        projectSecret: cfg.photon.projectSecret!,
        providers: [imessage.config()],
        webhookSecret: cfg.photon.webhookSecret,
        options: { flattenGroups: true },
      });
    } catch (e: any) {
      const detail = [...new Set([e?.status, e?.code].filter(Boolean).map(String))].join(" ");
      throw new ConfigError(
        `Photon Spectrum Cloud rejected the connection${detail ? ` (${detail})` : ""}: ${e?.message ?? e}\n` +
        "  Check PHOTON_PROJECT_ID / PHOTON_PROJECT_SECRET against app.photon.codes → your project → Settings,\n" +
        "  and that the project has iMessage enabled with at least one line.",
      );
    }
    const im = (imessage as any)(app);
    this.add("imessage-cloud", app, [{
      id: "imessage", channel: "imessage", routeChannel: "imessage", markdown: true,
      resolveSpace: async (h) => im.space.create(await im.user(h)),
    }], { pump: cfg.ingest === "stream" });
    log.info(`cloud iMessage connected (ingest=${cfg.ingest}${cfg.ingest === "webhook" ? `, POST :${cfg.port}/spectrum/webhook` : ""})`);
  }

  /** One getUpdates poller per live Telegram channel (see telegram.ts). Re-synced from the DB every GATEWAY_TELEGRAM_SYNC_MS,
   *  so connecting, changing or disconnecting a token on the Deploy page takes effect without a restart. */
  async syncTelegram() {
    if (this.telegramSyncing || process.env.GATEWAY_TELEGRAM === "0") return;
    this.telegramSyncing = true;
    try {
      const rows = all<{ bot_id: string; config_json: string | null }>(`SELECT bot_id, config_json FROM channels WHERE channel = 'telegram' AND status = 'live'`);
      const want = new Map<string, string>();
      for (const r of rows) {
        let token: string | null = null;
        try { token = telegramToken(r.config_json); } catch (e) { this.gw.fail(r.bot_id, "telegram.config", e); }
        if (token) want.set(r.bot_id, token);
      }
      for (const t of this.list.filter((t) => t.name.startsWith("telegram:"))) {
        if (t.status !== "stopped" && want.get(t.botId!) === t.telegram?.api.token) continue;
        await this.dropTelegram(t, t.status === "stopped" ? null : want.has(t.botId!) ? "token changed" : "disconnected");
      }
      for (const [botId, token] of want) {
        if (this.list.some((t) => t.name === `telegram:${botId}`)) continue;
        this.startTelegram(botId, token);
      }
    } catch (e) {
      this.gw.fail(null, "telegram.sync", e);
    } finally {
      this.telegramSyncing = false;
    }
  }

  private startTelegram(botId: string, token: string) {
    const api = new TelegramApi(token);
    const binding = telegramBinding(api, botId);
    const t = this.add(`telegram:${botId}`, { stop: async () => {} } as unknown as AnyApp, [binding], { pump: false, botId });
    t.status = "connecting";
    const poller = new TelegramPoller(api, {
      onUpdate: (u) => {
        if (t.status === "connecting") { t.status = "connected"; t.connectedAt = new Date(); }
        const message = telegramMessage(api, botId, u);
        if (!message) { this.gw.stats.ignored++; return; }
        this.gw.ingest(telegramSpace(api, String(u.message!.chat.id)), message, binding);
      },
      onFatal: (e) => {
        t.status = "error";
        t.error = `Telegram rejected the bot token (${e.message}). Paste a new token on the Deploy page.`;
        this.gw.removeBinding(binding);
        // Surface it on the Deploy page; the sync loop ignores non-live channels, so this doesn't restart-loop.
        run(`UPDATE channels SET status = 'error', updated_at = datetime('now') WHERE bot_id = ? AND channel = 'telegram' AND status = 'live'`, [botId]);
        logEvent(botId, "telegram_token_rejected", { error: e.message.slice(0, 200) });
        log.warn(`telegram bot ${botId}: token rejected, channel marked error`);
      },
      onError: (e) => {
        if (t.status === "connected" || t.status === "connecting") t.error = e instanceof Error ? e.message : String(e);
        this.gw.fail(botId, "telegram.poll", e);
      },
    });
    t.telegram = { api, poller, binding };
    t.app = { stop: () => poller.stop() } as unknown as AnyApp;
    poller.start();
    // getMe succeeds before the first (long) getUpdates returns → mark connected as soon as we know who we are.
    void (async () => {
      for (let i = 0; i < 100 && !poller.me && !poller.stopped; i++) await new Promise((r) => setTimeout(r, 100));
      if (poller.me && t.status === "connecting") { t.status = "connected"; t.connectedAt = new Date(); t.error = undefined; }
      if (poller.me) log.info(`telegram connected for bot ${botId} as @${poller.me.username}`);
    })();
  }

  private async dropTelegram(t: Transport, why: string | null) {
    if (t.telegram) this.gw.removeBinding(t.telegram.binding);
    this.list = this.list.filter((x) => x !== t);
    if (t.status !== "stopped") { t.status = "stopped"; await t.app.stop().catch(() => {}); }
    if (why) log.info(`telegram bot ${t.botId} ${why}`);
  }

  private async startLocal() {
    checkFullDiskAccess();
    let mod: typeof import("@spectrum-ts/imessage-local");
    try {
      mod = await import("@spectrum-ts/imessage-local");
    } catch (e) {
      throw new ConfigError(`GATEWAY_MODE=local needs @spectrum-ts/imessage-local (macOS only): pnpm --filter @threadline/gateway add @spectrum-ts/imessage-local\n  (${e instanceof Error ? e.message : e})`);
    }
    const { localIMessage } = mod;
    const app = await Spectrum({ providers: [localIMessage.config()], options: { flattenGroups: true } });
    const li = (localIMessage as any)(app);
    this.add("imessage-local", app, [{
      id: "local_imessage", channel: "imessage", routeChannel: "imessage", markdown: false,
      resolveSpace: async (h) => li.space.create(await li.user(h)),
    }], { pump: true });
    log.info(`local iMessage connected (this Mac's Messages). Unbound senders are ${this.cfg.quietUnbound ? "ignored unless they text a join code" : "sent help text"}.`);
  }

  private async startTerminal() {
    if (this.cfg.terminalUi === "tui") {
      const { terminal } = await import("spectrum-ts/providers/terminal");
      // The provider downloads the tuichat binary from GitHub on first run (or uses TUICHAT_BINARY). If that fails, fall back.
      let app;
      try {
        app = await Promise.race([
          Spectrum({ providers: [terminal.config({ commands: [{ name: "/stop", description: "Leave the current bot" }] })] }),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timed out after 60s")), 60_000).unref()),
        ]);
      } catch (e) {
        log.warn(`tuichat terminal UI unavailable (${e instanceof Error ? e.message : e}); using the plain terminal. ` +
          "Set TUICHAT_BINARY=/path/to/tuichat to use a pre-downloaded binary (github.com/photon-hq/tuichat/releases).");
        return this.startPlain();
      }
      const t = (terminal as any)(app);
      this.add("terminal", app, [{
        id: "terminal", channel: "terminal", routeChannel: "terminal", markdown: false,
        // each TUI chat (Ctrl+N) is its own customer
        handleOf: (space) => `terminal:${space.id}`,
        resolveSpace: async (h) => t.space.get(h.replace(/^terminal:/, "")),
      }], { pump: true });
      return;
    }
    await this.startPlain();
  }

  /** Plain stdin/stdout chat (non-TTY, CI, piping). `/as <handle>` switches who you are. */
  private async startPlain() {
    const app = await Spectrum({ providers: [stdio.config({ key: "stdio" })] });
    const s = (stdio as any)(app);
    this.add("terminal", app, [{
      id: "stdio", channel: "terminal", routeChannel: "terminal", markdown: false,
      resolveSpace: async (h) => s.space.get(h),
    }], { pump: true });
    const client = memoryClient("stdio");
    client.onSend = (m) => { if (m.type !== "typing") process.stdout.write(`bot → ${m.space}: ${m.text.replace(/\n/g, "\n    ")}\n`); };
    let who = process.env.GATEWAY_TERMINAL_HANDLE || "terminal-user";
    process.stdout.write(`Threadline terminal — you are "${who}". Type "start <join code>" to begin; "/as <handle>" to be someone else; Ctrl+D to quit.\n`);
    const rl = createInterface({ input: process.stdin, terminal: false });
    rl.on("line", (line) => {
      const t = line.trim();
      if (!t) return;
      const as = /^\/as\s+(\S+)/.exec(t);
      if (as) { who = as[1]; process.stdout.write(`(you are now "${who}")\n`); return; }
      if (t === "/stop") { client.inject({ sender: who, text: "stop" }); return; }
      process.stdout.write(`${who}: ${t}\n`);
      client.inject({ sender: who, text: t });
    });
    rl.on("close", () => {
      if (process.env.GATEWAY_EXIT_ON_EOF === "0") return;
      // piped input finished: let in-flight turns finish, then exit
      setTimeout(() => void this.gw.idle().then(() => process.emit("SIGTERM")), this.cfg.debounceMs + 100);
    });
  }
}

/** Simulator transport: same Spectrum + Gateway path, in-memory platform. */
export async function addSimTransport(set: TransportSet, key = "sim", channel: "imessage" | "terminal" = "imessage") {
  const app = await Spectrum({ providers: [sim.config({ key })] });
  const s = (sim as any)(app);
  set.add("sim", app, [{
    id: "sim", channel, routeChannel: channel, markdown: false,
    resolveSpace: async (h) => s.space.get(h),
  }], { pump: true });
  return memoryClient(key);
}

export function checkFullDiskAccess() {
  if (process.platform !== "darwin") throw new ConfigError("GATEWAY_MODE=local only works on macOS (it reads this Mac's Messages database). Use GATEWAY_MODE=cloud elsewhere.");
  const db = join(homedir(), "Library", "Messages", "chat.db");
  try {
    closeSync(openSync(db, "r"));
  } catch (e: any) {
    if (e?.code === "ENOENT") throw new ConfigError(`No Messages database at ${db}. Open the Messages app, sign in with your Apple ID, send one message, then retry.`);
    if (e?.code === "EPERM" || e?.code === "EACCES") {
      throw new ConfigError([
        `macOS blocked access to ${db} (Full Disk Access missing).`,
        "Fix:",
        "  1. Open System Settings → Privacy & Security → Full Disk Access",
        `  2. Click +, add the app that runs the gateway (Terminal, iTerm, Warp, VS Code, Cursor…) — or the node binary: ${process.execPath}`,
        "  3. Toggle it on, then QUIT and reopen that app (permissions apply to new processes only)",
        "  4. Re-run: GATEWAY_MODE=local pnpm --filter @threadline/gateway start",
      ].join("\n"));
    }
    throw e;
  }
}
