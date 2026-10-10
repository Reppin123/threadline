import "server-only";
import fs from "node:fs";
import path from "node:path";
import { parseBody, stripInline } from "./markdown";

// Posts live as markdown in <repo>/launch/blog/*.md and are read at build time (every blog route is static).

export type PostMeta = {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  category: string;
  primaryKeyword: string;
  keywords: string[];
  words: number;
  minutes: number;
};
export type Post = PostMeta & ReturnType<typeof parseBody>;

function postsDir() {
  const candidates = [path.join(process.cwd(), "launch", "blog"), path.join(process.cwd(), "..", "..", "launch", "blog")];
  return candidates.find((d) => fs.existsSync(d)) ?? candidates[1];
}

function frontmatter(src: string) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(src);
  const data: Record<string, unknown> = {};
  if (!m) return { data, body: src };
  for (const line of m[1].split("\n")) {
    const kv = /^([a-z_]+):\s*(.*)$/i.exec(line);
    if (!kv) continue;
    const raw = kv[2].trim();
    let v: unknown = raw;
    if (raw.startsWith("[") || raw.startsWith('"')) {
      try { v = JSON.parse(raw); } catch { v = raw.replace(/^"|"$/g, ""); }
    }
    data[kv[1]] = v;
  }
  return { data, body: src.slice(m[0].length) };
}

function load(file: string): Post {
  const { data, body } = frontmatter(fs.readFileSync(file, "utf8"));
  const words = stripInline(body).split(/\s+/).filter(Boolean).length;
  const str = (k: string, d = "") => (typeof data[k] === "string" ? (data[k] as string) : d);
  return {
    slug: str("slug", path.basename(file, ".md")),
    title: str("title"),
    description: str("description"),
    date: str("date"),
    author: str("author", "Aki"),
    category: str("category", "Guide"),
    primaryKeyword: str("primary_keyword"),
    keywords: Array.isArray(data.secondary_keywords) ? (data.secondary_keywords as string[]) : [],
    words,
    minutes: Math.max(1, Math.round(words / 230)),
    ...parseBody(body),
  };
}

let cache: Post[] | null = null;

export function getAllPosts(): Post[] {
  if (cache) return cache;
  const dir = postsDir();
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "README.md") : [];
  cache = files
    .map((f) => load(path.join(dir, f)))
    .filter((p) => p.title && p.slug)
    .sort((a, b) => b.date.localeCompare(a.date) || ORDER.indexOf(a.slug) - ORDER.indexOf(b.slug));
  return cache;
}

// Launch order for posts that share a date.
const ORDER = [
  "how-to-add-an-ai-agent-to-imessage",
  "ai-agent-for-dtc-store-sanitea",
  "imessage-vs-sms-vs-whatsapp-vs-rcs",
  "telegram-ai-bot-in-2-minutes",
  "testing-ai-chatbots-with-simulated-customers",
  "customers-would-rather-text-than-use-your-app",
];

export function getPost(slug: string) {
  return getAllPosts().find((p) => p.slug === slug) ?? null;
}

export function fmtPostDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** Category → existing site card colour variant. */
export function categoryClass(category: string) {
  return { "Case study": "guide-whatsapp", Engineering: "guide-telegram", Comparison: "guide-architecture" }[category] ?? "guide-imessage";
}
