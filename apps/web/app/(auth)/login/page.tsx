import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { currentUser, googleConfigured, safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await currentUser()) redirect(next);
  return (
    <>
      <h1>Welcome <em>back</em>.</h1>
      <p className="auth-sub">Build, test and run your bots.</p>
      <AuthCard mode="login" next={next} error={sp.error} email={sp.email} method={sp.method} google={googleConfigured()} />
      <p className="auth-alt">New here? <Link href={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link></p>
    </>
  );
}
