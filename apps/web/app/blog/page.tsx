import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/site/JsonLd";
import { categoryClass, fmtPostDate, getAllPosts } from "./_lib/posts";

const APP_URL = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
const DESCRIPTION =
  "Guides, comparisons and field notes on putting AI agents in iMessage, Telegram and WhatsApp, from the team building Threadline.";

export const metadata: Metadata = {
  title: "Blog: AI agents for iMessage, Telegram and WhatsApp",
  description: DESCRIPTION,
  alternates: { canonical: "/blog" },
  openGraph: { type: "website", url: "/blog", title: "The Threadline blog", description: DESCRIPTION, siteName: "Threadline" },
  twitter: { card: "summary_large_image", title: "The Threadline blog", description: DESCRIPTION },
};

function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" className="arrow-ico">
      <path d="M3 8h10m-4-4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function BlogIndex() {
  const posts = getAllPosts();
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "The Threadline blog",
          description: DESCRIPTION,
          url: `${APP_URL}/blog`,
          publisher: { "@type": "Organization", name: "Threadline", logo: { "@type": "ImageObject", url: `${APP_URL}/icon.svg` } },
          blogPost: posts.map((p) => ({
            "@type": "BlogPosting",
            headline: p.title,
            description: p.description,
            datePublished: p.date,
            url: `${APP_URL}/blog/${p.slug}`,
            author: { "@type": "Person", name: p.author },
          })),
        }}
      />
      <header className="doc-hero blog-hero">
        <div className="wrap">
          <nav className="crumbs" aria-label="Breadcrumb">
            <ol>
              <li>
                <Link href="/">Home</Link>
              </li>
              <li aria-current="page">Blog</li>
            </ol>
          </nav>
          <p className="eyebrow">Blog</p>
          <h1 className="doc-title">
            Notes from the <span className="serif">thread</span>.
          </h1>
          <p className="doc-lede">{DESCRIPTION}</p>
        </div>
      </header>

      <section className="wrap sec-cta" aria-label="Posts">
        <div className="blog-grid">
          {posts.map((p, i) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className={`card guide-card blog-card ${categoryClass(p.category)}${i === 0 ? " blog-feature" : ""}`}
            >
              <span className="guide-ch">{p.category}</span>
              <h2>{p.title}</h2>
              <p>{p.description}</p>
              <span className="blog-meta">
                <time dateTime={p.date}>{fmtPostDate(p.date)}</time> · {p.minutes} min read
              </span>
              <span className="way-link">
                Read the post <Arrow />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
