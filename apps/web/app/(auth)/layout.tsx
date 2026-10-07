import Link from "next/link";
import "./auth.css";
import { Logo } from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="auth-left">
        <header className="auth-top">
          <Link href="/" aria-label="Threadline home"><Logo /></Link>
        </header>
        <main id="main" className="auth-main">{children}</main>
        <footer className="auth-foot muted">
          <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link>
        </footer>
      </div>
      <aside className="auth-art" aria-hidden="true">
        <div className="auth-phone">
          <div className="auth-phone-head"><span className="auth-av">S</span><div><b>Sanitea</b><small>iMessage</small></div></div>
          <div className="imsg auth-thread">
            <div className="bub me tail">what&apos;s good for diwali gifting? budget ~2k</div>
            <div className="bub them">The Festive Chai Box (₹1,450) is our most gifted — 4 masala blends + a brass strainer.</div>
            <div className="bub them tail">Want it gift-wrapped with a note?</div>
            <div className="bub me tail gap">yes pls, to my sister in pune</div>
            <div className="typing"><i /><i /><i /></div>
          </div>
        </div>
        <p className="auth-quote serif">“It answers like someone who works there.”</p>
      </aside>
    </div>
  );
}
