"use client";

import { useEffect, useRef, useState } from "react";

const IDEAS = [
  "Let my bakery’s regulars pre-order sourdough by text",
  "Book, move and cancel physio appointments, with a reminder the night before",
  "Answer questions about our return policy and start a return from an order number",
  "Help tenants report a repair with a photo and track when it’s fixed",
  "Take table bookings for Friday nights and hold the waitlist",
  "Quiz my students on this week’s vocab and tell me who’s struggling",
];

const CHIPS = [
  { label: "Café pre-orders", idea: "Let regulars reorder their usual coffee by text and pick it up without queueing" },
  { label: "Clinic bookings", idea: "Let patients book, move and cancel appointments and get a reminder the day before" },
  { label: "Order tracking", idea: "Tell customers where their order is from an order number or their email" },
  { label: "Property viewings", idea: "Answer questions about our listings and book viewings with an agent" },
];

const FALLBACK = "e.g. " + IDEAS[0];

export function HeroComposer() {
  const [value, setValue] = useState("");
  const [stopped, setStopped] = useState(false);
  const [ghost, setGhost] = useState(FALLBACK);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Typewriter ghost text. Purely decorative: the real label is the heading + aria-label.
  useEffect(() => {
    if (stopped) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let idea = 0;
    let chars = 0;
    let phase: "type" | "hold" | "erase" = "type";
    let timer: number;
    const tick = () => {
      const full = IDEAS[idea];
      let wait = 38;
      if (phase === "type") {
        chars++;
        if (chars >= full.length) { phase = "hold"; wait = 2200; }
      } else if (phase === "hold") {
        phase = "erase"; wait = 18;
      } else {
        chars -= 2;
        wait = 14;
        if (chars <= 0) { chars = 0; phase = "type"; idea = (idea + 1) % IDEAS.length; wait = 380; }
      }
      setGhost("e.g. " + full.slice(0, chars));
      timer = window.setTimeout(tick, wait);
    };
    setGhost("e.g. ");
    timer = window.setTimeout(tick, 600);
    return () => window.clearTimeout(timer);
  }, [stopped]);

  // Grow with content.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 240) + "px";
  }, [value]);

  const empty = value.trim().length === 0;

  return (
    <form method="post" action="/start" className="composer" onSubmit={(e) => { if (empty) e.preventDefault(); }}>
      <label htmlFor="hero-idea" className="composer-label">
        What should your bot do?
      </label>
      <div className="composer-box">
        <div className="composer-field">
          <textarea
            ref={ref}
            id="hero-idea"
            name="idea"
            rows={2}
            required
            aria-label="What should your bot do?"
            value={value}
            placeholder={stopped ? FALLBACK : ""}
            onFocus={() => setStopped(true)}
            onChange={(e) => { setStopped(true); setValue(e.target.value); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (!empty) e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          {!stopped && value === "" && (
            <div className="composer-ghost" aria-hidden="true">
              {ghost}
              <span className="composer-caret" />
            </div>
          )}
        </div>
        <div className="composer-bar">
          <span className="composer-hint">
            <kbd className="kbd">Enter</kbd> to send · <kbd className="kbd">Shift</kbd>+<kbd className="kbd">Enter</kbd> new line
          </span>
          <button type="submit" id="hero-submit" className="composer-send" aria-label="Start building" data-empty={empty || undefined}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      <div className="composer-chips" role="group" aria-label="Example ideas">
        {CHIPS.map((c) => (
          <button
            key={c.label}
            type="button"
            className="chip chip-sm"
            aria-pressed={value === c.idea}
            onClick={() => {
              setStopped(true);
              setValue(c.idea);
              ref.current?.focus();
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
    </form>
  );
}
