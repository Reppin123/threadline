import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/site/JsonLd";
import { LogoMark } from "@/components/site/Logo";
import { faqJsonLd } from "@/components/site/data";
import { categoryClass, fmtPostDate, getAllPosts, getPost } from "../_lib/posts";

const APP_URL = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return {};
  const path = `/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.description,
    keywords: [post.primaryKeyword, ...post.keywords],
    authors: [{ name: post.author }],
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      title: post.title,
      description: post.description,
      siteName: "Threadline",
      publishedTime: post.date,
      authors: [post.author],
      section: post.category,
      tags: post.keywords,
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.description },
  };
}

function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" className="arrow-ico">
      <path d="M3 8h10m-4-4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPost((await params).slug);
  if (!post) notFound();
  const url = `${APP_URL}/blog/${post.slug}`;
  const related = getAllPosts().filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.description,
          datePublished: post.date,
          dateModified: post.date,
          author: { "@type": "Person", name: post.author },
          publisher: { "@type": "Organization", name: "Threadline", logo: { "@type": "ImageObject", url: `${APP_URL}/icon.svg` } },
          mainEntityOfPage: { "@type": "WebPage", "@id": url },
          image: `${url}/opengraph-image`,
          articleSection: post.category,
          keywords: [post.primaryKeyword, ...post.keywords].join(", "),
          wordCount: post.words,
          inLanguage: "en",
        }}
      />
      {post.faqs.length > 0 && <JsonLd data={faqJsonLd(post.faqs.map((f) => ({ q: f.q, a: f.a })))} />}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${APP_URL}/` },
            { "@type": "ListItem", position: 2, name: "Blog", item: `${APP_URL}/blog` },
            { "@type": "ListItem", position: 3, name: post.title, item: url },
          ],
        }}
      />

      <header className="doc-hero">
        <div className="wrap">
          <nav className="crumbs" aria-label="Breadcrumb">
            <ol>
              <li>
                <Link href="/">Home</Link>
              </li>
              <li>
                <Link href="/blog">Blog</Link>
              </li>
              <li aria-current="page">{post.category}</li>
            </ol>
          </nav>
          <p className="eyebrow">{post.category}</p>
          <h1 className="doc-title">{post.title}</h1>
          <p className="doc-lede">{post.description}</p>
          <p className="doc-byline">
            <LogoMark size={22} />
            <span>
              {post.author} · <time dateTime={post.date}>{fmtPostDate(post.date)}</time> · {post.minutes} min read
            </span>
          </p>
        </div>
      </header>

      <div className="wrap doc-grid post-grid">
        <aside className="toc" aria-label="On this page">
          <p className="toc-title">On this page</p>
          <ol>
            {post.sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.title}</a>
              </li>
            ))}
            {post.faqs.length > 0 && (
              <li>
                <a href="#faq">FAQ</a>
              </li>
            )}
          </ol>
          <Link href="/signup" className="btn btn-primary toc-cta">
            Get started
          </Link>
        </aside>

        <div className="prose">
          {post.intro && <div className="md post-intro" dangerouslySetInnerHTML={{ __html: post.intro }} />}
          {post.sections.map((s) => (
            <section key={s.id} aria-labelledby={s.id}>
              <h2 id={s.id}>{s.title}</h2>
              <div className="md" dangerouslySetInnerHTML={{ __html: s.html }} />
            </section>
          ))}

          {post.faqs.length > 0 && (
            <section className="doc-faq" aria-labelledby="faq">
              <h2 id="faq">Frequently asked questions</h2>
              <div className="faq">
                {post.faqs.map((f) => (
                  <details key={f.q}>
                    <summary>
                      {f.q}
                      <span className="faq-plus" aria-hidden="true" />
                    </summary>
                    <div className="md" dangerouslySetInnerHTML={{ __html: f.html }} />
                  </details>
                ))}
              </div>
            </section>
          )}

          <aside className="doc-cta" aria-label="Get started">
            <div>
              <h2>Put your business in their messages</h2>
              <p>Build an agent from your site, API or idea. Free to build and test, no card needed.</p>
            </div>
            <Link href="/signup" className="btn btn-blue btn-lg">
              Get started
            </Link>
          </aside>
        </div>
      </div>

      <section className="wrap doc-related sec-cta" aria-labelledby="related-title">
        <h2 id="related-title">More from the blog</h2>
        <div className="guides">
          {related.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className={`card guide-card ${categoryClass(p.category)}`}>
              <span className="guide-ch">{p.category}</span>
              <h3>{p.title}</h3>
              <p>{p.description}</p>
              <span className="way-link">
                Read the post <Arrow />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </article>
  );
}
