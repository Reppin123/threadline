// Scheduled messages created from the Build → Test preview, as chips for the test chat (agent "scheduler").
// GET → { items: [chip view + messageId of the schedule_message tool call that created it] }
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { all, get } from "@/lib/db";
import { chipView, type ScheduledRow } from "@threadline/core/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!get("SELECT id FROM bots WHERE id=? AND user_id=?", [id, user.id])) return NextResponse.json({ error: "not found" }, { status: 404 });
  const rows = all<ScheduledRow>(
    `SELECT s.* FROM scheduled_messages s JOIN customers c ON c.id=s.customer_id
      WHERE s.bot_id=? AND s.is_test=1 AND c.channel='web' AND c.handle='owner-preview' ORDER BY s.created_at DESC, s.rowid DESC LIMIT 50`, [id]);
  const items = rows.map((r) => ({
    ...chipView(r),
    messageId: get<{ id: string }>(
      `SELECT m.id FROM messages m JOIN conversations c ON c.id=m.conversation_id
        WHERE c.bot_id=? AND m.tool_name='schedule_message' AND m.tool_output_json LIKE ? LIMIT 1`, [id, `%"id":"${r.id}"%`])?.id ?? null,
  }));
  return NextResponse.json({ items });
}
