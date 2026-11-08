import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, createHash, timingSafeEqual } from "crypto";

/**
 * AES-256-GCM encryption for secrets stored in the `settings` table
 * (payment, courier and API credentials). Format: v1:<iv>:<tag>:<ciphertext> (base64).
 */
function key() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY is not set");
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error("ENCRYPTION_KEY must decode to 32 bytes");
  return buf;
}

export function encrypt(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

export function decrypt(payload: string) {
  const [version, iv, tag, data] = payload.split(":");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Unsupported secret format");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}

/** One-way hash for API tokens (e.g. importer extension token). */
export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}
