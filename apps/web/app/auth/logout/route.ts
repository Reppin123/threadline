import { NextResponse, type NextRequest } from "next/server";
import { destroySession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  await destroySession();
  return NextResponse.redirect(new URL("/", process.env.APP_URL || req.url), 303);
}
export const GET = POST;
