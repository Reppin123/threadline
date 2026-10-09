import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { currentUser, googleConfigured, safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Create your account", robots: { index: false } };

export default async function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await currentUser()) redirect(next);
  const fromIdea = next.startsWith("/bots/new") && next.includes("idea=");
  return (
    <>
      <h1>Start your <em>first bot</em>.</h1>
      <p className="auth-sub">
        {fromIdea ? "We kept your idea. Create an account and we'll pick up right where you left off." : "Free to start. Build, test and text your bot. No card."}
      </p>
      <AuthCard mode="signup" next={next} error={sp.error} email={sp.email} method={sp.method} google={googleConfigured()} />
      <p className="auth-alt">Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link></p>
    </>
  );
}
