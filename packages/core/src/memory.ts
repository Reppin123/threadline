// Customers + per-customer memories (durable facts, e.g. name, address, preferences).
import { run, get, all, id } from "@threadline/db";

export function ensureCustomer(botId: string, channel: string, handle: string, name?: string): string {
  const c = get<{ id: string; display_name: string | null }>("SELECT id, display_name FROM customers WHERE bot_id=? AND channel=? AND handle=?", [botId, channel, handle]);
  if (c) {
    run("UPDATE customers SET last_seen=datetime('now')" + (name && !c.display_name ? ", display_name=?" : "") + " WHERE id=?", name && !c.display_name ? [name, c.id] : [c.id]);
    return c.id;
  }
  const cid = id("cu_");
  run("INSERT INTO customers(id,bot_id,channel,handle,display_name) VALUES (?,?,?,?,?)", [cid, botId, channel, handle, name ?? null]);
  return cid;
}

export function getMemories(customerId: string): Record<string, string> {
  const rows = all<{ key: string; value: string }>("SELECT key,value FROM memories WHERE customer_id=? ORDER BY updated_at", [customerId]);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

const normKey = (k: string) => k.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 48);

export function setMemory(customerId: string, key: string, value: string) {
  const k = normKey(key);
  const v = String(value ?? "").trim().slice(0, 500);
  if (!k || !v) return;
  run(`INSERT INTO memories(id,customer_id,key,value) VALUES (?,?,?,?)
       ON CONFLICT(customer_id,key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')`, [id("me_"), customerId, k, v]);
  if (k === "name") run("UPDATE customers SET display_name=? WHERE id=?", [v, customerId]);
}

export function saveMemories(customerId: string, mem: unknown) {
  if (!mem || typeof mem !== "object") return [];
  const saved: string[] = [];
  for (const [k, v] of Object.entries(mem as Record<string, unknown>)) {
    if (v === null || v === undefined || v === "" || typeof v === "object") continue;
    setMemory(customerId, k, String(v));
    saved.push(normKey(k));
  }
  return saved;
}
