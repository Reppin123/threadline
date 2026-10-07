import "server-only";
import { all, get, json } from "@/lib/db";

export interface VersionRow { id: string; number: number; hash: string; summary: string | null; snapshot_json: string; checks_run_id: string | null; status: string; created_by: string; created_at: string }

export function versionsOf(botId: string): VersionRow[] {
  return all<VersionRow>("SELECT id,number,hash,summary,snapshot_json,checks_run_id,status,created_by,created_at FROM bot_versions WHERE bot_id=? ORDER BY number DESC", [botId]);
}
export function currentVersion(botId: string, currentId: string | null): VersionRow | undefined {
  if (!currentId) return undefined;
  return get<VersionRow>("SELECT id,number,hash,summary,snapshot_json,checks_run_id,status,created_by,created_at FROM bot_versions WHERE id=?", [currentId]);
}
/** Comparable view of a snapshot: prefer its profile, keep tools/tables names. */
export function comparable(snapshotJson: string | null | undefined): unknown {
  const s = json.parse<any>(snapshotJson, {});
  return s && typeof s === "object" ? s : {};
}
export function runSummary(runId: string | null) {
  if (!runId) return null;
  return get<{ id: string; status: string; total: number; passed: number; created_at: string }>("SELECT id,status,total,passed,created_at FROM test_runs WHERE id=?", [runId]) ?? null;
}
