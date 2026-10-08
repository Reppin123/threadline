import { NextResponse, type NextRequest } from "next/server";
import { get, run } from "@/lib/db";
import { createSession, findOrCreateUser, hashPassword, isEmail, normalizeEmail, safeNext, verifyPassword } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const f = await req.formData();
  const mode = f.get("mode") === "signup" ? "signup" : "login";
  const email = normalizeEmail(String(f.get("email") || ""));
  const password = String(f.get("password") || "");
  const name = String(f.get("name") || "").trim() || null;
  const next = safeNext(f.get("next"));
  const back = (error: string) =>
    NextResponse.redirect(new URL(`/${mode}?error=${error}&method=password&email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`, process.env.APP_URL || req.url), 303);

  if (!isEmail(email)) return back("email");
  if (mode === "signup") {
    if (password.length < 8) return back("short");
    const existing = get<{ id: string; password_hash: string | null }>("SELECT id,password_hash FROM users WHERE email=?", [email]);
    if (existing?.password_hash) return back("exists");
    const u = findOrCreateUser(email, { name });
    run("UPDATE users SET password_hash=?, name=COALESCE(name,?) WHERE id=?", [hashPassword(password), name, u.id]);
    await createSession(u.id);
  } else {
    const u = get<{ id: string; password_hash: string | null }>("SELECT id,password_hash FROM users WHERE email=?", [email]);
    if (!u || !verifyPassword(password, u.password_hash)) return back("credentials");
    await createSession(u.id);
  }
  return NextResponse.redirect(new URL(next, process.env.APP_URL || req.url), 303);
}
