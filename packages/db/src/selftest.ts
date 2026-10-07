process.env.THREADLINE_DB ||= "/tmp/threadline-selftest.db";
const { db, run, get, id } = await import("./index.ts");
db();
const u = id("u_");
run("INSERT INTO users(id,email) VALUES (?,?)", [u, u + "@x.dev"]);
if (!get("SELECT * FROM users WHERE id=?", [u])) throw new Error("db selftest failed");
run("INSERT INTO knowledge_fts(text,chunk_id,bot_id) VALUES (?,?,?)", ["hello world fts", "c1", "b1"]);
if (!get("SELECT * FROM knowledge_fts WHERE knowledge_fts MATCH 'world'")) throw new Error("fts5 missing");
console.log("db selftest ok");
