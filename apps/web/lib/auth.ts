// Sessions, password hashing, magic links. Server-only (node runtime).
import "server-only";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { get, run, id } from "@threadline/db";

export const SESSION_COOKIE = "tl_session";
const SESSION_DAYS = 30;

export function authSecret(): string {
  return process.env.AUTH_SECRET || "threadline-dev-secret-change-me";
}
export function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function sign(value: string): string {
  return value + "." + createHmac("sha256", authSecret()).update(value).digest("base64url");
}
export function unsign(signed: string | undefined): string | null {
  if (!signed) return null;
  const i = signed.lastIndexOf(".");
  if (i < 1) return null;
  const value = signed.slice(0, i);
  const a = Buffer.from(sign(value));
  const b = Buffer.from(signed);
  return a.length === b.length && timingSafeEqual(a, b) ? value : null;
}

export function hashPassword(pw: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}
export function verifyPassword(pw: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [algo, n, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const got = scryptSync(pw, Buffer.from(salt, "base64url"), expected.length, { N: Number(n), r: 8, p: 1 });
  return timingSafeEqual(expected, got);
}

export interface User { id: string; email: string; name: string | null; avatar_url: string | null; plan: string; trial_credit_usd: number; password_hash?: string | null }

export function normalizeEmail(e: string) {
  return e.trim().toLowerCase();
}
export function isEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export function findOrCreateUser(email: string, extra: { name?: string | null; avatar_url?: string | null } = {}): User {
  email = normalizeEmail(email);
  let u = get<User>("SELECT * FROM users WHERE email=?", [email]);
  if (!u) {
    const uid = id("usr_");
    run("INSERT INTO users(id,email,name,avatar_url) VALUES (?,?,?,?)", [uid, email, extra.name ?? null, extra.avatar_url ?? null]);
    u = get<User>("SELECT * FROM users WHERE id=?", [uid])!;
  } else if ((extra.name && !u.name) || (extra.avatar_url && !u.avatar_url)) {
    run("UPDATE users SET name=COALESCE(name,?), avatar_url=COALESCE(avatar_url,?) WHERE id=?", [extra.name ?? null, extra.avatar_url ?? null, u.id]);
  }
  return u;
}

export async function createSession(userId: string) {
  const sid = randomBytes(24).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  run("INSERT INTO sessions(id,user_id,expires_at) VALUES (?,?,?)", [sid, userId, expires.toISOString()]);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sign(sid), { httpOnly: true, sameSite: "lax", secure: appUrl().startsWith("https"), path: "/", expires });
}

export async function destroySession() {
  const jar = await cookies();
  const sid = unsign(jar.get(SESSION_COOKIE)?.value);
  if (sid) run("DELETE FROM sessions WHERE id=?", [sid]);
  jar.delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  const sid = unsign(jar.get(SESSION_COOKIE)?.value);
  if (!sid) return null;
  const u = get<User>(
    "SELECT u.id,u.email,u.name,u.avatar_url,u.plan,u.trial_credit_usd FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.expires_at > ?",
    [sid, new Date().toISOString()],
  );
  return u ?? null;
}

export async function requireUser(next = "/dashboard"): Promise<User> {
  const u = await currentUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  return u;
}

/** Only allow same-site relative redirects. */
export function safeNext(n: unknown, fallback = "/dashboard"): string {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : fallback;
}

export function devLinksAllowed() {
  return process.env.NODE_ENV !== "production" || process.env.THREADLINE_DEV_LINKS === "1";
}
export function emailProviderConfigured() {
  return !!process.env.RESEND_API_KEY;
}
export function googleConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function createMagicLink(email: string, redirectTo: string): { token: string; url: string } {
  const token = randomBytes(24).toString("base64url");
  const expires = new Date(Date.now() + 20 * 60e3).toISOString();
  run("INSERT INTO magic_links(token,email,redirect,expires_at) VALUES (?,?,?,?)", [token, normalizeEmail(email), redirectTo, expires]);
  return { token, url: `${appUrl()}/auth/magic/${token}` };
}

export async function sendMagicLinkEmail(email: string, url: string): Promise<boolean> {
  if (!emailProviderConfigured()) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Threadline <login@threadline.app>",
        to: [email],
        subject: "Your Threadline sign-in link",
        text: `Tap to sign in to Threadline:\n\n${url}\n\nThe link works once and expires in 20 minutes. If you didn't ask for it, ignore this email.`,
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
