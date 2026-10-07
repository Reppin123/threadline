import Link from "next/link";
import { LogoMark } from "./Logo";
import { CONTACT_HREF, GUIDES } from "./data";

export function SiteFooter() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-top">
          <div className="foot-brand">
            <Link href="/" className="logo" aria-label="Threadline — home">
              <LogoMark />
              <span className="logo-word">Threadline</span>
            </Link>
            <p>
              Your app, on <span className="serif">iMessage</span>. Then Telegram and WhatsApp, from the same agent.
            </p>
          </div>
          <nav className="foot-cols" aria-label="Footer">
            <div>
              <h2>Guides</h2>
              <ul>
                {GUIDES.map((g) => (
                  <li key={g.href}>
                    <Link href={g.href}>{g.nav}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2>Start</h2>
              <ul>
                <li><Link href="/signup">Get started</Link></li>
                <li><Link href="/#pricing">Pricing</Link></li>
                <li><Link href="/#faq">FAQ</Link></li>
                <li><a href={CONTACT_HREF}>Talk to a human</a></li>
              </ul>
            </div>
            <div>
              <h2>Company</h2>
              <ul>
                <li><Link href="/privacy">Privacy</Link></li>
                <li><Link href="/terms">Terms</Link></li>
                <li><a href={CONTACT_HREF}>Contact</a></li>
              </ul>
            </div>
          </nav>
        </div>
        <p className="foot-legal">
          © 2026 Threadline. Not affiliated with Apple, Meta or Telegram. Trademarks belong to their owners.
        </p>
      </div>
    </footer>
  );
}
