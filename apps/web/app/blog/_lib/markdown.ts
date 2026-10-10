// Tiny markdown renderer for the blog posts in launch/blog (a known, trusted subset):
// ## / ### headings, paragraphs, - and 1. lists, | tables |, > quotes, ``` fences, **bold**, *em*, `code`, [links](url).

export type Heading = { id: string; text: string };
export type Section = { id: string; title: string; html: string };
export type FaqItem = { q: string; a: string; html: string };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function slugify(s: string) {
  return stripInline(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
}

/** Markdown inline syntax → plain text (for JSON-LD, ids and word counts). */
export function stripInline(s: string) {
  return s.replace(/`([^`]+)`/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");
}

export function inline(src: string) {
  const codes: string[] = [];
  let s = src.replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(`<code>${esc(c)}</code>`) - 1}\u0000`);
  s = esc(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, href) => {
    const external = /^https?:\/\//.test(href);
    return `<a href="${href}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${text}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[Number(i)]);
}

const cells = (row: string) => row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

/** Block-level render of a markdown fragment (no H2s inside; those split sections). */
export function renderBlocks(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`);
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) { flush(); continue; }
    if (line.startsWith("```")) {
      flush();
      const code: string[] = [];
      while (++i < lines.length && !lines[i].startsWith("```")) code.push(lines[i]);
      out.push(`<pre><code>${esc(code.join("\n"))}</code></pre>`);
      continue;
    }
    const h = /^(#{3,4})\s+(.*)$/.exec(line);
    if (h) {
      flush();
      const tag = h[1].length === 3 ? "h3" : "h4";
      out.push(`<${tag} id="${slugify(h[2])}">${inline(h[2])}</${tag}>`);
      continue;
    }
    if (line.startsWith("|")) {
      flush();
      const rows: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]);
      i--;
      const [head, , ...body] = rows;
      out.push(
        `<div class="table-wrap"><table><thead><tr>${cells(head).map((c) => `<th scope="col">${inline(c)}</th>`).join("")}</tr></thead><tbody>` +
          body.map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("") +
          `</tbody></table></div>`,
      );
      continue;
    }
    const li = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(line);
    if (li) {
      flush();
      const ordered = /\d/.test(li[2]);
      const items: string[] = [];
      while (i < lines.length) {
        const m = /^\s*([-*]|\d+\.)\s+(.*)$/.exec(lines[i]);
        if (m) items.push(m[2]);
        else if (/^\s{2,}\S/.test(lines[i]) && items.length) items[items.length - 1] += " " + lines[i].trim();
        else break;
        i++;
      }
      i--;
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join("")}</${tag}>`);
      continue;
    }
    if (line.startsWith(">")) {
      flush();
      const q: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) q.push(lines[i++].replace(/^>\s?/, ""));
      i--;
      out.push(`<blockquote>${renderBlocks(q.join("\n"))}</blockquote>`);
      continue;
    }
    para.push(line.trim());
  }
  flush();
  return out.join("\n");
}

/** Split a post body into an intro, H2 sections and the FAQ (## Frequently asked questions → ### Q + answer). */
export function parseBody(md: string) {
  const parts = md.split(/^## +(.+)$/m);
  const intro = renderBlocks(parts[0]);
  const sections: Section[] = [];
  let faqs: FaqItem[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    const title = parts[i].trim();
    const body = parts[i + 1] ?? "";
    if (/^frequently asked questions$/i.test(title) || /^faq$/i.test(title)) {
      faqs = body.split(/^### +(.+)$/m).slice(1).reduce<FaqItem[]>((acc, cur, j, arr) => {
        if (j % 2 === 0) {
          const a = (arr[j + 1] ?? "").trim();
          acc.push({ q: stripInline(cur.trim()), a: stripInline(a.replace(/\s*\n\s*/g, " ")), html: renderBlocks(a) });
        }
        return acc;
      }, []);
      continue;
    }
    sections.push({ id: slugify(title), title: stripInline(title), html: renderBlocks(body) });
  }
  return { intro, sections, faqs };
}
