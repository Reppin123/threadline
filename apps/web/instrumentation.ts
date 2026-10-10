// Next.js instrumentation hook (owned by agent production): every uncaught server error in a route, page or server action
// goes to core ops.reportError (JSON line on stderr + Sentry when SENTRY_DSN is set).
export async function register() {}

export async function onRequestError(err: unknown, request: { path: string; method: string }, context: { routePath?: string; routeType?: string }) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { ops } = await import("@threadline/core");
  ops.reportError(err, { service: "web", where: context.routePath ?? request.path, method: request.method, routeType: context.routeType });
}
