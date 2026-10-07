// Creates (or reuses) a demo bot that is live on iMessage, and prints its join code.
//   THREADLINE_DB=/tmp/tl-gateway-test.db pnpm --filter @threadline/gateway exec tsx scripts/seed-demo.ts [idea]
import { get, run, id, dbPath } from "@threadline/db";
import { core } from "@threadline/core";

const idea = process.argv.slice(2).join(" ") || "Bakery that takes cake orders and answers opening hours";
let user = get<{ id: string }>("SELECT id FROM users WHERE email = ?", ["gateway-demo@threadline.local"]);
if (!user) { user = { id: id("u_") }; run("INSERT INTO users(id, email, name) VALUES (?,?,?)", [user.id, "gateway-demo@threadline.local", "Gateway Demo"]); }

const { botId, joinCode } = await core.createBot(user.id, { kind: "idea", idea });
await core.buildBot(botId);
await core.deploy(botId);
run(`INSERT INTO channels(bot_id, channel, status) VALUES (?, 'imessage', 'live')
       ON CONFLICT(bot_id, channel) DO UPDATE SET status = 'live', updated_at = datetime('now')`, [botId]);
console.log(JSON.stringify({ db: dbPath(), botId, joinCode }));
