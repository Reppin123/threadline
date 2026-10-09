"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Fades [data-reveal] blocks up as they scroll in (staggered per row) and drives a light hero parallax. */
export function ScrollFx() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    root.classList.add("reveal-on");

    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    els.forEach((el) => {
      const sibs = el.parentElement ? Array.from(el.parentElement.children).filter((n) => n.hasAttribute("data-reveal")) : [el];
      el.style.setProperty("--rd", `${Math.min(sibs.indexOf(el), 5) * 90}ms`);
    });

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );
    els.forEach((el) => io.observe(el));

    const scrubs = Array.from(document.querySelectorAll<HTMLElement>("[data-scrub]")).map((el) => ({
      el,
      words: Array.from(el.querySelectorAll<HTMLElement>(".sw")),
    }));

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const vh = window.innerHeight;
        root.style.setProperty("--hp", String(Math.min(window.scrollY / vh, 1).toFixed(4)));
        for (const s of scrubs) {
          const r = s.el.getBoundingClientRect();
          const p = Math.max(0, Math.min(1, (vh * 0.82 - r.top) / (r.height + vh * 0.3)));
          const lit = Math.round(p * s.words.length);
          s.words.forEach((w, i) => w.classList.toggle("lit", i < lit));
        }
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [pathname]);

  return null;
}
