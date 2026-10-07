import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { get, json } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const j = get<{ status: string; error: string | null; result_json: string | null; payload_json: string }>("SELECT status,error,result_json,payload_json FROM jobs WHERE id=?", [jobId]);
  if (!j) return NextResponse.json({ error: "not found" }, { status: 404 });
  const botId = json.parse<any>(j.payload_json, {}).botId;
  if (!get("SELECT 1 FROM bots WHERE id=? AND user_id=?", [botId, user.id])) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ status: j.status, error: j.error, result: json.parse(j.result_json, null) });
}
