"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import type { WizardAnswer } from "@threadline/core";
import { wizardCreate, wizardNext } from "@/app/(app)/actions";
import { kindFromStart } from "@/lib/wizard";
import { IAttach, ISend } from "./icons";
import { BuilderMark } from "./BuilderMark";

type Q = { question: string; chips: string[]; multi: boolean; placeholder?: string };

export function Wizard({ first, idea, kind }: { first: Q; idea?: string; kind?: string }) {
  const [answers, setAnswers] = useState<WizardAnswer[]>([]);
  const [q, setQ] = useState<Q | null>(first);
  const [picked, setPicked] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState<{ name: string; content: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const [creating, startCreate] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const booted = useRef(false);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [answers, q, thinking]);

  async function submit(answer: string | string[], prefillNext?: string) {
    if (!q) return;
    const next = [...answers, { question: q.question, answer }];
    setAnswers(next); setPicked([]); setText(""); setFile(null); setError(null); setThinking(true);
    const r = await wizardNext(next);
    setThinking(false);
    if (r.error) setError(r.error);
    setQ(r.q);
    if (prefillNext) setText(prefillNext);
    setTimeout(() => taRef.current?.focus(), 50);
  }

  // Arriving from the landing page: answer the starting point for them and keep their idea in the box.
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    if (!kind) return;
    const chip = first.chips.find((c) => kindFromStart(c) === kind);
    if (chip) void submit(chip, idea || undefined);
    else if (idea) setText(idea);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function send() {
    let t = text.trim();
    if (file) t = `${t}${t ? "\n\n" : ""}Attached ${file.name}:\n${file.content}`;
    if (q?.multi) {
      const ans = [...picked, ...(t ? [t] : [])];
      if (ans.length) void submit(ans);
    } else if (t) void submit(t);
    else if (picked.length) void submit(picked[0]!);
  }

  function onChip(c: string) {
    if (!q) return;
    if (q.multi) setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
    else void submit(c);
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    const isText = /^text\/|json|xml|yaml|csv|markdown/.test(f.type) || /\.(txt|md|csv|json|ya?ml|html?)$/i.test(f.name);
    const content = isText ? (await f.text()).slice(0, 6000) : `(${f.type || "file"}, ${Math.round(f.size / 1024)} KB)`;
    setFile({ name: f.name, content });
  }

  const canSend = !!(text.trim() || picked.length || file) && !thinking;
  return (
    <>
      <div className="wz-thread" aria-live="polite">
        <div className="bmsg assistant">
          <BuilderMark />
          <div className="txt">Hey — I&apos;m the Threadline builder. Tell me what you&apos;ve got and I&apos;ll ask a few short questions. {first.question}</div>
        </div>
        {answers.map((a, i) => (
          <div key={i} style={{ display: "contents" }}>
            {i > 0 && <div className="bmsg assistant"><BuilderMark /><div className="txt">{a.question}</div></div>}
            <div className="bmsg user">{Array.isArray(a.answer) ? a.answer.join(", ") : a.answer}</div>
          </div>
        ))}
        {thinking && <div className="bmsg assistant"><BuilderMark /><div className="typing"><i /><i /><i /></div></div>}
        {!thinking && q && answers.length > 0 && <div className="bmsg assistant"><BuilderMark /><div className="txt" id="wizard-question">{q.question}</div></div>}
        {!thinking && q && q.chips.length > 0 && (
          <div className="wz-pick">
            <div className="label" style={{ marginBottom: 8 }}>{answers.length === 0 ? "Pick a starting point" : q.multi ? "Pick all that fit" : "Pick one"}</div>
            <div className="chips" role="group" aria-label="Suggested answers">
              {q.chips.map((c) => (
                <button key={c} type="button" className="chip" aria-pressed={picked.includes(c)} onClick={() => onChip(c)} data-chip={c}>{c}</button>
              ))}
            </div>
            {answers.length === 0 && <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>or describe your bot below · then a few short questions</p>}
          </div>
        )}
        {!thinking && !q && (
          <div className="card wz-ready">
            <h2 style={{ fontSize: 18 }}>Ready to build.</h2>
            <p className="muted" style={{ fontSize: 14 }}>
              I&apos;ll read what you gave me, write the bot&apos;s first draft — what it knows, what it can do, what it keeps — and check it. It takes a minute or two; you can watch.
            </p>
            <div>
              <button
                className="btn btn-blue btn-lg"
                id="build-bot"
                disabled={creating}
                onClick={() => startCreate(async () => { const r = await wizardCreate(answers); if (r?.error) setError(r.error); })}
              >
                {creating ? <><span className="spinner" /> Starting…</> : "Build my bot →"}
              </button>
            </div>
          </div>
        )}
        {error && <div className="error-box" role="alert">{error}</div>}
        <div ref={endRef} />
      </div>
      {q && (
        <form className="composer" style={{ borderTop: 0, padding: 0, background: "transparent" }} onSubmit={(e) => { e.preventDefault(); send(); }}>
          <div className="composer-box">
            <label className="sr-only" htmlFor="wizard-answer">Your answer</label>
            <textarea
              id="wizard-answer"
              ref={taRef}
              rows={2}
              placeholder={q.placeholder || (q.multi && picked.length ? "Anything else? (optional)" : "Your answer")}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            {file && <div className="pill no-dot" style={{ margin: "0 8px 6px", textTransform: "none" }}>{file.name}<button type="button" className="auth-link" onClick={() => setFile(null)} aria-label="Remove file" style={{ border: 0, background: "none" }}>×</button></div>}
            <div className="composer-row">
              <label className="icon-btn" title="Attach a file" style={{ cursor: "pointer" }}>
                <IAttach /><span className="sr-only">Attach a file</span>
                <input type="file" hidden onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
              <span className="composer-hint">Enter to send · Shift+Enter for a new line</span>
              <button className="send-btn" type="submit" disabled={!canSend} aria-label="Send" id="wizard-send"><ISend size={17} /></button>
            </div>
          </div>
        </form>
      )}
      <div className="wz-foot">
        <span>Your answers become the bot&apos;s first draft. You can change anything after.</span>
        <a href="mailto:hello@threadline.app?subject=Paid%20pilot" style={{ textDecoration: "underline" }}>Ask about a paid pilot</a>
      </div>
    </>
  );
}
