// Knowledge: docs → ~800-char overlapping chunks → knowledge_chunks + knowledge_fts. Hybrid retrieval:
// FTS5 bm25 always; cosine over embeddings when an embedding provider (OPENAI_API_KEY) is configured.
import { run, all, get, id, tx } from "@threadline/db";

export interface KnowledgeHit { chunkId: string; text: string; url: string | null; title: string | null; score: number }

export function chunkText(text: string, size = 800, overlap = 120): string[] {
  const clean = text.replace(/\n{3,}/g, "\n\n").trim();
  if (clean.length <= size) return clean ? [clean] : [];
  const paras = clean.split(/\n(?=## )|\n\n/);
  const chunks: string[] = [];
  let cur = "";
  const flush = () => { if (cur.trim()) chunks.push(cur.trim()); };
  for (const p of paras) {
    if ((cur + "\n" + p).length <= size) { cur = cur ? cur + "\n" + p : p; continue; }
    flush();
    if (p.length <= size) { cur = (chunks.length ? tail(chunks[chunks.length - 1], overlap) + "\n" : "") + p; continue; }
    // long paragraph: sentence windows
    const sents = p.split(/(?<=[.!?])\s+/);
    cur = "";
    for (const s of sents) {
      if ((cur + " " + s).length > size && cur) { chunks.push(cur.trim()); cur = tail(cur, overlap) + " " + s; }
      else cur = cur ? cur + " " + s : s;
    }
  }
  flush();
  return chunks;
}
function tail(s: string, n: number) { return s.length <= n ? s : "…" + s.slice(s.length - n).replace(/^\S*\s/, ""); }

export function addDoc(botId: string, doc: { url?: string | null; title?: string | null; content: string }): string {
  const docId = id("kd_");
  const chunks = chunkText(doc.content);
  tx(() => {
    run("INSERT INTO knowledge_docs(id,bot_id,url,title,content) VALUES (?,?,?,?,?)", [docId, botId, doc.url ?? null, doc.title ?? null, doc.content]);
    chunks.forEach((c, i) => {
      const cid = id("kc_");
      // prefix title so FTS matches on page titles too
      const text = doc.title && !c.startsWith(doc.title) ? `${doc.title}\n${c}` : c;
      run("INSERT INTO knowledge_chunks(id,bot_id,doc_id,ord,text) VALUES (?,?,?,?,?)", [cid, botId, docId, i, text]);
      run("INSERT INTO knowledge_fts(text,chunk_id,bot_id) VALUES (?,?,?)", [text, cid, botId]);
    });
  });
  return docId;
}

export function clearKnowledge(botId: string) {
  tx(() => {
    run("DELETE FROM knowledge_fts WHERE bot_id=?", [botId]);
    run("DELETE FROM knowledge_chunks WHERE bot_id=?", [botId]);
    run("DELETE FROM knowledge_docs WHERE bot_id=?", [botId]);
  });
}

export function knowledgeStats(botId: string) {
  return get<{ docs: number; chunks: number }>(
    "SELECT (SELECT COUNT(*) FROM knowledge_docs WHERE bot_id=?) docs, (SELECT COUNT(*) FROM knowledge_chunks WHERE bot_id=?) chunks", [botId, botId])!;
}

const STOP = new Set("a an the and or but if of to in on at for with from by is are was were be been am i me my you your we our us it its this that these those do does did have has had can could would should will what which who whom how when where why there here about any some all just so not no yes please hi hello hey want need get tell know like also more most than then them they he she his her ka ki ke hai ho kya mujhe aap".split(" "));

export function ftsQuery(q: string) {
  const terms = [...new Set(q.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((t) => t.length > 1 && !STOP.has(t)))].slice(0, 16);
  if (!terms.length) return null;
  // prefix match each term; light stemming for plurals
  return terms.map((t) => `"${t.replace(/(ies|es|s)$/, "") || t}"*`).join(" OR ");
}

export async function searchKnowledge(botId: string, query: string, k = 8): Promise<KnowledgeHit[]> {
  const q = ftsQuery(query);
  const hits = new Map<string, KnowledgeHit>();
  if (q) {
    try {
      const rows = all<{ chunk_id: string; text: string; score: number; url: string | null; title: string | null }>(
        `SELECT f.chunk_id, f.text, bm25(knowledge_fts) score, d.url, d.title FROM knowledge_fts f
         JOIN knowledge_chunks c ON c.id=f.chunk_id LEFT JOIN knowledge_docs d ON d.id=c.doc_id
         WHERE knowledge_fts MATCH ? AND f.bot_id=? ORDER BY score LIMIT ?`, [q, botId, k * 2]);
      rows.forEach((r, i) => hits.set(r.chunk_id, { chunkId: r.chunk_id, text: r.text, url: r.url, title: r.title, score: 1 / (60 + i) }));
    } catch { /* malformed query */ }
  }
  const emb = await embeddingSearch(botId, query, k * 2).catch(() => []);
  emb.forEach((h, i) => {
    const prev = hits.get(h.chunkId);
    if (prev) prev.score += 1 / (60 + i);
    else hits.set(h.chunkId, { ...h, score: 1 / (60 + i) });
  });
  return [...hits.values()].sort((a, b) => b.score - a.score).slice(0, k);
}

// ───────── optional embeddings (reciprocal-rank fused with bm25) ─────────
function embeddingsAvailable() { return !!process.env.OPENAI_API_KEY && process.env.THREADLINE_LLM !== "offline"; }
async function embed(texts: string[]): Promise<number[][]> {
  const r = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST", signal: AbortSignal.timeout(30_000),
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: process.env.THREADLINE_EMBED_MODEL || "text-embedding-3-small", input: texts }),
  });
  if (!r.ok) throw new Error("embeddings " + r.status);
  const j: any = await r.json();
  return j.data.map((d: any) => d.embedding);
}
export async function embedBot(botId: string) {
  if (!embeddingsAvailable()) return 0;
  const rows = all<{ id: string; text: string }>("SELECT id,text FROM knowledge_chunks WHERE bot_id=? AND embedding IS NULL", [botId]);
  for (let i = 0; i < rows.length; i += 64) {
    const batch = rows.slice(i, i + 64);
    const vecs = await embed(batch.map((r) => r.text));
    batch.forEach((r, j) => run("UPDATE knowledge_chunks SET embedding=? WHERE id=?", [Buffer.from(new Float32Array(vecs[j]).buffer), r.id]));
  }
  return rows.length;
}
async function embeddingSearch(botId: string, query: string, k: number): Promise<KnowledgeHit[]> {
  if (!embeddingsAvailable()) return [];
  const rows = all<{ id: string; text: string; embedding: Uint8Array; url: string | null; title: string | null }>(
    "SELECT c.id,c.text,c.embedding,d.url,d.title FROM knowledge_chunks c LEFT JOIN knowledge_docs d ON d.id=c.doc_id WHERE c.bot_id=? AND c.embedding IS NOT NULL", [botId]);
  if (!rows.length) return [];
  const [qv] = await embed([query]);
  const scored = rows.map((r) => {
    const v = new Float32Array(r.embedding.buffer, r.embedding.byteOffset, r.embedding.byteLength / 4);
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < v.length; i++) { dot += v[i] * qv[i]; na += v[i] * v[i]; nb += qv[i] * qv[i]; }
    return { chunkId: r.id, text: r.text, url: r.url, title: r.title, score: dot / (Math.sqrt(na * nb) || 1) };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, k);
}
