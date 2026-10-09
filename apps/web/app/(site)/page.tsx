import type { Metadata } from "next";
import Link from "next/link";
import { HeroComposer } from "@/components/site/HeroComposer";
import { Examples } from "@/components/site/Examples";
import { TestRun } from "@/components/site/TestRun";
import { JsonLd } from "@/components/site/JsonLd";
import { CONTACT_HREF, GUIDES, faqJsonLd, type Faq } from "@/components/site/data";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: { absolute: "Threadline — Your app, on iMessage" },
  description:
    "Give Threadline your website, API or just an idea. We build an AI agent, test it on simulated customers and put it on iMessage — then Telegram and WhatsApp.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: "Threadline — Your app, on iMessage",
    description: "Blue bubbles for your business. An AI agent built from your site, API or idea, live on iMessage, Telegram and WhatsApp.",
  },
};

const USE_CASES = [
  { label: "Restaurant pre-orders", idea: "Let regulars pre-order and pay for pickup by text" },
  { label: "Clinic bookings", idea: "Book, move and cancel clinic appointments with a reminder the day before" },
  { label: "Order tracking", idea: "Tell customers where their order is from an order number" },
  { label: "Tutoring", idea: "Schedule tutoring sessions and send practice questions between lessons" },
  { label: "Property viewings", idea: "Answer questions about listings and book viewings with an agent" },
  { label: "Salons & barbers", idea: "Let clients book and reschedule haircuts with their usual stylist" },
  { label: "Gym classes", idea: "Let members book, swap and cancel classes and join waitlists" },
  { label: "Repairs & maintenance", idea: "Let tenants report repairs with photos and follow the fix" },
  { label: "Travel & stays", idea: "Answer guest questions and handle late check-out and extra nights" },
  { label: "Event tickets", idea: "Sell event tickets and answer questions about the venue" },
  { label: "Personal assistant", idea: "A personal assistant that tracks my errands and reminds me by text" },
];

const FAQS: Faq[] = [
  {
    q: "What is an iMessage AI agent?",
    a: "It’s an assistant your customers text like a friend, in the Messages app they already use. Threadline connects it to your website, API or MCP server, so beyond answering questions it can check an order, book a slot or take a payment — in blue bubbles, with nothing to download.",
  },
  {
    q: "Do I need an app already?",
    a: "No. A website is plenty, and an OpenAPI spec or MCP server is even better. If all you have is an idea, we generate mock data and tools so you can text a working version the same day, then connect your real systems when they exist.",
  },
  {
    q: "Do I need engineers to set it up?",
    a: "Not to get started. Threadline handles the agent, the testing and the messaging line. Connecting real accounts, orders or payments needs API credentials from whoever runs your backend — usually an afternoon’s work, and we tell you exactly what to ask for.",
  },
  {
    q: "How do actions and payments work?",
    a: "The agent only acts through tools you’ve connected, with your own credentials, and it asks the customer to confirm before anything that changes data or moves money. Every call is logged with its result, so you can see what happened and why.",
  },
  {
    q: "How does the shared iMessage line work?",
    a: "On the Free plan every bot shares one Threadline iMessage number. Your bot gets a short code, and customers text “start <code>” — or scan a QR code or tap a link that fills it in. From then on their messages go to your bot until they text “stop” or start another code. Paid plans can move to a dedicated line.",
  },
  {
    q: "Does it remember customers?",
    a: "Yes. On each channel it keeps the customer’s conversation and the details that matter — their usual order, the times that suit them — so nobody has to repeat themselves. You can view or delete everything stored about a customer whenever you like.",
  },
  {
    q: "Who owns the data?",
    a: "You do. Conversations, contacts and anything your bot saves belong to your business and can be exported at any time. We don’t sell it, and we don’t use your customers’ chats to train public models.",
  },
  {
    q: "What does it cost?",
    a: "You can start free, no card required. After that you pay for what you use — replies, test runs and tool calls — or move to Pro at $29 a month for WhatsApp, more included usage and email support.",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    per: "to start",
    blurb: "Get a working bot in front of real people and find out if they use it.",
    features: ["Telegram + the shared iMessage line", "Mock-data prototype to start", "Community support"],
    cta: { label: "Get started", href: "/signup" },
  },
  {
    name: "Pro",
    price: "$29",
    per: "/mo",
    blurb: "For the apps your customers actually live in, with room to grow.",
    features: ["iMessage, Telegram and WhatsApp", "More usage included every month", "Usage-based overage, billed as you go", "Email support"],
    cta: { label: "Get started", href: "/signup" },
    featured: true,
  },
  {
    name: "Custom",
    price: "Let’s talk",
    per: "",
    blurb: "Higher volume, stricter requirements, or a number that’s all yours.",
    features: ["Dedicated iMessage line", "Custom limits and SLAs", "Security and data review", "Priority support"],
    cta: { label: "Talk to us", href: CONTACT_HREF },
  },
];

const EVERY_PLAN = [
  { t: "Your name on the thread", d: "Your brand, voice and greeting — not ours.", icon: "M4 6h16v10H8l-4 4V6Z" },
  { t: "Every action logged", d: "Each tool call, its input and its result.", icon: "M5 5h14M5 12h14M5 19h9" },
  { t: "Mock data first", d: "Try it end to end before it touches anything real.", icon: "M12 3 4 7v10l8 4 8-4V7l-8-4Zm0 0v18M4 7l8 4 8-4" },
  { t: "Export everything", d: "Chats, contacts and data. No lock-in.", icon: "M12 4v11m0 0-4-4m4 4 4-4M5 20h14" },
];

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="check-ico">
      <path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" className="arrow-ico">
      <path d="M3 8h10m-4-4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Threadline",
          url: APP_URL,
          logo: `${APP_URL}/icon.svg`,
          description: "AI agents for iMessage, Telegram and WhatsApp, built from your website, API or idea.",
        }}
      />
      <JsonLd data={faqJsonLd(FAQS)} />

      {/* 1. Hero */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-float" aria-hidden="true">
          <span className="fb fb-1 bub me tail">table for 4 at 8?</span>
          <span className="fb fb-2 bub them tail">Booked ✓ See you at 8</span>
          <span className="fb fb-3 bub me tail">where’s my order 📦</span>
          <span className="fb fb-4 bub them tail">Out for delivery, arriving 2:40</span>
        </div>
        <div className="wrap hero-inner">
          <p className="hero-badge">
            Blue bubbles for your business
          </p>
          <h1 id="hero-title" className="hero-title">
            Your app, on <span className="serif hero-accent">iMessage</span>.
          </h1>
          <p className="hero-sub">
            Hand us a website, an API or a half-formed idea. We build an AI agent that answers and actually does things,
            test it on simulated customers, and put it where people already text — iMessage first, then Telegram and
            WhatsApp.
          </p>
          <HeroComposer />
          <p className="hero-trust">
            <Check /> No card needed to build and test.
          </p>
        </div>
      </section>

      {/* 3. Three ways in */}
      <section id="what" className="sec" aria-labelledby="what-title">
        <div className="wrap">
          <div className="sec-head" data-reveal>
            <p className="eyebrow">Three ways in</p>
            <h2 id="what-title" className="sec-title">
              Start from whatever you’ve <span className="serif">got</span>.
            </h2>
            <p className="sec-sub">
              A live site, a folder of endpoints, or a sentence written on the back of a receipt. Pick one and the builder
              picks it up from there.
            </p>
          </div>
          <div className="ways">
            <article className="card way" data-reveal>
              <div className="way-art" aria-hidden="true">
                <div className="mini-browser">
                  <div className="mb-bar">
                    <i /><i /><i />
                    <span className="mb-url">
                      <svg width="9" height="9" viewBox="0 0 10 10"><rect x="2" y="4.5" width="6" height="4.5" rx="1" fill="currentColor" /><path d="M3.5 4.5V3a1.5 1.5 0 0 1 3 0v1.5" fill="none" stroke="currentColor" /></svg>
                      bakeryonhayes.com
                    </span>
                  </div>
                  <div className="mb-page">
                    <span className="mb-h" />
                    <span className="mb-l" />
                    <span className="mb-l mb-short" />
                    <div className="mb-tiles"><span /><span /><span /></div>
                  </div>
                  <span className="mb-scan" />
                </div>
              </div>
              <h3>I have an app</h3>
              <p>
                Web or mobile. Paste the URL and we read the public pages — menus, prices, policies, hours — so the agent
                knows your business cold.
              </p>
              <Link href="/start?kind=website" className="way-link">
                Start here <Arrow />
              </Link>
            </article>
            <article className="card way" data-reveal>
              <div className="way-art" aria-hidden="true">
                <div className="mini-tools">
                  <div className="mt-head">
                    <span>mcp · bakery-api</span>
                    <span className="mt-count">4 tools</span>
                  </div>
                  <ul>
                    <li><span className="mt-fn">search_menu</span><span className="mt-tag">read</span></li>
                    <li><span className="mt-fn">create_order</span><span className="mt-tag mt-w">write</span></li>
                    <li><span className="mt-verb">GET</span><span className="mt-path">/v1/orders/{"{id}"}</span></li>
                    <li><span className="mt-verb mt-post">POST</span><span className="mt-path">/v1/pickups</span></li>
                  </ul>
                </div>
              </div>
              <h3>I have an MCP server or API</h3>
              <p>
                Point us at an OpenAPI spec or MCP server. Each operation becomes a tool the agent can call — and you decide
                which ones are allowed to change things.
              </p>
              <Link href="/start?kind=api" className="way-link">
                Start here <Arrow />
              </Link>
            </article>
            <article className="card way" data-reveal>
              <div className="way-art" aria-hidden="true">
                <div className="mini-table">
                  <div className="mtb-head">
                    <span>mock data</span>
                    <span className="mtb-tag">customers</span>
                  </div>
                  <table>
                    <thead>
                      <tr><th>name</th><th>usual</th><th>visits</th></tr>
                    </thead>
                    <tbody>
                      <tr><td>Sam R.</td><td>oat flat white</td><td>42</td></tr>
                      <tr><td>Lena K.</td><td>sourdough</td><td>17</td></tr>
                      <tr><td>Omar B.</td><td>2× croissant</td><td>9</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <h3>Just an idea</h3>
              <p>
                We generate believable sample data and tools so you can text a working version today, then swap in the real
                systems once they exist.
              </p>
              <Link href="/start?kind=idea" className="way-link">
                Start here <Arrow />
              </Link>
            </article>
          </div>
          <p className="ways-note">
            Logged-in actions and payments need your own API credentials. We’ll name exactly which ones before anything goes
            live.
          </p>
        </div>
      </section>

      {/* 4. Examples */}
      <section className="sec sec-tint" aria-labelledby="ex-title">
        <div className="wrap">
          <div className="sec-head sec-head-center" data-reveal>
            <p className="eyebrow">Examples</p>
            <h2 id="ex-title" className="sec-title">
              One agent. Whichever app they <span className="serif">text</span> from.
            </h2>
            <p className="sec-sub">
              iMessage first, because that’s where your customers’ friends already are. Telegram and WhatsApp run the same
              brain, with each app’s own look and rules.
            </p>
          </div>
          <Examples />
        </div>
      </section>

      {/* 5. System */}
      <section className="sec" aria-labelledby="sys-title">
        <div className="wrap">
          <div className="sec-head sec-head-row" data-reveal>
            <div>
              <p className="eyebrow">Under the hood</p>
              <h2 id="sys-title" className="sec-title">
                The system behind <span className="serif">every</span> reply.
              </h2>
            </div>
            <Link href="/signup" className="btn btn-primary">
              Get started
            </Link>
          </div>
          <div className="pillars">
            <article className="card pillar" data-reveal>
              <div className="mock mock-chat" role="img" aria-label="Example: a customer orders two croissants and a sourdough for Saturday, changes it to Sunday, and replies in Spanish; the agent confirms Sunday from 8am.">
                <div className="imsg" aria-hidden="true">
                  <div className="bub me">can u do 2 croissants + the sourdough sat</div>
                  <div className="bub me tail">wait no, sun</div>
                  <div className="bub them tail ph-gap">Sunday works — 2 butter croissants and a country sourdough, ready from 8am. Same name as last time?</div>
                  <div className="bub me tail ph-gap">sí, gracias 🙏</div>
                </div>
              </div>
              <div className="pillar-copy">
                <span className="pillar-num mono">01</span>
                <h3>An orchestrator that reads people</h3>
                <p>Shorthand, second thoughts and two languages in one message. It works out what they meant, checks your systems, then does it.</p>
              </div>
            </article>
            <article className="card pillar" data-reveal>
              <div className="mock mock-memory">
                <div className="mock-head">
                  <span className="mock-title">Remembered · Sam R.</span>
                  <span className="pill pill-blue no-dot">iMessage</span>
                </div>
                <ul className="mem">
                  <li><span className="mem-k">Usual</span>Large oat flat white, extra hot</li>
                  <li><span className="mem-k">Pickup</span>Hayes St, before 8:30</li>
                  <li><span className="mem-k">Payment</span>Card ending 2207 on file</li>
                  <li><span className="mem-k">Note</span>Asked about a loyalty card twice</li>
                </ul>
              </div>
              <div className="pillar-copy">
                <span className="pillar-num mono">02</span>
                <h3>Memory, per customer, per channel</h3>
                <p>Each customer’s history carries over between conversations on the channel they use. Delete any of it, any time.</p>
              </div>
            </article>
            <article className="card pillar" data-reveal>
              <TestRun />
              <div className="pillar-copy">
                <span className="pillar-num mono">03</span>
                <h3>Tested on simulated customers, every release</h3>
                <p>Hundreds of synthetic customers — impatient, vague, multilingual — try to break each version before a real one types a word.</p>
              </div>
            </article>
            <article className="card pillar" data-reveal>
              <div className="mock mock-insights">
                <div className="mock-head">
                  <span className="mock-title">Top intents · last 30 days</span>
                </div>
                <ul className="bars">
                  {[
                    ["Reorder the usual", 3284],
                    ["Change pickup time", 1960],
                    ["Opening hours", 1215],
                    ["Talk to a person", 402],
                  ].map(([label, n]) => (
                    <li key={label}>
                      <span className="bar-label">{label}</span>
                      <span className="bar-n mono">{(n as number).toLocaleString("en-US")}</span>
                      <span className="bar-track" aria-hidden="true">
                        <span style={{ width: `${((n as number) / 3284) * 100}%` }} />
                      </span>
                    </li>
                  ))}
                </ul>
                <blockquote className="giveup">
                  <span className="giveup-k">Where people give up</span>
                  “do you do oat in the large ones too or” <span className="giveup-n">· 41 drop-offs</span>
                </blockquote>
              </div>
              <div className="pillar-copy">
                <span className="pillar-num mono">04</span>
                <h3>Insights on what’s really happening</h3>
                <p>What people ask for, what they buy, and the exact message where they gave up.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* 6. Use cases */}
      <section className="sec sec-tight" aria-labelledby="uses-title">
        <div className="wrap uses" data-reveal>
          <p className="eyebrow">Use cases</p>
          <h2 id="uses-title" className="sec-title">
            Apps people are rebuilding as a <span className="serif">text thread</span>.
          </h2>
          <p className="sec-sub">Anything you’d have shipped to an app store. No download, no sign-up screen, no onboarding.</p>
          <ul className="uses-list">
            {USE_CASES.map((u) => (
              <li key={u.label}>
                <Link className="chip" href={`/start?idea=${encodeURIComponent(u.idea)}`}>
                  {u.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 7. Pricing */}
      <section id="pricing" className="sec sec-tint" aria-labelledby="pricing-title">
        <div className="wrap">
          <div className="sec-head sec-head-center" data-reveal>
            <p className="eyebrow">Pricing</p>
            <h2 id="pricing-title" className="sec-title">
              Pay for the conversations you <span className="serif">actually</span> have.
            </h2>
            <p className="sec-sub">
              Threadline runs on metered credit: every reply, simulated test and tool call draws a little from your balance.
            </p>
          </div>
          <div className="plans">
            {PLANS.map((p) => (
              <article key={p.name} className={`card plan${p.featured ? " plan-featured" : ""}`} data-reveal>
                <div className="plan-top">
                  <h3>{p.name}</h3>
                  {p.featured && <span className="plan-badge">Recommended</span>}
                </div>
                <p className="plan-price">
                  <span className={p.per ? "plan-amt" : "plan-amt serif plan-talk"}>{p.price}</span>
                  {p.per && <span className="plan-per">{p.per}</span>}
                </p>
                <p className="plan-blurb">{p.blurb}</p>
                <ul className="plan-feats">
                  {p.features.map((f) => (
                    <li key={f}><Check />{f}</li>
                  ))}
                </ul>
                {p.cta.href.startsWith("mailto:") ? (
                  <a href={p.cta.href} className="btn btn-lg btn-block">{p.cta.label}</a>
                ) : (
                  <Link href={p.cta.href} className={`btn btn-lg btn-block ${p.featured ? "btn-blue" : "btn-primary"}`}>
                    {p.cta.label}
                  </Link>
                )}
              </article>
            ))}
          </div>
          <div className="every" data-reveal>
            <h3 className="every-title">In every plan</h3>
            <ul>
              {EVERY_PLAN.map((e) => (
                <li key={e.t}>
                  <span className="every-ico" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24"><path d={e.icon} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                  <span>
                    <strong>{e.t}</strong>
                    <span className="every-d">{e.d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 8. Team */}
      <section className="sec" aria-labelledby="team-title">
        <div className="wrap team" data-reveal>
          <div>
            <p className="eyebrow">Who’s behind it</p>
            <h2 id="team-title" className="sec-title">
              A small studio that answers its own <span className="serif">messages</span>.
            </h2>
            <p className="sec-sub">
              We think the best app for most businesses is a conversation. Threadline is built by a tiny team, and when you
              write in, the person who replies is the person who wrote the code.
            </p>
          </div>
          <ul className="people">
            <li className="card person">
              <span className="avatar" aria-hidden="true">AB</span>
              <span>
                <strong>Aki Bansal</strong>
                <span className="muted">Founder</span>
              </span>
            </li>
            <li className="card person person-open">
              <span className="avatar avatar-open" aria-hidden="true">?</span>
              <span>
                <strong>You?</strong>
                <a href={CONTACT_HREF} className="person-link">We’re hiring →</a>
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* 9. FAQ */}
      <section id="faq" className="sec sec-tint" aria-labelledby="faq-title">
        <div className="wrap faq-wrap">
          <div className="sec-head" data-reveal>
            <p className="eyebrow">FAQ</p>
            <h2 id="faq-title" className="sec-title">
              Questions, <span className="serif">answered</span>.
            </h2>
            <p className="sec-sub">
              Something else? <a href={CONTACT_HREF} className="link">Write to us</a> — a human replies.
            </p>
          </div>
          <div className="faq">
            {FAQS.map((f) => (
              <details key={f.q}>
                <summary>{f.q}<span className="faq-plus" aria-hidden="true" /></summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 10. Guides */}
      <section id="guides" className="sec" aria-labelledby="guides-title">
        <div className="wrap">
          <div className="sec-head" data-reveal>
            <p className="eyebrow">The field guide</p>
            <h2 id="guides-title" className="sec-title">
              Build for the way people <span className="serif">already</span> talk.
            </h2>
            <p className="sec-sub">Plain-spoken guides to messaging APIs and AI agents on iMessage, WhatsApp and Telegram.</p>
          </div>
          <div className="guides">
            {GUIDES.map((g) => (
              <Link key={g.href} href={g.href} className={`card guide-card guide-${g.channel.toLowerCase()}`} data-reveal>
                <span className="guide-ch">{g.channel}</span>
                <h3>{g.title}</h3>
                <p>{g.blurb}</p>
                <span className="way-link">Read the guide <Arrow /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 11. CTA */}
      <section className="sec sec-cta" aria-labelledby="cta-title">
        <div className="wrap">
          <div className="cta" data-reveal>
            <div className="cta-bubbles" aria-hidden="true">
              <span className="bub me tail">start bean-7k2</span>
              <span className="bub them tail">Hi! I’m Bean &amp; Barrel’s assistant. What can I get you?</span>
            </div>
            <h2 id="cta-title">
              Put your business in the <span className="serif">blue bubbles</span>.
            </h2>
            <p>Describe it in a sentence. Text it in minutes. No card needed.</p>
            <div className="cta-actions">
              <Link href="/signup" className="btn btn-blue btn-lg">Get started</Link>
              <a href={CONTACT_HREF} className="btn btn-lg cta-ghost">Talk to us</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
