// Metered usage per bot (usage table). Categories match the Stats "Spend this month" buckets.
import { run, get, id } from "@threadline/db";

export type UsageCategory = "answering" | "build" | "media" | "tests";

export function recordUsage(botId: string | null, category: UsageCategory, u: { inputTokens: number; outputTokens: number; costUsd: number }) {
  if (!botId) return;
  const bot = get<{ user_id: string }>("SELECT user_id FROM bots WHERE id=?", [botId]);
  if (!bot) return;
  run("INSERT INTO usage(id,user_id,bot_id,category,input_tokens,output_tokens,cost_usd) VALUES (?,?,?,?,?,?,?)",
    [id("us_"), bot.user_id, botId, category, u.inputTokens, u.outputTokens, u.costUsd]);
}

/** Collects cost across several LLM calls (e.g. one chat turn). */
export class CostMeter {
  total = 0;
  add(u: { costUsd: number }) { this.total += u.costUsd; }
}
