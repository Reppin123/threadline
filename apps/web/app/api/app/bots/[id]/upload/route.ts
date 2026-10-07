import { NextResponse } from "next/server";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { REPO_ROOT, get } from "@threadline/db";
import { currentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user || !get("SELECT 1 FROM bots WHERE id=? AND user_id=?", [id, user.id])) return NextResponse.json({ error: "not found" }, { status: 404 });
  const f = (await req.formData()).get("file");
  if (!(f instanceof File)) return NextResponse.json({ error: "no file" }, { status: 400 });
  if (f.size > 15 * 1024 * 1024) return NextResponse.json({ error: "File is over 15 MB" }, { status: 413 });
  const dir = join(REPO_ROOT, "data", "media", id);
  mkdirSync(dir, { recursive: true });
  const safe = f.name.replace(/[^\w.\-]+/g, "_").slice(-80) || "file";
  const path = join(dir, `${randomBytes(6).toString("hex")}-${safe}`);
  writeFileSync(path, Buffer.from(await f.arrayBuffer()));
  return NextResponse.json({ path, mime: f.type || "application/octet-stream", name: f.name });
}
