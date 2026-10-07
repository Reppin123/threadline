import { run, id, get } from "@threadline/db";
import { core } from "../src/index.ts";
const u = id("u_"); run("INSERT INTO users(id,email) VALUES (?,?)", [u, u + "@t.dev"]);
const t0 = Date.now();
const { botId } = await core.createBot(u, { kind: "website", url: "https://sanitea.vercel.app" }, [
 { question: "What are we starting from?", answer: "Existing website or app" },
 { question: "What's the website or app address?", answer: "https://sanitea.vercel.app" },
 { question: "Who will chat with the Sanitea bot?", answer: ["My customers", "My team"] },
 { question: "What should the Sanitea bot do?", answer: ["Track orders", "Take orders", "Recommend teas", "Share brewing tips", "Manage team tasks"] },
 { question: "For taking and tracking orders, use…", answer: "Just a website" }]);
console.log("BOT", botId);
await core.buildBot(botId, (p) => console.log("progress", p.pct, p.label, p.detail ?? "", ((Date.now()-t0)/1000).toFixed(0)+"s"));
const b = get<any>("SELECT profile_json FROM bots WHERE id=?", [botId]);
console.log(b.profile_json.slice(0, 3000));
for (const q of ["what can i buy for diwali gifting?", "how do I brew masala chai?", "what's your return policy"]) {
  const t = Date.now();
  const r = await core.chat({ botId, channel: "imessage", customerHandle: "+15550001", text: q, isTest: false });
  console.log("\nQ:", q, `(${Date.now()-t}ms)`, "\nA:", r.replies.join(" | "), r.toolCalls.map(x=>x.name));
}
