// The one seam for slow work. Enqueue a durable job for apps/worker; if no worker claims it within a few seconds
// (worker not running), claim it ourselves and run it in-process, without blocking the request.
import "server-only";
import { enqueueJob, claimJob, completeJob, failJob, get, run, json } from "@threadline/db";
import { core } from "@threadline/core";

const FALLBACK_AFTER_MS = Number(process.env.WEB_JOB_FALLBACK_MS || 4000);

async function execute(type: string, payload: any) {
  if (type === "build_bot") return core.buildBot(payload.botId);
  if (type === "run_checks") return core.runChecks(payload.botId, payload.opts);
  throw new Error(`web cannot run job type ${type}`);
}

function fallback(jobId: string, type: string) {
  setTimeout(async () => {
    const j = get<{ status: string }>("SELECT status FROM jobs WHERE id=?", [jobId]);
    if (!j || j.status !== "queued") return; // a worker picked it up
    const claimed = claimJob(`web-inline-${process.pid}`, [type]);
    if (!claimed) return;
    try {
      const r = await execute(claimed.type, json.parse(claimed.payload_json, {}));
      completeJob(claimed.id, r ?? null);
    } catch (e) {
      console.error(`[web] inline job ${claimed.type} failed`, e);
      failJob(claimed.id, String((e as Error)?.message ?? e));
      if (claimed.type === "build_bot") {
        const p = json.parse<any>(claimed.payload_json, {});
        run("UPDATE bots SET status='error', build_progress_json=? WHERE id=?", [
          json.str({ step: "done", label: "Build failed", pct: 100, error: String((e as Error)?.message ?? e) }),
          p.botId,
        ]);
      }
    }
  }, FALLBACK_AFTER_MS);
}

export function startBuild(botId: string) {
  run("UPDATE bots SET status='building', build_progress_json=? WHERE id=?", [
    json.str({ step: "read_source", label: "Queued — starting the build", pct: 2 }),
    botId,
  ]);
  const jid = enqueueJob("build_bot", { botId }, { dedupeKey: `build:${botId}:${Date.now()}` });
  fallback(jid, "build_bot");
  return jid;
}

export function startChecks(botId: string, simulatedUsers?: number) {
  const jid = enqueueJob("run_checks", { botId, opts: simulatedUsers ? { simulatedUsers } : undefined }, { dedupeKey: `checks:${botId}:${Date.now()}` });
  fallback(jid, "run_checks");
  return jid;
}

export function jobStatus(jobId: string) {
  return get<{ status: string; error: string | null; result_json: string | null }>("SELECT status,error,result_json FROM jobs WHERE id=?", [jobId]);
}
