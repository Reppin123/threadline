// Entry from the landing page: hero textarea (POST), "Three ways in" and use-case chips (GET).
// Stores the idea (cookie + query) and sends the visitor to the wizard, via sign-up if needed.
import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";

export const runtime = "nodejs";

async function handle(req: NextRequest, idea: string, kind: string) {
  const q = new URLSearchParams();
  if (idea) q.set("idea", idea.slice(0, 2000));
  if (["website", "api", "mcp", "idea"].includes(kind)) q.set("kind", kind);
  const target = `/bots/new${q.size ? `?${q}` : ""}`;
  const user = await currentUser();
  const res = NextResponse.redirect(new URL(user ? target : `/signup?next=${encodeURIComponent(target)}`, req.url), 303);
  if (idea) res.cookies.set("tl_idea", idea.slice(0, 2000), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 3600 });
  return res;
}

export async function POST(req: NextRequest) {
  const f = await req.formData();
  return handle(req, String(f.get("idea") || "").trim(), String(f.get("kind") || ""));
}
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  return handle(req, (p.get("idea") || "").trim(), p.get("kind") || "");
}
