import { NextResponse, type NextRequest } from "next/server";
import { get, run } from "@/lib/db";
import { createSession, findOrCreateUser, safeNext } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = get<{ email: string; redirect: string | null; expires_at: string; used_at: string | null }>("SELECT * FROM magic_links WHERE token=?", [token]);
  if (!link || link.used_at || link.expires_at < new Date().toISOString()) {
    return NextResponse.redirect(new URL("/login?error=link", req.url), 303);
  }
  run("UPDATE magic_links SET used_at=? WHERE token=?", [new Date().toISOString(), token]);
  const u = findOrCreateUser(link.email);
  await createSession(u.id);
  return NextResponse.redirect(new URL(safeNext(link.redirect), req.url), 303);
}
