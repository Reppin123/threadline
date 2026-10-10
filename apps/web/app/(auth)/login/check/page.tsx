import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Check your email", robots: { index: false } };

export default async function CheckPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return (
    <>
      <div className="auth-check-icon" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></svg>
      </div>
      <h1>Check your <em>inbox</em>.</h1>
      <p className="auth-sub">
        We sent a sign-in link to <b style={{ color: "var(--ink)" }}>{sp.email || "your email"}</b>. It works once and expires in 20 minutes.
      </p>
      {sp.unsent && <div className="note-box">We couldn&apos;t send the email just now. Try again in a few minutes, or <Link href="/login?method=password">sign in with a password</Link> instead.</div>}
      {sp.dev && (
        <div className="auth-dev">
          <p><b>Dev mode:</b> no email provider is configured, so here&apos;s the link (also printed in the server log).</p>
          <a className="btn btn-blue btn-block" id="dev-magic-link" href={`/auth/magic/${encodeURIComponent(sp.dev)}`}>Dev: open sign-in link</a>
        </div>
      )}
      <p className="auth-alt">Wrong address? <Link href="/login">Try again</Link></p>
    </>
  );
}
