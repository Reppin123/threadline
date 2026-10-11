// "Send now" on a scheduled message (test chip). Same path the worker sweep uses (core schedule.sendNow): test rows are
// delivered into the test chat now and their run recorded (recurring rows move to the next occurrence); real-channel rows
// are made due so the gateway sends them on its next tick.
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { get } from "@/lib/db";
import { sendNow, chipView } from "@threadline/core/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string; scheduledId: string }> }) {
  const { id, scheduledId } = await params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!get("SELECT s.id FROM scheduled_messages s JOIN bots b ON b.id=s.bot_id WHERE s.id=? AND s.bot_id=? AND b.user_id=?", [scheduledId, id, user.id]))
    return NextResponse.json({ error: "not found" }, { status: 404 });
  try {
    const r = await sendNow(scheduledId);
    const item = r.row ? chipView({ ...r.row }) : null;
    if (!r.ok) return NextResponse.json({ ok: false, error: r.error, item }, { status: 409 });
    return NextResponse.json({ ok: true, mode: r.mode, text: r.text ?? null, item });
  } catch (e) {
    console.error("[web] scheduled send-now", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
