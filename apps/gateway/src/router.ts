// Routing on ONE shared line: join codes bind a sender to a bot (line_routes), "switch <code>" rebinds, "stop" unbinds.
// Only bots with channels(channel='imessage', status='live') are routable. Queried per message, so newly deployed bots
// are picked up without a restart.
import { get, all, run, json } from "@threadline/db";

export interface RoutableBot {
  id: string;
  name: string;
  joinCode: string;
  greeting: string | null;
}

export type Command =
  | { kind: "join"; code: string; rest: string }    // "start <code> [rest]" or a bare code
  | { kind: "switch"; code: string; rest: string }
  | { kind: "stop" }
  | { kind: "none" };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Channels on which a sender's route lives. All iMessage-family transports share the "imessage" line.
export const ROUTED_CHANNELS = ["imessage", "terminal"] as const;

export function liveBots(): RoutableBot[] {
  const rows = all<{ id: string; name: string; join_code: string; profile_json: string | null }>(
    `SELECT b.id, b.name, b.join_code, b.profile_json FROM bots b
       JOIN channels c ON c.bot_id = b.id AND c.channel = 'imessage' AND c.status = 'live'`,
  );
  return rows.map((r) => {
    const p = json.parse<{ name?: string; greeting?: string }>(r.profile_json, {});
    return { id: r.id, name: p.name || r.name, joinCode: r.join_code, greeting: p.greeting || null };
  });
}

export function liveBotCount(): number {
  return get<{ n: number }>(`SELECT COUNT(*) AS n FROM channels WHERE channel = 'imessage' AND status = 'live'`)?.n ?? 0;
}

export function findBotByCode(code: string, bots = liveBots()): RoutableBot | undefined {
  const n = norm(code);
  if (!n) return undefined;
  return bots.find((b) => norm(b.joinCode) === n);
}

// Find the longest prefix of `words` that normalises to a live join code ("bakery 7k2" == "bakery-7k2").
function matchCodePrefix(words: string[], bots: RoutableBot[]): { bot: RoutableBot; used: number } | undefined {
  for (let k = Math.min(words.length, 4); k >= 1; k--) {
    const bot = findBotByCode(words.slice(0, k).join(""), bots);
    if (bot) return { bot, used: k };
  }
  return undefined;
}

export function parseCommand(text: string, bots = liveBots()): Command {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return { kind: "none" };
  const lower = t.toLowerCase().replace(/[.!]+$/, "");
  if (lower === "stop" || lower === "stop bot" || lower === "unsubscribe") return { kind: "stop" };

  const m = /^(start|join|switch(?: to)?)\s*:?\s*(.*)$/i.exec(t);
  if (m) {
    const verb = m[1].toLowerCase().startsWith("switch") ? "switch" : "join";
    const words = m[2].split(" ").filter(Boolean);
    if (!words.length) return { kind: "none" };
    const hit = matchCodePrefix(words, bots);
    if (hit) return { kind: verb, code: hit.bot.joinCode, rest: words.slice(hit.used).join(" ") };
    // "start blah" with an unknown code: still a routing attempt (so we can say the code is wrong)
    if (words.length <= 2 && words.every((w) => /^[a-z0-9-]{2,}$/i.test(w))) return { kind: verb, code: words.join(" "), rest: "" };
    return { kind: "none" };
  }
  // Bare code ("bakery-7k2", "Bakery 7K2")
  const words = t.split(" ");
  if (words.length <= 3) {
    const hit = matchCodePrefix(words, bots);
    if (hit && hit.used === words.length) return { kind: "join", code: hit.bot.joinCode, rest: "" };
  }
  return { kind: "none" };
}

export function boundBot(channel: string, sender: string): RoutableBot | undefined {
  const r = get<{ bot_id: string }>("SELECT bot_id FROM line_routes WHERE channel = ? AND sender_handle = ?", [channel, sender]);
  if (!r) return undefined;
  return liveBots().find((b) => b.id === r.bot_id);
}

export function boundBotId(channel: string, sender: string): string | undefined {
  return get<{ bot_id: string }>("SELECT bot_id FROM line_routes WHERE channel = ? AND sender_handle = ?", [channel, sender])?.bot_id;
}

export function bind(channel: string, sender: string, botId: string) {
  run(
    `INSERT INTO line_routes(channel, sender_handle, bot_id) VALUES (?,?,?)
       ON CONFLICT(channel, sender_handle) DO UPDATE SET bot_id = excluded.bot_id, bound_at = datetime('now')`,
    [channel, sender, botId],
  );
}

export function unbind(channel: string, sender: string) {
  run("DELETE FROM line_routes WHERE channel = ? AND sender_handle = ?", [channel, sender]);
}

// ---- copy ----
export function helpText(lineHandle?: string, bots?: RoutableBot[]): string {
  const example = bots && bots.length === 1 ? bots[0].joinCode : "bakery-7k2";
  return [
    "Hi! This number connects you to business assistants built on Threadline.",
    `To start, text "start" followed by the business's code — e.g. "start ${example}".`,
    "You'll find the code on the business's website or QR code.",
    lineHandle ? `(This line: ${lineHandle})` : "",
  ].filter(Boolean).join("\n");
}

export const unknownCodeText = (code: string) =>
  `Hmm, I couldn't find an assistant with the code "${code}". Double-check it and text "start <code>" again.`;

export const greetingText = (bot: RoutableBot) =>
  bot.greeting || `Hi! You're now chatting with ${bot.name}. How can I help?`;

export const switchedSuffix = `\n\n(Text "stop" any time to leave, or "switch <code>" to talk to another business.)`;

export const stoppedText = (bot?: RoutableBot) =>
  bot
    ? `You've left ${bot.name}. Text "start <code>" any time to chat again.`
    : `You're not connected to any assistant right now. Text "start <code>" to begin.`;

export const goneText = `The assistant you were chatting with is no longer available here. Text "start <code>" to connect to another one.`;
