// MCP tools: connect via Streamable HTTP (SSE fallback), list tools, call tools. config { url, headers, toolName }
import type { ToolImpl } from "./types.ts";

export async function withMcp<T>(url: string, headers: Record<string, string> | undefined, fn: (client: any) => Promise<T>): Promise<T> {
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const client = new Client({ name: "threadline", version: "0.1.0" });
  const reqInit = { headers: headers ?? {} };
  try {
    const { StreamableHTTPClientTransport } = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
    await client.connect(new StreamableHTTPClientTransport(new URL(url), { requestInit: reqInit }));
  } catch {
    const { SSEClientTransport } = await import("@modelcontextprotocol/sdk/client/sse.js");
    await client.connect(new SSEClientTransport(new URL(url), { requestInit: reqInit }));
  }
  try { return await fn(client); } finally { await client.close().catch(() => {}); }
}

export async function listMcpTools(url: string, headers?: Record<string, string>) {
  return withMcp(url, headers, async (c) => (await c.listTools()).tools as { name: string; description?: string; inputSchema: any; annotations?: any }[]);
}

export const mcpImpl: ToolImpl = async (input, ctx, spec) => {
  const { url, headers, toolName, readOnly } = spec.config ?? {};
  if (ctx.dryRun && !readOnly) {
    const tools = await listMcpTools(url, headers);
    return { dryRun: true, available: tools.some((t) => t.name === toolName) };
  }
  return withMcp(url, headers, async (c) => {
    const res = await c.callTool({ name: toolName, arguments: input ?? {} });
    const text = (res.content ?? []).map((b: any) => (b.type === "text" ? b.text : `[${b.type}]`)).join("\n");
    return { isError: !!res.isError, content: text.slice(0, 6000), structured: res.structuredContent };
  });
};
