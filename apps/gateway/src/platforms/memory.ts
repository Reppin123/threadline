// In-process Spectrum platform built with definePlatform. Used by:
//   - the simulator / CI tests (platform id "sim"): scripted inbound, captured outbound, injectable send failures
//   - the plain terminal UI (platform id "stdio"): readline in, stdout out (non-TTY friendly)
// Because it is a real Spectrum provider, messages flow through Spectrum → app.messages → the same gateway handler
// as iMessage/Telegram.
import { definePlatform } from "spectrum-ts";
import { asAttachment } from "spectrum-ts/authoring";
import z from "zod";

export interface MemoryInbound {
  sender: string;
  text?: string;
  space?: string;                 // defaults to the sender (a DM)
  attachment?: { name: string; mimeType: string; bytes: Buffer };
  reaction?: { emoji: string; targetId: string };
  id?: string;
}

export interface MemorySent {
  space: string;
  type: string;                   // text | markdown | typing | ...
  text: string;
  at: number;
}

export class MemoryClient {
  sent: MemorySent[] = [];
  private failures = 0;
  private failureMessage = "simulated provider send failure";
  private queue: unknown[] = [];
  private waiters: ((v: IteratorResult<unknown>) => void)[] = [];
  closed = false;
  private seq = 0;
  onSend?: (m: MemorySent) => void;

  inject(m: MemoryInbound): string {
    const id = m.id ?? `in_${++this.seq}`;
    const space = { id: m.space ?? m.sender };
    let content: unknown;
    if (m.reaction) {
      content = {
        type: "reaction",
        emoji: m.reaction.emoji,
        target: { id: m.reaction.targetId, content: { type: "text", text: "" }, space, direction: "outbound" },
      };
    } else if (m.attachment) {
      const a = m.attachment;
      content = asAttachment({ name: a.name, mimeType: a.mimeType, size: a.bytes.length, read: async () => a.bytes });
    } else {
      content = { type: "text", text: m.text ?? "" };
    }
    this.push({ id, content, sender: { id: m.sender }, space, timestamp: new Date() });
    return id;
  }

  /** Make the next `n` outbound text sends throw. */
  failNextSends(n: number, message?: string) {
    this.failures = n;
    if (message) this.failureMessage = message;
  }

  textsTo(space: string): string[] {
    return this.sent.filter((s) => s.space === space && s.type !== "typing").map((s) => s.text);
  }

  recordSend(spaceId: string, content: { type: string } & Record<string, unknown>) {
    if (content.type !== "typing" && this.failures > 0) {
      this.failures--;
      throw new Error(this.failureMessage);
    }
    const text =
      content.type === "text" ? String(content.text) :
      content.type === "markdown" ? String(content.markdown) :
      content.type === "typing" ? String(content.state) :
      `[${content.type}]`;
    const m = { space: spaceId, type: content.type, text, at: Date.now() };
    this.sent.push(m);
    this.onSend?.(m);
    return { id: `out_${++this.seq}`, content: content as never, space: { id: spaceId }, timestamp: new Date() };
  }

  private push(v: unknown) {
    if (this.closed) return;
    const w = this.waiters.shift();
    if (w) w({ value: v, done: false });
    else this.queue.push(v);
  }

  close() {
    this.closed = true;
    for (const w of this.waiters.splice(0)) w({ value: undefined, done: true });
  }

  // Manual iterator so Spectrum's iterator.return() on stop() ends the stream immediately.
  events(): AsyncIterable<any> {
    return {
      [Symbol.asyncIterator]: () => ({
        next: (): Promise<IteratorResult<any>> => {
          if (this.queue.length) return Promise.resolve({ value: this.queue.shift(), done: false });
          if (this.closed) return Promise.resolve({ value: undefined, done: true });
          return new Promise((res) => this.waiters.push(res));
        },
        return: async (): Promise<IteratorResult<any>> => {
          this.close();
          return { value: undefined, done: true };
        },
      }),
    };
  }
}

// Clients are handed in from outside so the simulator / stdio loop can drive them.
const registry = new Map<string, MemoryClient>();
export function memoryClient(key: string): MemoryClient {
  let c = registry.get(key);
  if (!c || c.closed) { c = new MemoryClient(); registry.set(key, c); }
  return c;
}

function makeMemoryPlatform<N extends string>(id: N) {
  return definePlatform(id, {
    config: z.object({ key: z.string().default(id) }),
    lifecycle: {
      createClient: async ({ config }) => memoryClient(config.key),
      destroyClient: async ({ client }) => client.close(),
    },
    user: { resolve: async ({ input }) => ({ id: input.userID }) },
    space: {
      create: async ({ input }) => ({ id: input.users[0]?.id ?? "unknown" }),
      get: async ({ input }) => ({ id: input.id }),
    },
    messages: ({ client }) => client.events(),
    send: async ({ client, space, content }) => client.recordSend(space.id, content as never),
  });
}

export const sim = makeMemoryPlatform("sim");
export const stdio = makeMemoryPlatform("stdio");
