// Tool registry + executor with confirmation gate, timing, logging.
import { logEvent } from "@threadline/db";
import type { ToolSpec } from "../config.ts";
import type { ToolDef } from "../llm.ts";
import type { ToolCtx } from "./types.ts";
import { builtinImpls } from "./builtin.ts";
import { mockImpl } from "./mock.ts";
import { httpImpl } from "./http.ts";
import { mcpImpl } from "./mcp.ts";
export type { ToolCtx } from "./types.ts";

export function toolDefs(specs: ToolSpec[]): ToolDef[] {
  return specs.filter((t) => t.enabled).map((t) => {
    const schema = t.input_schema && typeof t.input_schema === "object" ? JSON.parse(JSON.stringify(t.input_schema)) : { type: "object", properties: {} };
    schema.type ??= "object";
    schema.properties ??= {};
    let description = t.description;
    if (t.requires_confirmation) {
      schema.properties.confirmed = { type: "boolean", description: "true only after the customer explicitly confirmed this exact action" };
      description += " [NEEDS CONFIRMATION: summarise the action and get an explicit yes first, then call with confirmed=true]";
    }
    return { name: t.name, description: description.slice(0, 1000), input_schema: schema };
  });
}

export async function executeTool(spec: ToolSpec | undefined, name: string, input: any, ctx: ToolCtx): Promise<{ ok: boolean; output: unknown; ms: number }> {
  const t0 = Date.now();
  if (!spec || !spec.enabled) return { ok: false, output: { error: `Unknown or disabled tool ${name}` }, ms: 0 };
  if (spec.requires_confirmation && input?.confirmed !== true && !ctx.dryRun)
    return { ok: false, output: { error: "needs_confirmation", note: "Summarise exactly what you'll do and ask the customer to confirm. Call again with confirmed=true only after they say yes." }, ms: 0 };
  try {
    const args = { ...(input ?? {}) };
    if (spec.requires_confirmation) delete args.confirmed;
    let output: unknown;
    if (spec.kind === "builtin") {
      const impl = builtinImpls[spec.name];
      if (!impl) throw new Error("no builtin " + spec.name);
      output = await impl(args, ctx, spec);
    } else if (spec.kind === "mock") output = await mockImpl(args, ctx, spec);
    else if (spec.kind === "http") output = await httpImpl(args, ctx, spec);
    else if (spec.kind === "mcp") output = await mcpImpl(args, ctx, spec);
    else throw new Error("unknown tool kind " + spec.kind);
    const ok = !(output && typeof output === "object" && ((output as any).ok === false || (output as any).isError === true));
    logEvent(ctx.botId, "tool_call", { name, ok, ms: Date.now() - t0, isTest: ctx.isTest });
    return { ok, output, ms: Date.now() - t0 };
  } catch (e) {
    logEvent(ctx.botId, "tool_error", { name, error: (e as Error).message, isTest: ctx.isTest });
    return { ok: false, output: { error: (e as Error).message }, ms: Date.now() - t0 };
  }
}
