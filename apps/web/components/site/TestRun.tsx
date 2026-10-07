"use client";

import { useEffect, useRef, useState } from "react";

const TOTAL = 1440;
const PASSING = 1412;

const CASES = [
  { name: "Changes the pickup time twice", ok: true },
  { name: "Asks for a refund after it’s been collected", ok: true },
  { name: "Mixes Spanish and English, mostly abbreviations", ok: true },
  { name: "Pays, then wants it delivered instead", ok: false },
];

export function TestRun() {
  const [n, setN] = useState(PASSING);
  const [run, setRun] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        setRun(true);
        const start = performance.now();
        const dur = 1800;
        const step = (t: number) => {
          const p = Math.min(1, (t - start) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          setN(Math.round(PASSING * eased));
          if (p < 1) raf = requestAnimationFrame(step);
        };
        setN(0);
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="mock mock-tests" ref={ref}>
      <div className="mock-head">
        <span className="mock-title">Release 18 · simulated customers</span>
        <span className="pill pill-live">Running</span>
      </div>
      <ul className="tests">
        {CASES.map((c) => (
          <li key={c.name} className={c.ok ? "t-ok" : "t-fix"}>
            <span className="t-ico" aria-hidden="true">{c.ok ? "✓" : "!"}</span>
            <span>{c.name}</span>
            <span className="t-state">{c.ok ? "pass" : "fixing"}</span>
          </li>
        ))}
      </ul>
      <div className="tests-bar" aria-hidden="true">
        <span style={{ width: `${(n / TOTAL) * 100}%` }} className={run ? "is-run" : undefined} />
      </div>
      <p className="tests-count">
        <span aria-hidden="true">
          <span className="mono">
            {n.toLocaleString("en-US")} / {TOTAL.toLocaleString("en-US")}
          </span>{" "}
          passing
        </span>
        <span className="sr-only">1,412 of 1,440 simulated conversations passing</span>
      </p>
    </div>
  );
}
