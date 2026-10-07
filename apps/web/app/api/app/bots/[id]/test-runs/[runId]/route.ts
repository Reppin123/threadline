import { NextResponse } from "next/server";
import { core } from "@threadline/core";
import { currentUser } from "@/lib/auth";
import { get } from "@threadline/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; runId: string }> }) {
  const { id, runId } = await params;
  const user = await currentUser();
  if (!user || !get("SELECT 1 FROM bots WHERE id=? AND user_id=?", [id, user.id])) return NextResponse.json({ error: "not found" }, { status: 404 });
  try {
    return NextResponse.json(await core.getTestRun(runId));
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).message) }, { status: 500 });
  }
}
