// Telegram transport: one long-polling loop (getUpdates) per bot token, straight against the Telegram Bot API.
// Polling needs no public URL, so it behaves the same on a laptop and inside the Cloudflare container (where only web :3000
// is reachable from outside). Each Telegram bot belongs to exactly one Threadline bot (binding.fixedBotId), so there is no
// join-code routing here. Updates are mapped onto the Spectrum-shaped Space/Message objects the Gateway already handles,
// which keeps debounce, the per-chat serial queue, retries, events and the outbound worker identical to iMessage.
import { decryptJson } from "@threadline/db";
import type { Message, Space } from "spectrum-ts";
import type { PlatformBinding } from "./gateway.ts";

const sleep = (ms: number, signal?: AbortSignal) => new Promise<void>((r) => {
  const t = setTimeout(r, ms);
  signal?.addEventListener("abort", () => { clearTimeout(t); r(); }, { once: true });
});

export const TELEGRAM_MAX_TEXT = 4096;

export class TelegramApiError extends Error {
  constructor(message: string, readonly code: number, readonly retryAfter?: number) { super(message); }
  /** Token revoked / never valid: polling can't recover, the owner must paste a new token. */
  get fatal() { return this.code === 401 || this.code === 404; }
}

export interface TgUser { id: number; is_bot?: boolean; first_name?: string; last_name?: string; username?: string }
export interface TgMessage {
  message_id: number; date?: number; chat: { id: number; type: string; title?: string; username?: string; first_name?: string };
  from?: TgUser; text?: string; caption?: string;
  photo?: { file_id: string; file_size?: number; width?: number }[];
  document?: { file_id: string; file_name?: string; mime_type?: string };
  voice?: { file_id: string; mime_type?: string }; audio?: { file_id: string; file_name?: string; mime_type?: string };
  video?: { file_id: string; file_name?: string; mime_type?: string };
  location?: { latitude: number; longitude: number }; venue?: { location: { latitude: number; longitude: number }; title?: string; address?: string };
  contact?: { phone_number: string; first_name?: string; last_name?: string };
  sticker?: { emoji?: string };
}
export interface TgUpdate { update_id: number; message?: TgMessage }

/** Minimal Bot API client. 429s are retried after `retry_after`; the token never appears in errors or logs. */
export class TelegramApi {
  readonly base: string;
  constructor(readonly token: string, base = process.env.TELEGRAM_API_BASE || "https://api.telegram.org") {
    this.base = base.replace(/\/+$/, "");
  }

  private scrub(s: string) { return this.token ? s.split(this.token).join("<token>") : s; }

  async call<T = any>(method: string, params: Record<string, unknown> = {}, opts: { signal?: AbortSignal; timeoutMs?: number; max429?: number } = {}): Promise<T> {
    const max429 = opts.max429 ?? 5;
    for (let attempt = 0; ; attempt++) {
      const signals = [AbortSignal.timeout(opts.timeoutMs ?? 30_000), ...(opts.signal ? [opts.signal] : [])];
      let res: Response;
      try {
        res = await fetch(`${this.base}/bot${this.token}/${method}`, {
          method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(params), signal: AbortSignal.any(signals),
        });
      } catch (e) {
        throw new TelegramApiError(this.scrub(`${method}: ${e instanceof Error ? e.message : e}`), 0);
      }
      let body: { ok?: boolean; result?: T; description?: string; error_code?: number; parameters?: { retry_after?: number } };
      try { body = await res.json() as typeof body; } catch { body = { ok: false, description: `HTTP ${res.status}`, error_code: res.status }; }
      if (body.ok) return body.result as T;
      const code = body.error_code ?? res.status;
      const retryAfter = body.parameters?.retry_after;
      if (code === 429 && attempt < max429) {
        await sleep(Math.max(0, retryAfter ?? 1) * 1000 * retryAfterScale(), opts.signal);
        if (opts.signal?.aborted) throw new TelegramApiError(`${method}: aborted`, 0);
        continue;
      }
      throw new TelegramApiError(this.scrub(`${method}: ${body.description ?? `HTTP ${res.status}`}`), code, retryAfter);
    }
  }

  async download(fileId: string): Promise<{ buf: Buffer; path: string }> {
    const f = await this.call<{ file_path?: string }>("getFile", { file_id: fileId });
    if (!f.file_path) throw new Error("Telegram returned no file_path (file too large for bots? limit is 20 MB)");
    const res = await fetch(`${this.base}/file/bot${this.token}/${f.file_path}`, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`file download failed: HTTP ${res.status}`);
    return { buf: Buffer.from(await res.arrayBuffer()), path: f.file_path };
  }
}

const retryAfterScale = () => {
  const v = process.env.TELEGRAM_RETRY_AFTER_SCALE, n = Number(v);
  return v && Number.isFinite(n) && n >= 0 ? n : 1;   // tests shrink retry_after waits
};

/** Token stored in channels.config_json: encrypted JSON {token, username, ...}; legacy plaintext JSON also accepted. */
export function telegramToken(configJson: string | null): string | null {
  const c = decryptJson<Record<string, unknown>>(configJson, {});
  const t = c.token ?? c.botToken ?? c.bot_token;
  return typeof t === "string" && t.trim() ? t.trim() : null;
}

// ---------------- outgoing text ----------------

/** Replies are sent as plain text (no parse_mode): strip the light markdown core produces so nothing shows raw `**`. */
export function toPlainText(md: string): string {
  return md
    .replace(/```[a-z]*\n?([\s\S]*?)```/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, (_m, t: string, u: string) => (t === u ? u : `${t} (${u})`))
    .replace(/^#{1,6}\s+/gm, "")
    .trim();
}

/** Split into ≤4096-char chunks, preferring paragraph, then line, then word boundaries. */
export function splitText(text: string, max = TELEGRAM_MAX_TEXT): string[] {
  const out: string[] = [];
  let rest = text;
  while (rest.length > max) {
    const window = rest.slice(0, max);
    let cut = window.lastIndexOf("\n\n");
    if (cut < max * 0.5) cut = window.lastIndexOf("\n");
    if (cut < max * 0.5) cut = window.lastIndexOf(" ");
    if (cut < max * 0.5) cut = max;
    out.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  if (rest) out.push(rest);
  return out;
}

// ---------------- Spectrum-shaped adapters ----------------

/** A private chat as a Spectrum-like Space: send / typing / responding are all the Gateway uses. */
export function telegramSpace(api: TelegramApi, chatId: string): Space {
  const typing = () => api.call("sendChatAction", { chat_id: chatId, action: "typing" }, { max429: 0, timeoutMs: 10_000 }).then(() => {});
  const space = {
    id: chatId,
    platform: "telegram",
    async send(content: unknown) {
      const raw = typeof content === "string" ? content : String((content as any)?.text ?? (content as any)?.markdown ?? content ?? "");
      for (const chunk of splitText(toPlainText(raw))) {
        await api.call("sendMessage", { chat_id: chatId, text: chunk, link_preview_options: { is_disabled: false } });
      }
    },
    startTyping: typing,
    stopTyping: async () => {},
    // Telegram's typing indicator lasts ~5s, so refresh it every 4s while core thinks.
    async responding<T>(fn: () => Promise<T>): Promise<T> {
      typing().catch(() => {});
      const timer = setInterval(() => typing().catch(() => {}), 4000);
      try { return await fn(); } finally { clearInterval(timer); }
    },
  };
  return space as unknown as Space;
}

const displayName = (u?: TgUser) => (u ? [u.first_name, u.last_name].filter(Boolean).join(" ") || (u.username ? `@${u.username}` : undefined) : undefined);

/** Map one update to a Spectrum-like Message, or null when there's nothing to answer (groups, bots, edits, service messages). */
export function telegramMessage(api: TelegramApi, botId: string, u: TgUpdate): Message | null {
  const m = u.message;
  if (!m || m.chat?.type !== "private" || m.from?.is_bot) return null;
  const file = (fileId: string, name: string, mimeType: string, type: "attachment" | "voice" = "attachment") => ({
    type, name, mimeType, caption: m.caption,
    read: async () => (await api.download(fileId)).buf,
  });
  let content: Record<string, unknown> | null = null;
  if (typeof m.text === "string") content = { type: "text", text: m.text };
  else if (m.photo?.length) {
    const best = [...m.photo].sort((a, b) => (b.file_size ?? b.width ?? 0) - (a.file_size ?? a.width ?? 0))[0];
    content = file(best.file_id, `photo-${m.message_id}.jpg`, "image/jpeg");
  } else if (m.document) content = file(m.document.file_id, m.document.file_name || `file-${m.message_id}`, m.document.mime_type || "application/octet-stream");
  else if (m.voice) content = file(m.voice.file_id, `voice-${m.message_id}.ogg`, m.voice.mime_type || "audio/ogg", "voice");
  else if (m.audio) content = file(m.audio.file_id, m.audio.file_name || `audio-${m.message_id}`, m.audio.mime_type || "audio/mpeg");
  else if (m.video) content = file(m.video.file_id, m.video.file_name || `video-${m.message_id}.mp4`, m.video.mime_type || "video/mp4");
  else if (m.venue) content = { type: "location", lat: m.venue.location.latitude, lng: m.venue.location.longitude, title: [m.venue.title, m.venue.address].filter(Boolean).join(", ") };
  else if (m.location) content = { type: "location", lat: m.location.latitude, lng: m.location.longitude };
  else if (m.contact) content = { type: "contact", name: { formatted: [m.contact.first_name, m.contact.last_name].filter(Boolean).join(" ") }, phones: [m.contact.phone_number] };
  else if (m.sticker) content = { type: "text", text: m.sticker.emoji || "[sticker]" };
  if (!content) return null;
  return {
    id: `${botId}:${u.update_id}`,
    direction: "inbound",
    platform: "telegram",
    sender: { id: String(m.chat.id), name: displayName(m.from) },
    content,
    timestamp: m.date ? new Date(m.date * 1000) : new Date(),
  } as unknown as Message;
}

export function telegramBinding(api: TelegramApi, botId: string): PlatformBinding {
  return {
    id: "telegram", channel: "telegram", routeChannel: "telegram", markdown: false, fixedBotId: botId,
    handleOf: (space) => space.id,
    resolveSpace: async (chatId) => telegramSpace(api, chatId),
  };
}

// ---------------- poller ----------------

export interface PollerHooks {
  onUpdate(u: TgUpdate): void;
  onFatal(e: TelegramApiError): void;
  onError(e: unknown): void;
}

/** getUpdates loop for one token. Never throws; stops on stop() or a fatal (401/404) error. */
export class TelegramPoller {
  offset = 0;
  stopped = false;
  me: TgUser | null = null;
  lastPollAt: Date | null = null;
  private abort = new AbortController();
  private done: Promise<void> | null = null;

  constructor(readonly api: TelegramApi, private hooks: PollerHooks, private pollTimeoutSec = Number(process.env.GATEWAY_TELEGRAM_POLL_TIMEOUT || 25)) {}

  start() { this.done ??= this.loop(); return this; }

  async stop() {
    if (this.stopped) return;
    this.stopped = true;
    this.abort.abort();
    await this.done?.catch(() => {});
    // Confirm what we already processed so a restart doesn't replay it.
    if (this.offset) await this.api.call("getUpdates", { offset: this.offset, timeout: 0, limit: 1 }, { timeoutMs: 5000, max429: 0 }).catch(() => {});
  }

  private async loop() {
    let backoff = 0;
    // getUpdates is refused (409) while a webhook is set, e.g. a token previously used elsewhere.
    for (let first = true; !this.stopped; first = false) {
      try {
        if (first || !this.me) {
          this.me = await this.api.call<TgUser>("getMe", {}, { signal: this.abort.signal, timeoutMs: 15_000 });
          await this.api.call("deleteWebhook", { drop_pending_updates: false }, { signal: this.abort.signal, timeoutMs: 15_000 });
        }
        const updates = await this.api.call<TgUpdate[]>("getUpdates",
          { offset: this.offset || undefined, timeout: this.pollTimeoutSec, allowed_updates: ["message"] },
          { signal: this.abort.signal, timeoutMs: (this.pollTimeoutSec + 15) * 1000 });
        this.lastPollAt = new Date();
        backoff = 0;
        for (const u of updates) {
          this.offset = Math.max(this.offset, u.update_id + 1);
          try { this.hooks.onUpdate(u); } catch (e) { this.hooks.onError(e); }   // one bad update never stops the loop
        }
      } catch (e) {
        if (this.stopped) break;
        if (e instanceof TelegramApiError && e.fatal) { this.stopped = true; this.hooks.onFatal(e); break; }
        this.hooks.onError(e);
        if (e instanceof TelegramApiError && e.code === 409) this.me = null;   // re-run deleteWebhook
        backoff = Math.min(30_000, backoff ? backoff * 2 : 1000);
        await sleep(backoff, this.abort.signal);
      }
    }
  }
}
