import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/site/JsonLd";
import { LogoMark } from "@/components/site/Logo";
import { GUIDES, PUBLISHED, PUBLISHED_ISO, faqJsonLd, type Faq } from "@/components/site/data";

export function docMetadata({ path, title, description }: { path: string; title: string; description: string }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "article", url: path, title: `${title} · Threadline`, description, siteName: "Threadline" },
  };
}

export type Section = { id: string; title: string; body: React.ReactNode };

function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" className="arrow-ico">
      <path d="M3 8h10m-4-4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DocPage({
  path,
  eyebrow,
  title,
  lede,
  sections,
  faqs,
  kind = "guide",
}: {
  path: string;
  eyebrow: string;
  title: React.ReactNode;
  lede: React.ReactNode;
  sections: Section[];
  faqs?: Faq[];
  kind?: "guide" | "legal";
}) {
  const related = GUIDES.filter((g) => g.href !== path);
  return (
    <article>
      {faqs && faqs.length > 0 && <JsonLd data={faqJsonLd(faqs)} />}
      <header className="doc-hero">
        <div className="wrap">
          <nav className="crumbs" aria-label="Breadcrumb">
            <ol>
              <li>
                <Link href="/">Home</Link>
              </li>
              {kind === "guide" && (
                <li>
                  <Link href="/#guides">Guides</Link>
                </li>
              )}
              <li aria-current="page">{eyebrow}</li>
            </ol>
          </nav>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="doc-title">{title}</h1>
          <p className="doc-lede">{lede}</p>
          <p className="doc-byline">
            <LogoMark size={22} />
            <span>
              {kind === "guide" ? "Threadline team · " : "Last updated "}
              <time dateTime={PUBLISHED_ISO}>{PUBLISHED}</time>
            </span>
          </p>
        </div>
      </header>

      <div className="wrap doc-grid">
        <aside className="toc" aria-label="On this page">
          <p className="toc-title">On this page</p>
          <ol>
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.title}</a>
              </li>
            ))}
            {faqs && faqs.length > 0 && (
              <li>
                <a href="#faq">FAQ</a>
              </li>
            )}
          </ol>
          {kind === "guide" && (
            <Link href="/signup" className="btn btn-primary toc-cta">
              Get started
            </Link>
          )}
        </aside>

        <div className="prose">
          {sections.map((s) => (
            <section key={s.id} aria-labelledby={s.id}>
              <h2 id={s.id}>{s.title}</h2>
              {s.body}
            </section>
          ))}

          {faqs && faqs.length > 0 && (
            <section className="doc-faq" aria-labelledby="faq">
              <h2 id="faq">Frequently asked questions</h2>
              <div className="faq">
                {faqs.map((f) => (
                  <details key={f.q}>
                    <summary>
                      {f.q}
                      <span className="faq-plus" aria-hidden="true" />
                    </summary>
                    <p>{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          )}

          {kind === "guide" && (
            <aside className="doc-cta" aria-label="Get started">
              <div>
                <h2>Put your agent in a chat thread</h2>
                <p>Start on iMessage today. Telegram and WhatsApp use the same agent.</p>
              </div>
              <Link href="/signup" className="btn btn-blue btn-lg">
                Get started
              </Link>
            </aside>
          )}
        </div>
      </div>

      {kind === "guide" && (
        <section className="wrap doc-related sec-cta" aria-labelledby="related-title">
          <h2 id="related-title">More from the field guide</h2>
          <div className="guides">
            {related.map((g) => (
              <Link key={g.href} href={g.href} className={`card guide-card guide-${g.channel.toLowerCase()}`}>
                <span className="guide-ch">{g.channel}</span>
                <h3>{g.title}</h3>
                <p>{g.blurb}</p>
                <span className="way-link">
                  Read the guide <Arrow />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {kind === "legal" && <div className="sec-cta" />}
    </article>
  );
}
