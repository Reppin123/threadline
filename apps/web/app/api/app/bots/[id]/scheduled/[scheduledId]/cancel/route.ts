// Cancel (×) on a scheduled message chip: status → cancelled.
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { get } from "@/lib/db";
import { cancelScheduled, getScheduled, chipView } from "@threadline/core/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string; scheduledId: string }> }) {
  const { id, scheduledId } = await params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!get("SELECT s.id FROM scheduled_messages s JOIN bots b ON b.id=s.bot_id WHERE s.id=? AND s.bot_id=? AND b.user_id=?", [scheduledId, id, user.id]))
    return NextResponse.json({ error: "not found" }, { status: 404 });
  const ok = cancelScheduled(scheduledId);
  const row = getScheduled(scheduledId);
  return NextResponse.json({ ok, item: row ? chipView({ ...row }) : null }, { status: ok ? 200 : 409 });
}
