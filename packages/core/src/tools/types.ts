import type { BotConfig, ToolSpec } from "../config.ts";
export interface ToolCtx {
  botId: string;
  customerId: string;
  conversationId: string;
  channel: string;
  isTest: boolean;
  config: BotConfig;
  dryRun?: boolean;             // checks: build the request but don't mutate the outside world
}
export type ToolImpl = (input: any, ctx: ToolCtx, spec: ToolSpec) => Promise<unknown>;
