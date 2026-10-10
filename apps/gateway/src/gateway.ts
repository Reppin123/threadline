// The message handler shared by every transport (cloud iMessage, local iMessage, Telegram, terminal, simulator).
// inbound (space, message) → dedupe → per-sender debounce → per-sender serial queue → routing → core.chat → bubbles.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { markdown, type Message, type Space } from "spectrum-ts";
import { REPO_ROOT, logEvent } from "@threadline/db";
import type { Channel, ChatInput, ChatResult } from "@threadline/core/contract";
import { billing } from "@threadline/core";
import type { GatewayConfig } from "./config.ts";
import * as router from "./router.ts";
import { log } from "./log.ts";

export interface CoreLike {
  chat(input: ChatInput): Promise<ChatResult>;
  composeOutbound(botId: string, channel: Channel, customerHandle: string, prompt: string): Promise<{ text: string; conversationId: string }>;
}

/** How one Spectrum platform maps onto Threadline. */
export interface PlatformBinding {
  id: string;                   // spectrum platform id: imessage | local_imessage | telegram | terminal | stdio | sim
  channel: Channel;             // channel stored on conversations/customers
  routeChannel: string;         // line_routes.channel ("imessage" for the shared line)
  markdown: boolean;            // send markdown() (rendered natively) instead of plain text
  fixedBotId?: string;          // dedicated transports (a Telegram bot token) skip join-code routing
  handleOf?: (space: Space, message: Message) => string;   // customer handle; default sender id
  resolveSpace?: (handle: string) => Promise<Space>;        // open a DM to a handle for outbound sends
}

interface Item { space: Space; message: Message; binding: PlatformBinding; handle: string; at: number }
interface Normalized { text: string; attachments: NonNullable<ChatInput["attachments"]>; location?: { lat: number; lng: number }; name?: string }

/** Bindings of dedicated transports (one per Telegram token) share a platform id, so key them by bot as well. */
const bkey = (b: PlatformBinding) => b.id + (b.fixedBotId ? `#${b.fixedBotId}` : "");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class Gateway {
  readonly startedAt = new Date();
  lastMessageAt: Date | null = null;
  stats = { inbound: 0, turns: 0, outbound: 0, errors: 0, sendRetries: 0, ignored: 0 };
  private seen = new Set<string>();
  private seenOrder: string[] = [];
  private buffers = new Map<string, { items: Item[]; timer: NodeJS.Timeout }>();
  private chains = new Map<string, Promise<void>>();
  private pendingTurns = 0;
  private spaces = new Map<string, Space>();       // `${platform}|${handle}` → last space seen (for outbound)
  private idleWaiters: (() => void)[] = [];

  constructor(readonly cfg: GatewayConfig, readonly core: CoreLike, readonly bindings = new Map<string, PlatformBinding>()) {}

  addBinding(b: PlatformBinding) { this.bindings.set(bkey(b), b); }
  removeBinding(b: PlatformBinding) {
    if (this.bindings.get(bkey(b)) === b) this.bindings.delete(bkey(b));
    for (const k of [...this.spaces.keys()]) if (k.startsWith(`${bkey(b)}|`)) this.spaces.delete(k);
  }

  get queueDepth() {
    let buffered = 0;
    for (const b of this.buffers.values()) buffered += b.items.length;
    return buffered + this.pendingTurns;
  }

  /** Resolves once no messages are buffered or being processed. */
  idle(): Promise<void> {
    if (this.queueDepth === 0) return Promise.resolve();
    return new Promise((r) => this.idleWaiters.push(r));
  }
  private checkIdle() {
    if (this.queueDepth === 0) for (const w of this.idleWaiters.splice(0)) w();
  }

  /** Entry point for app.messages and app.webhook. Never throws. */
  ingest(space: Space, message: Message, binding: PlatformBinding) {
    try {
      if (message.direction === "outbound") return;
      if (this.isDuplicate(`${binding.id}|${message.id}`)) return;
      const type = message.content.type;
      if (type === "reaction" || type === "typing" || type === "read" || type === "edit" || type === "unsend") {
        this.stats.ignored++;          // tapbacks & receipts: nothing to answer
        return;
      }
      const raw = binding.handleOf ? binding.handleOf(space, message) : message.sender?.id ?? space.id;
      // Match the E.164/lowercased-email form web writes into line_routes ("tel:+1 555…" → "+1555…").
      const handle = binding.channel === "imessage" ? normalizeHandle(raw.replace(/^(tel|mailto|imessage|sms):/i, "")) ?? raw : raw;
      this.spaces.set(`${bkey(binding)}|${handle}`, space);
      this.stats.inbound++;
      this.lastMessageAt = new Date();
      if (binding.id === "imessage") {
        (message as any).read?.().catch?.(() => {});
        // Dedicated lines expose their number on the space; shared-pool lines report the "shared" sentinel.
        const phone = (space as any).phone;
        if (!this.cfg.lineHandle && typeof phone === "string" && /^\+?\d{8,15}$/.test(phone)) {
          this.cfg.lineHandle = phone;
          logEvent(null, "gateway_line_handle", { handle: phone });
          log.info(`iMessage line number learned from traffic: ${phone}`);
        }
      }
      const key = `${binding.id}|${binding.fixedBotId ?? ""}|${handle}`;
      const item: Item = { space, message, binding, handle, at: Date.now() };
      const buf = this.buffers.get(key);
      if (buf) {
        clearTimeout(buf.timer);
        buf.items.push(item);
        buf.timer = setTimeout(() => this.flush(key), this.cfg.debounceMs);
      } else {
        this.buffers.set(key, { items: [item], timer: setTimeout(() => this.flush(key), this.cfg.debounceMs) });
      }
    } catch (e) {
      this.fail(null, "ingest", e);
    }
  }

  private isDuplicate(id: string) {
    if (this.seen.has(id)) return true;
    this.seen.add(id);
    this.seenOrder.push(id);
    if (this.seenOrder.length > 5000) this.seen.delete(this.seenOrder.shift()!);
    return false;
  }

  private flush(key: string) {
    const buf = this.buffers.get(key);
    if (!buf) return;
    this.buffers.delete(key);
    this.pendingTurns++;
    const prev = this.chains.get(key) ?? Promise.resolve();
    const next = prev
      .then(() => this.turn(buf.items))
      .catch((e) => { if (!(e instanceof SendError)) this.fail(null, "turn", e); })
      .finally(() => {
        this.pendingTurns--;
        if (this.chains.get(key) === next) this.chains.delete(key);
        this.checkIdle();
      });
    this.chains.set(key, next);
  }

  // One debounced burst from one sender. Routing commands run in order; consecutive normal messages merge into one chat turn.
  private async turn(items: Item[]) {
    this.stats.turns++;
    const { space, binding, handle } = items[items.length - 1];
    let group: Normalized[] = [];
    const flushGroup = async () => {
      if (!group.length) return;
      const g = group;
      group = [];
      await this.chatTurn(space, binding, handle, {
        text: g.map((n) => n.text).filter(Boolean).join("\n"),
        attachments: g.flatMap((n) => n.attachments),
        location: g.find((n) => n.location)?.location,
        name: g.findLast((n) => n.name)?.name,
      });
    };
    for (const it of items) {
      const n = await this.normalize(it);
      if (!n) continue;
      n.name = (it.message.sender as { name?: string } | undefined)?.name || undefined;
      // Dedicated bots (Telegram): "/start" is the client's first-open command → greet from the bot profile.
      if (binding.fixedBotId && /^\/start(@\w+)?(\s|$)/i.test(n.text)) {
        await flushGroup();
        const bot = router.botById(binding.fixedBotId);
        logEvent(binding.fixedBotId, "route_start", { channel: binding.channel, handle });
        await this.sendBubbles(space, binding, [bot ? router.greetingText(bot) : "Hi! How can I help?"], binding.fixedBotId);
        continue;
      }
      const cmd = binding.fixedBotId || n.attachments.length ? { kind: "none" as const } : router.parseCommand(n.text);
      if (cmd.kind === "none") { group.push(n); continue; }
      await flushGroup();
      const handled = await this.command(space, binding, handle, cmd);
      if (handled !== true) group.push({ text: typeof handled === "string" ? handled : n.text, attachments: [] });
    }
    await flushGroup();
  }

  /** Returns true when fully handled, or text that should still go to the bot. */
  private async command(space: Space, b: PlatformBinding, handle: string, cmd: Exclude<router.Command, { kind: "none" }>): Promise<true | string | false> {
    const rc = b.routeChannel;
    if (cmd.kind === "stop") {
      const bot = router.boundBot(rc, handle);
      router.unbind(rc, handle);
      if (bot) logEvent(bot.id, "route_stop", { channel: rc, handle });
      await this.sendBubbles(space, b, [router.stoppedText(bot)], bot?.id ?? null);
      return true;
    }
    const bot = router.findBotByCode(cmd.code);
    const currentId = router.boundBotId(rc, handle);
    if (!bot) {
      if (currentId) return false;           // "start over" from a bound customer → just talk to their bot
      await this.sendBubbles(space, b, [router.unknownCodeText(cmd.code)], null);
      return true;
    }
    router.bind(rc, handle, bot.id);
    logEvent(bot.id, currentId && currentId !== bot.id ? "route_switch" : "route_bind", { channel: rc, handle, from: currentId ?? null });
    await this.sendBubbles(space, b, [router.greetingText(bot) + (currentId === bot.id ? "" : router.switchedSuffix)], bot.id);
    return cmd.rest ? cmd.rest : true;
  }

  private async chatTurn(space: Space, b: PlatformBinding, handle: string, n: Normalized) {
    let botId = b.fixedBotId;
    if (!botId) {
      const boundId = router.boundBotId(b.routeChannel, handle);
      if (!boundId) {
        if (this.cfg.quietUnbound) { this.stats.ignored++; return; }
        await this.sendBubbles(space, b, [router.helpText(this.cfg.lineHandle, router.liveBots())], null);
        return;
      }
      if (!router.boundBot(b.routeChannel, handle)) {
        router.unbind(b.routeChannel, handle);
        await this.sendBubbles(space, b, [router.goneText], null);
        return;
      }
      botId = boundId;
    }
    if (!n.text && !n.attachments.length) return;
    // billing: count against the owner's monthly allowance; over the limit / channel not on the plan → one polite notice a day.
    const gate = billing.consumeMessage(botId, b.channel);
    if (!gate.ok) {
      const notice = billing.overLimitReply(botId, handle, router.botById(botId)?.name ?? "This assistant", gate.reason);
      if (notice) await this.sendBubbles(space, b, [notice], botId, { billing: gate.reason });
      return;
    }
    logEvent(botId, "message_in", { source: "gateway", channel: b.channel, platform: b.id, handle, chars: n.text.length, attachments: n.attachments.length });
    const input: ChatInput = { botId, channel: b.channel, customerHandle: handle, customerName: n.name, text: n.text, attachments: n.attachments.length ? n.attachments : undefined, location: n.location };
    let result: ChatResult | undefined;
    try {
      result = await space.responding(() => this.retry(() => this.core.chat(input), 2, 800));
    } catch (e) {
      this.fail(botId, "core.chat", e);
      await this.sendBubbles(space, b, ["Sorry — I hit a snag on my side. Mind sending that again in a moment?"], botId);
      return;
    }
    const replies = result.replies.map((r) => r.trim()).filter(Boolean);
    await this.sendBubbles(space, b, replies, botId, { conversationId: result.conversationId });
  }

  /** Send each reply as its own bubble with small human-like pauses. Retries each send with backoff. */
  async sendBubbles(space: Space, b: PlatformBinding, replies: string[], botId: string | null, meta: Record<string, unknown> = {}) {
    let sent = 0, lastErr = "";
    for (let i = 0; i < replies.length; i++) {
      if (i > 0 && this.cfg.bubbleDelayScale > 0) {
        space.startTyping().catch(() => {});
        await sleep(this.cfg.bubbleDelayScale * Math.min(2200, 350 + replies[i].length * 12));
      }
      try {
        await this.sendOne(space, b, replies[i]);
        sent++;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
        this.fail(botId, "send", e, { bubble: i });
      }
    }
    this.stats.outbound += sent;
    if (sent) logEvent(botId, "message_out", { source: "gateway", channel: b.channel, platform: b.id, bubbles: sent, ...meta });
    if (sent < replies.length) throw new SendError(`${replies.length - sent} of ${replies.length} bubbles failed: ${lastErr}`);
  }

  private sendOne(space: Space, b: PlatformBinding, text: string) {
    return this.retry(async () => { await space.send(b.markdown ? markdown(text) : text); }, this.cfg.maxSendAttempts, this.cfg.retryBaseMs, () => this.stats.sendRetries++);
  }

  async retry<T>(fn: () => Promise<T>, attempts: number, baseMs: number, onRetry?: () => void): Promise<T> {
    let last: unknown;
    for (let i = 0; i < attempts; i++) {
      try { return await fn(); } catch (e) {
        last = e;
        if (i < attempts - 1) { onRetry?.(); await sleep(baseMs * 2 ** i); }
      }
    }
    throw last;
  }

  /** Find (or open) the DM space for an outbound message to `handle`. */
  /** Business-initiated start on the shared line: bind `handle` to the bot and text them the greeting first.
   *  Needed on Spectrum's Free/Pro shared pool, where there's no fixed number customers could text "start <code>" to. */
  async invite(botId: string, handle: string, channel = "imessage"): Promise<{ bot: string; handle: string; routeChannel: string }> {
    const bot = router.liveBots().find((b) => b.id === botId || b.joinCode.toLowerCase() === botId.toLowerCase());
    if (!bot) throw new InviteError(`bot ${botId} is not live on iMessage — deploy it first`);
    const h = normalizeHandle(handle);
    if (!h) throw new InviteError("handle must be an E.164 phone number (+15551234567) or an email");
    const hasChannel = [...this.bindings.values()].some((b) => b.channel === channel);
    const { space, binding } = await this.spaceFor(!hasChannel && this.cfg.mode === "terminal" ? "terminal" : channel, h, bot.id);
    const currentId = router.boundBotId(binding.routeChannel, h);
    router.bind(binding.routeChannel, h, bot.id);
    this.spaces.set(`${bkey(binding)}|${h}`, space);
    logEvent(bot.id, "route_invite", { channel: binding.routeChannel, handle: h, from: currentId ?? null });
    await this.sendBubbles(space, binding, [router.greetingText(bot) + router.switchedSuffix], bot.id);
    return { bot: bot.name, handle: h, routeChannel: binding.routeChannel };
  }

  async spaceFor(channel: string, handle: string, botId: string): Promise<{ space: Space; binding: PlatformBinding }> {
    const candidates = [...this.bindings.values()].filter((b) => b.channel === channel && (!b.fixedBotId || b.fixedBotId === botId));
    if (!candidates.length) throw new Error(`no ${channel} transport connected in GATEWAY_MODE=${this.cfg.mode}`);
    for (const b of candidates) {
      const s = this.spaces.get(`${bkey(b)}|${handle}`);
      if (s) return { space: s, binding: b };
    }
    const b = candidates.find((c) => c.resolveSpace);
    if (!b) throw new Error(`cannot open a ${channel} conversation with ${handle}`);
    return { space: await b.resolveSpace!(handle), binding: b };
  }

  private async normalize(it: Item): Promise<Normalized | null> {
    const c = it.message.content as any;
    switch (c.type) {
      case "text": return { text: String(c.text ?? "").trim(), attachments: [] };
      case "richlink": return { text: String(c.url ?? ""), attachments: [], location: parseMapsLocation(String(c.url ?? "")) };
      case "contact": return { text: `[shared a contact: ${c.name?.formatted ?? ""} ${(c.phones ?? []).map((p: any) => p.value ?? p).join(", ")}]`.trim(), attachments: [] };
      case "attachment":
      case "voice": {
        try {
          const path = await saveMedia(it, c);
          return { text: String(c.caption ?? "").trim(), attachments: [{ path, mime: c.mimeType, name: c.name }] };
        } catch (e) {
          this.fail(null, "attachment", e);
          return { text: `[sent ${c.type === "voice" ? "a voice note" : `a file: ${c.name ?? "attachment"}`} that couldn't be downloaded]`, attachments: [] };
        }
      }
      case "location": return { text: c.title ? `[shared a location: ${c.title}]` : "[shared a location]", attachments: [], location: { lat: Number(c.lat), lng: Number(c.lng) } };
      case "poll": return { text: `[poll] ${c.title ?? ""}`, attachments: [] };
      default: return null;
    }
  }

  fail(botId: string | null, stage: string, e: unknown, extra: Record<string, unknown> = {}) {
    this.stats.errors++;
    const msg = e instanceof Error ? e.message : String(e);
    log.error(`[${stage}] ${msg}`);
    try { logEvent(botId, "gateway_error", { stage, error: msg.slice(0, 500), ...extra }); } catch {}
  }
}

export class SendError extends Error {}

function parseMapsLocation(url: string): { lat: number; lng: number } | undefined {
  const m = /[?&](?:ll|q|daddr|sll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/.exec(url);
  if (!m || !/maps\.(apple|google)\.com|goo\.gl\/maps/.test(url)) return undefined;
  return { lat: Number(m[1]), lng: Number(m[2]) };
}

async function saveMedia(it: Item, c: { name?: string; mimeType?: string; read: () => Promise<Buffer> }) {
  const buf = await c.read();
  const dir = join(process.env.GATEWAY_MEDIA_DIR || join(REPO_ROOT, "data", "media"), new Date().toISOString().slice(0, 7));
  mkdirSync(dir, { recursive: true });
  const safe = (c.name || "file").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const path = join(dir, `${Date.now()}-${it.message.id.replace(/[^a-zA-Z0-9]/g, "").slice(-12)}-${safe}`);
  writeFileSync(path, buf);
  return path;
}

export class InviteError extends Error {}

/** "+1 (555) 123-4567" → "+15551234567"; 10-digit US numbers get +1; emails lowercased. */
export function normalizeHandle(raw: string): string | null {
  const t = raw.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return t.toLowerCase();
  const digits = t.replace(/[^\d]/g, "");
  if (t.startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}
