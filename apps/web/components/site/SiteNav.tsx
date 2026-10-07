"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "./Logo";
import { CONTACT_HREF } from "./data";

const LINKS = [
  { href: "/#what", label: "What we do" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#guides", label: "Guides" },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    const onResize = () => window.innerWidth > 860 && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className={`nav${scrolled || open ? " nav-scrolled" : ""}${open ? " nav-open" : ""}`}>
      <div className="nav-inner wrap">
        <Logo />
        <nav className="nav-links" aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          <Link href="/login" className="btn btn-ghost nav-login">
            Log in
          </Link>
          <a href={CONTACT_HREF} className="btn nav-talk">
            Talk to us
          </a>
          <Link href="/signup" className="btn btn-primary">
            Get started
          </Link>
          <button
            ref={btnRef}
            type="button"
            className="nav-burger"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close the menu" : "Open the menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
        </div>
      </div>
      <div id="mobile-menu" className="nav-sheet" hidden={!open}>
        <nav aria-label="Mobile" className="wrap">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={close}>
              {l.label}
            </Link>
          ))}
          <a href={CONTACT_HREF} onClick={close}>
            Talk to us
          </a>
          <Link href="/login" onClick={close}>
            Log in
          </Link>
          <Link href="/signup" className="btn btn-primary btn-lg btn-block" onClick={close}>
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}
