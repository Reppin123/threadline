"use client";
import { useState } from "react";

const ERRORS: Record<string, string> = {
  email: "That doesn't look like an email address.",
  short: "Use at least 8 characters for your password.",
  exists: "There's already an account with that email. Sign in instead, or use an email link.",
  credentials: "That email and password don't match. Try again, or get a sign-in link by email.",
  link: "That sign-in link has expired or was already used. Ask for a new one below.",
  google: "Google sign-in isn't available right now. Use your email instead.",
};

export function AuthCard(props: { mode: "login" | "signup"; next: string; error?: string; email?: string; method?: string; google: boolean }) {
  const [method, setMethod] = useState<"link" | "password">(props.method === "password" ? "password" : "link");
  const { mode, next } = props;
  const err = props.error ? ERRORS[props.error] ?? "Something went wrong. Try again." : null;
  return (
    <div>
      {err && <div className="error-box" role="alert">{err}</div>}
      <a
        className="auth-google"
        href={props.google ? `/auth/google?next=${encodeURIComponent(next)}` : undefined}
        aria-disabled={!props.google}
        id="google-btn"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        Continue with Google
      </a>
      {!props.google && <p className="auth-hint">Google sign-in isn&apos;t set up on this server yet.</p>}
      <div className="auth-or">or</div>

      {method === "link" ? (
        <form className="auth-form" method="post" action="/auth/magic">
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="from" value={mode} />
          <div className="field">
            <label className="label" htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" autoComplete="email" required defaultValue={props.email} placeholder="you@business.com" />
          </div>
          <button className="btn btn-primary" type="submit" id="magic-submit">Email me a sign-in link</button>
          <p className="auth-switch"><button type="button" onClick={() => setMethod("password")}>{mode === "signup" ? "Set a password instead" : "Use a password instead"}</button></p>
        </form>
      ) : (
        <form className="auth-form" method="post" action="/auth/password">
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="mode" value={mode} />
          {mode === "signup" && (
            <div className="field">
              <label className="label" htmlFor="name">Your name <span className="muted">(optional)</span></label>
              <input className="input" id="name" name="name" autoComplete="name" />
            </div>
          )}
          <div className="field">
            <label className="label" htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" autoComplete="email" required defaultValue={props.email} placeholder="you@business.com" />
          </div>
          <div className="field">
            <label className="label" htmlFor="password">Password</label>
            <input className="input" id="password" name="password" type="password" minLength={mode === "signup" ? 8 : undefined} autoComplete={mode === "signup" ? "new-password" : "current-password"} required />
          </div>
          <button className="btn btn-primary" type="submit" id="password-submit">{mode === "signup" ? "Create account" : "Sign in"}</button>
          <p className="auth-switch">
            {mode === "login" && <span className="muted" style={{ fontSize: 13 }}>Forgot it, or never set one? </span>}
            <button type="button" onClick={() => setMethod("link")}>Email me a link instead</button>
          </p>
        </form>
      )}
    </div>
  );
}
