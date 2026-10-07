// Gate the logged-in app. Verifies the signed session cookie's HMAC (Web Crypto); the DB lookup happens in the app layout.
import { NextResponse, type NextRequest } from "next/server";

const SECRET = process.env.AUTH_SECRET || "threadline-dev-secret-change-me";

async function validSignature(v: string | undefined) {
  if (!v) return false;
  const i = v.lastIndexOf(".");
  if (i < 1) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(v.slice(0, i))));
  const b64 = btoa(String.fromCharCode(...sig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return b64 === v.slice(i + 1);
}

export async function middleware(req: NextRequest) {
  if (await validSignature(req.cookies.get("tl_session")?.value)) return NextResponse.next();
  const next = req.nextUrl.pathname + req.nextUrl.search;
  return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, req.url), 303);
}

export const config = { matcher: ["/dashboard/:path*", "/bots/:path*"] };
