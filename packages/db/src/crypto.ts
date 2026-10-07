// Encrypt business credentials at rest (bots.credentials_json, channel tokens). AES-256-GCM.
// Key: THREADLINE_ENCRYPTION_KEY (32+ chars) or derived from AUTH_SECRET; dev fallback is fixed and logged once.
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

let _key: Buffer | null = null;
function key(): Buffer {
  if (_key) return _key;
  const material = process.env.THREADLINE_ENCRYPTION_KEY || process.env.AUTH_SECRET;
  if (!material) console.warn("[threadline] no encryption key env set; using dev key (not for production)");
  _key = scryptSync(material || "threadline-dev-only", "threadline-credentials-v1", 32);
  return _key;
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return "v1:" + Buffer.concat([iv, c.getAuthTag(), enc]).toString("base64url");
}

export function decrypt(blob: string | null | undefined): string | null {
  if (!blob) return null;
  if (!blob.startsWith("v1:")) return blob; // legacy plaintext
  const raw = Buffer.from(blob.slice(3), "base64url");
  const d = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
  d.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8");
}

export const encryptJson = (v: unknown) => encrypt(JSON.stringify(v ?? null));
export const decryptJson = <T = any>(blob: string | null | undefined, fallback: T): T => {
  const s = decrypt(blob);
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
};
