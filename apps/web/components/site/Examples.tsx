"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

type Msg = { from: "me" | "them"; text: string; time?: string };
type Ev = { at: number; fn: string; args: string; res: string };
type Channel = {
  log: Ev[];
  id: "imessage" | "telegram" | "whatsapp";
  label: string;
  caption: string;
  contact: string;
  initials: string;
  status: string;
  msgs: Msg[];
};

const CHANNELS: Channel[] = [
  {
    id: "imessage",
    label: "iMessage",
    caption: "On iMessage, a café regular reorders “the usual”, upsizes it mid-thread and pays with the card on file.",
    contact: "Bean & Barrel",
    initials: "BB",
    status: "",
    log: [
      { at: 1, fn: "memory.get", args: "customer, \"usual\"", res: "oat flat white · extra hot" },
      { at: 3, fn: "menu.price", args: "flat_white, size: L", res: "$5.40" },
      { at: 5, fn: "orders.create", args: "pickup: 08:15, Hayes St", res: "#A-4471" },
      { at: 5, fn: "payments.charge", args: "card •2207, $5.40", res: "paid" },
    ],
    msgs: [
      { from: "me", text: "morning! the usual for 8:15?" },
      { from: "them", text: "Morning Sam ☕ Oat flat white, extra hot, pickup 8:15 at Hayes St — right?" },
      { from: "me", text: "yes. actually make it a large" },
      { from: "them", text: "Large it is. $5.40 on your card ending 2207. Shall I send it through?" },
      { from: "me", text: "👍" },
      { from: "them", text: "Done. It’ll be on the pickup shelf at 8:15 under SAM." },
    ],
  },
  {
    id: "telegram",
    label: "Telegram",
    caption: "On Telegram, a gym member swaps Thursday’s spin class for Friday’s and keeps their usual bike.",
    contact: "Ironworks Gym",
    initials: "IG",
    status: "bot",
    log: [
      { at: 1, fn: "classes.search", args: "day: fri", res: "2 with space" },
      { at: 3, fn: "bookings.swap", args: "thu 07:00 → fri 06:30", res: "ok · bike 14" },
      { at: 3, fn: "fees.check", args: "late_cancel", res: "none (>12h)" },
    ],
    msgs: [
      { from: "me", text: "cant make thu 7am spin 😩 anything fri?", time: "21:04" },
      { from: "them", text: "Friday has Spin at 6:30 (3 bikes left) and HIIT at 12:15 (8 spots). Want me to swap your Thursday booking?", time: "21:04" },
      { from: "me", text: "spin 630", time: "21:05" },
      { from: "them", text: "Swapped ✅ Thursday cancelled, Friday 6:30 Spin booked on bike 14 as usual. No late-cancel fee.", time: "21:05" },
    ],
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    caption: "On WhatsApp, a pharmacy reminds a customer about a refill and moves the pickup to Saturday.",
    contact: "Corner Pharmacy",
    initials: "CP",
    status: "online",
    log: [
      { at: 0, fn: "schedule.fire", args: "refill_due, template", res: "sent" },
      { at: 2, fn: "pickup.slots", args: "sat, Main St", res: "from 10:00" },
      { at: 4, fn: "refills.prepare", args: "rx 30 tabs, sat", res: "queued" },
      { at: 5, fn: "notify.when", args: "on_shelf", res: "armed" },
    ],
    msgs: [
      { from: "them", text: "Hi Priya, your atorvastatin refill is due Monday. Want us to have it ready?", time: "10:12" },
      { from: "me", text: "yes pls! can i collect sat instead", time: "10:20" },
      { from: "them", text: "Saturday works — ready after 10am at the Main St branch. Same prescription, 30 tablets, covered by your plan.", time: "10:20" },
      { from: "me", text: "perfect thank you", time: "10:21" },
      { from: "them", text: "You’re all set. We’ll message you when it’s on the shelf.", time: "10:21" },
    ],
  },
];

function useSequence(msgs: Msg[], active: boolean, inView: boolean) {
  const [shown, setShown] = useState(msgs.length);
  const [typing, setTyping] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (!animate) return;
    if (!active || !inView) {
      setTyping(false);
      return;
    }
    let cancelled = false;
    const timers: number[] = [];
    const wait = (ms: number) => new Promise<void>((r) => timers.push(window.setTimeout(r, ms)));
    (async () => {
      while (!cancelled) {
        setShown(0);
        setTyping(false);
        await wait(500);
        for (let i = 0; i < msgs.length && !cancelled; i++) {
          if (msgs[i].from === "them") {
            setTyping(true);
            await wait(1100 + Math.min(msgs[i].text.length * 8, 700));
            if (cancelled) return;
            setTyping(false);
          } else {
            await wait(i === 0 ? 300 : 1000);
            if (cancelled) return;
          }
          setShown(i + 1);
        }
        await wait(4200);
      }
    })();
    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [animate, active, inView, msgs]);

  return { shown, typing };
}

function Avatar({ c }: { c: Channel }) {
  return <span className={`ph-avatar ph-avatar-${c.id}`} aria-hidden="true">{c.initials}</span>;
}

function Ticks() {
  return (
    <svg className="ticks" width="16" height="10" viewBox="0 0 16 10" aria-hidden="true">
      <path d="M1 5.5 3.8 8.3 9.6 1.7M6.4 8.3 12.2 1.7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Panel({ c, active, inView }: { c: Channel; active: boolean; inView: boolean }) {
  const { shown, typing } = useSequence(c.msgs, active, inView);
  return (
    <div className="ex-grid">
      <div className="ex-side">
        <p className="ex-caption">{c.caption}</p>
        <div className="ex-log">
          <div className="ex-log-head">
            <span>Behind the thread</span>
            <span className="mono">{c.log.filter((e) => shown >= e.at).length}/{c.log.length} calls</span>
          </div>
          <ol>
            {c.log.map((e, i) => (
              <li key={i} className={shown >= e.at ? "is-done" : "is-pending"}>
                <span className="ex-fn">{e.fn}</span>
                <span className="ex-args">({e.args})</span>
                <span className="ex-res">→ {e.res}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <Phone c={c} shown={shown} typing={typing} />
    </div>
  );
}

function Phone({ c, shown, typing }: { c: Channel; shown: number; typing: boolean }) {
  const visible = c.msgs.slice(0, shown);
  const lastMe = visible.map((m) => m.from).lastIndexOf("me");
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown, typing]);

  const status = typing && c.id !== "imessage" ? "typing…" : c.status;

  return (
    <div className={`phone phone-${c.id}`}>
      <div className="ph-head">
        {c.id === "imessage" ? (
          <div className="ph-head-im">
            <span className="ph-back" aria-hidden="true">‹</span>
            <Avatar c={c} />
            <span className="ph-name">{c.contact} <span aria-hidden="true">›</span></span>
            <span className="ph-sub">iMessage</span>
          </div>
        ) : (
          <div className="ph-head-row">
            <span className="ph-back" aria-hidden="true">‹</span>
            <Avatar c={c} />
            <span className="ph-id">
              <span className="ph-name">{c.contact}</span>
              <span className={`ph-status${typing ? " is-typing" : ""}`}>{status}</span>
            </span>
          </div>
        )}
      </div>
      <div className="ph-body" ref={bodyRef}>
        {c.id === "imessage" && <p className="ph-day">Today 8:01 AM</p>}
        {c.id === "whatsapp" && <p className="ph-day ph-day-wa">Today</p>}
        <div className={c.id === "imessage" ? "imsg ph-msgs" : "ph-msgs"} aria-live="off">
          {visible.map((m, i) => {
            const next = visible[i + 1];
            const tail = !next || next.from !== m.from;
            const gap = i > 0 && visible[i - 1].from !== m.from;
            if (c.id === "imessage") {
              return (
                <div key={i} className="ph-in">
                  <div className={`bub ${m.from}${tail ? " tail" : ""}${gap ? " ph-gap" : ""}`}>{m.text}</div>
                  {i === lastMe && <span className="ph-receipt">Delivered</span>}
                </div>
              );
            }
            return (
              <div key={i} className={`ph-in xb xb-${m.from}${tail ? " xb-tail" : ""}${gap ? " ph-gap" : ""}`}>
                <span className="xb-text">{m.text}</span>
                <span className="xb-meta">
                  {m.time}
                  {m.from === "me" && <Ticks />}
                </span>
              </div>
            );
          })}
          {typing && (
            <div className={`typing ph-in ph-typing-${c.id}`} aria-hidden="true">
              <i /><i /><i />
            </div>
          )}
        </div>
      </div>
      <div className="ph-input" aria-hidden="true">
        <span className="ph-plus">+</span>
        <span className="ph-field">{c.id === "imessage" ? "iMessage" : c.id === "telegram" ? "Message" : "Type a message"}</span>
        <span className={`ph-mic ph-mic-${c.id}`} />
      </div>
    </div>
  );
}

export function Examples() {
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || !("IntersectionObserver" in window)) return setInView(true);
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const n = CHANNELS.length;
    let next = -1;
    if (e.key === "ArrowRight") next = (active + 1) % n;
    else if (e.key === "ArrowLeft") next = (active - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    if (next < 0) return;
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="ex" ref={rootRef}>
      <div className="ex-tabs" role="tablist" aria-label="Example conversations by channel" onKeyDown={onKey}>
        {CHANNELS.map((c, i) => (
          <button
            key={c.id}
            ref={(el) => { tabRefs.current[i] = el; }}
            role="tab"
            id={`ex-tab-${c.id}`}
            aria-selected={active === i}
            aria-controls={`ex-panel-${c.id}`}
            tabIndex={active === i ? 0 : -1}
            className={`ex-tab ex-tab-${c.id}`}
            onClick={() => setActive(i)}
          >
            <span className="ex-dot" aria-hidden="true" />
            {c.label}
          </button>
        ))}
      </div>
      {CHANNELS.map((c, i) => (
        <div
          key={c.id}
          role="tabpanel"
          id={`ex-panel-${c.id}`}
          aria-labelledby={`ex-tab-${c.id}`}
          hidden={active !== i}
          className="ex-panel"
          tabIndex={0}
        >
          <Panel c={c} active={active === i} inView={inView} />
        </div>
      ))}
    </div>
  );
}
