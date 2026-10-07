import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { get, json } from "@threadline/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = get<{ status: string; build_progress_json: string | null; name: string }>("SELECT status,build_progress_json,name FROM bots WHERE id=? AND user_id=?", [id, user.id]);
  if (!b) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ status: b.status, name: b.name, progress: json.parse(b.build_progress_json, null) });
}
