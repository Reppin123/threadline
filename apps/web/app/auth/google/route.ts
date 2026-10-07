import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { appUrl, googleConfigured, safeNext, sign } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!googleConfigured()) return NextResponse.redirect(new URL("/login?error=google", req.url), 303);
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  const state = randomBytes(16).toString("base64url");
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${appUrl()}/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${q}`, 303);
  res.cookies.set("tl_oauth", sign(JSON.stringify({ state, next })), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
