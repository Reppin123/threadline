import { NextResponse, type NextRequest } from "next/server";
import { authBlocked, createMagicLink, devLinksAllowed, emailProviderConfigured, isEmail, normalizeEmail, safeNext, sendMagicLinkEmail } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const f = await req.formData();
  const email = normalizeEmail(String(f.get("email") || ""));
  const next = safeNext(f.get("next"));
  const from = f.get("from") === "signup" ? "signup" : "login";
  if (!isEmail(email)) {
    return NextResponse.redirect(new URL(`/${from}?error=email&next=${encodeURIComponent(next)}`, process.env.APP_URL || req.url), 303);
  }
  const blocked = authBlocked("magic", req, email);
  if (blocked) return NextResponse.redirect(new URL(`/${from}?error=${blocked}&email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`, process.env.APP_URL || req.url), 303);
  const { token, url } = createMagicLink(email, next);
  const sent = await sendMagicLinkEmail(email, url);
  if (!sent) console.log(`\n[threadline] Magic sign-in link for ${email}:\n  ${url}\n`);
  const q = new URLSearchParams({ email });
  const showDev = !sent && devLinksAllowed() && !emailProviderConfigured();
  if (showDev) q.set("dev", token);
  if (!sent && !showDev) q.set("unsent", "1");
  return NextResponse.redirect(new URL(`/login/check?${q}`, process.env.APP_URL || req.url), 303);
}
