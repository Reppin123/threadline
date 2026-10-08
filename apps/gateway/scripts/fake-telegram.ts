// In-process fake of the Telegram Bot API (no network) for the simulator: getMe, deleteWebhook, getUpdates (long poll),
// sendMessage, sendChatAction, getFile + /file downloads. Point the gateway at it with TELEGRAM_API_BASE=fake.url.
import { createServer, type Server } from "node:http";

export interface FakeBot { id: number; username: string; first_name: string; token: string }
export interface Sent { token: string; chat_id: string; text: string; at: number }

export class FakeTelegram {
  url = "";
  bots = new Map<string, FakeBot>();               // token → bot
  sent: Sent[] = [];
  actions: { token: string; chat_id: string; action: string }[] = [];
  calls: { token: string; method: string }[] = [];
  files = new Map<string, Buffer>();               // file_id → bytes
  fail429 = 0;                                      // next N sendMessage calls answer 429 retry_after=1
  private queues = new Map<string, { update_id: number; message: unknown }[]>();
  private waiters = new Map<string, () => void>();
  private nextUpdate = 1000;
  private nextMsg = 1;
  private server: Server | null = null;

  addBot(token: string, username: string): FakeBot {
    const b = { id: 7000 + this.bots.size, username, first_name: username.replace(/_bot$/i, ""), token };
    this.bots.set(token, b);
    return b;
  }
  revoke(token: string) { this.bots.delete(token); this.waiters.get(token)?.(); }

  /** A customer sends a message to a bot. `msg` is merged into a private-chat message from user `chatId`. */
  push(token: string, chatId: number, msg: Record<string, unknown>) {
    const message = { message_id: this.nextMsg++, date: Math.floor(Date.now() / 1000), chat: { id: chatId, type: "private", first_name: "Cust" },
      from: { id: chatId, is_bot: false, first_name: "Casey", last_name: "Customer" }, ...msg };
    const q = this.queues.get(token) ?? [];
    q.push({ update_id: this.nextUpdate++, message });
    this.queues.set(token, q);
    this.waiters.get(token)?.();
  }
  text(token: string, chatId: number, text: string) { this.push(token, chatId, { text }); }
  textsTo(token: string, chatId: number | string) { return this.sent.filter((s) => s.token === token && s.chat_id === String(chatId)).map((s) => s.text); }
  pollers(token: string) { return this.calls.filter((c) => c.token === token && c.method === "getUpdates").length; }

  async start(): Promise<string> {
    this.server = createServer(async (req, res) => {
      const reply = (status: number, body: unknown) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(c as Buffer);
      const fileM = /^\/file\/bot([^/]+)\/(.+)$/.exec(req.url ?? "");
      if (fileM) {
        const buf = this.files.get(fileM[2].replace(/^files\//, ""));
        if (!this.bots.has(fileM[1]) || !buf) return reply(404, { ok: false, error_code: 404, description: "Not Found" });
        res.writeHead(200, { "content-type": "application/octet-stream" });
        return res.end(buf);
      }
      const m = /^\/bot([^/]+)\/(\w+)$/.exec(req.url ?? "");
      if (!m) return reply(404, { ok: false, error_code: 404, description: "Not Found" });
      const [, token, method] = m;
      this.calls.push({ token, method });
      const bot = this.bots.get(token);
      if (!bot) return reply(401, { ok: false, error_code: 401, description: "Unauthorized" });
      let p: Record<string, any> = {};
      try { p = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch {}
      switch (method) {
        case "getMe": return reply(200, { ok: true, result: { id: bot.id, is_bot: true, first_name: bot.first_name, username: bot.username } });
        case "deleteWebhook": return reply(200, { ok: true, result: true });
        case "sendChatAction": this.actions.push({ token, chat_id: String(p.chat_id), action: p.action }); return reply(200, { ok: true, result: true });
        case "sendMessage": {
          if (this.fail429 > 0) { this.fail429--; return reply(429, { ok: false, error_code: 429, description: "Too Many Requests: retry after 1", parameters: { retry_after: 1 } }); }
          if (typeof p.text !== "string" || !p.text || p.text.length > 4096) return reply(400, { ok: false, error_code: 400, description: "Bad Request: message text is empty or too long" });
          this.sent.push({ token, chat_id: String(p.chat_id), text: p.text, at: Date.now() });
          return reply(200, { ok: true, result: { message_id: this.nextMsg++, chat: { id: Number(p.chat_id), type: "private" }, text: p.text } });
        }
        case "getFile": return this.files.has(p.file_id)
          ? reply(200, { ok: true, result: { file_id: p.file_id, file_path: `files/${p.file_id}` } })
          : reply(400, { ok: false, error_code: 400, description: "Bad Request: invalid file_id" });
        case "getUpdates": {
          const offset = Number(p.offset ?? 0);
          const take = () => {
            const q = (this.queues.get(token) ?? []).filter((u) => u.update_id >= offset);
            this.queues.set(token, q);       // acknowledging = dropping everything below offset
            return q.slice(0, Number(p.limit ?? 100));
          };
          let got = take();
          if (!got.length && Number(p.timeout) > 0) {
            await new Promise<void>((r) => {
              const t = setTimeout(r, Number(p.timeout) * 1000);
              this.waiters.set(token, () => { clearTimeout(t); r(); });
              req.on("close", () => { clearTimeout(t); r(); });
            });
            this.waiters.delete(token);
            if (!this.bots.has(token)) return reply(401, { ok: false, error_code: 401, description: "Unauthorized" });
            got = take();
          }
          return reply(200, { ok: true, result: got });
        }
        default: return reply(400, { ok: false, error_code: 400, description: `Bad Request: unknown method ${method}` });
      }
    });
    await new Promise<void>((r) => this.server!.listen(0, "127.0.0.1", () => r()));
    const a = this.server.address() as { port: number };
    this.url = `http://127.0.0.1:${a.port}`;
    return this.url;
  }
  stop() { for (const w of this.waiters.values()) w(); this.server?.closeAllConnections(); this.server?.close(); }
}
