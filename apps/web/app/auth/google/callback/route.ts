import { NextResponse, type NextRequest } from "next/server";
import { appUrl, createSession, findOrCreateUser, googleConfigured, safeNext, unsign } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const fail = () => NextResponse.redirect(new URL("/login?error=google", process.env.APP_URL || req.url), 303);
  if (!googleConfigured()) return fail();
  const raw = unsign(req.cookies.get("tl_oauth")?.value);
  const saved = raw ? (JSON.parse(raw) as { state: string; next: string }) : null;
  const code = req.nextUrl.searchParams.get("code");
  if (!saved || !code || saved.state !== req.nextUrl.searchParams.get("state")) return fail();
  try {
    const tok = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${appUrl()}/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    }).then((r) => r.json());
    if (!tok.access_token) return fail();
    const info = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tok.access_token}` } }).then((r) => r.json());
    if (!info.email || info.email_verified === false) return fail();
    const u = findOrCreateUser(info.email, { name: info.name, avatar_url: info.picture });
    await createSession(u.id);
    const res = NextResponse.redirect(new URL(safeNext(saved.next), process.env.APP_URL || req.url), 303);
    res.cookies.delete("tl_oauth");
    return res;
  } catch {
    return fail();
  }
}
