import "server-only";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Media storage. Cloudflare R2 (10 GB free) when R2_* env vars are set,
 * otherwise the Supabase "media" bucket (1 GB free, 50 MB per file).
 */
export type Driver = "r2" | "supabase";
const BUCKET = "media";

export const driver = (): Driver =>
  process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET && process.env.NEXT_PUBLIC_R2_PUBLIC_URL
    ? "r2" : "supabase";

let s3: S3Client | null = null;
function r2() {
  if (!s3) {
    s3 = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
    });
  }
  return s3;
}

export const ALLOWED_MIME: Record<string, { ext: string; kind: "image" | "video"; maxMb: number }> = {
  "image/jpeg": { ext: "jpg", kind: "image", maxMb: 10 },
  "image/png": { ext: "png", kind: "image", maxMb: 10 },
  "image/webp": { ext: "webp", kind: "image", maxMb: 10 },
  "image/avif": { ext: "avif", kind: "image", maxMb: 10 },
  "image/gif": { ext: "gif", kind: "image", maxMb: 10 },
  "video/mp4": { ext: "mp4", kind: "video", maxMb: 100 },
  "video/webm": { ext: "webm", kind: "video", maxMb: 100 },
};

export function makeKey(folder: string, mime: string) {
  const info = ALLOWED_MIME[mime];
  if (!info) throw new Error("Unsupported file type");
  const safeFolder = folder.replace(/[^a-z0-9-]/gi, "").toLowerCase() || "uploads";
  const d = new Date();
  return `${safeFolder}/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.${info.ext}`;
}

export function publicUrl(key: string) {
  if (driver() === "r2") return `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL!.replace(/\/$/, "")}/${key}`;
  return createAdminClient().storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
}

/** Browser upload target. R2: presigned PUT. Supabase: signed upload token. Valid for 10 minutes. */
export async function createUploadTarget(key: string, contentType: string) {
  if (driver() === "r2") {
    const url = await getSignedUrl(r2(), new PutObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key, ContentType: contentType }), { expiresIn: 600 });
    return { driver: "r2" as const, uploadUrl: url, token: null, key, publicUrl: publicUrl(key) };
  }
  const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUploadUrl(key);
  if (error || !data) throw new Error(error?.message ?? "Could not create upload URL");
  return { driver: "supabase" as const, uploadUrl: data.signedUrl, token: data.token, key, publicUrl: publicUrl(key) };
}

/** Server-side upload (used by the product importer to copy remote images and videos). */
export async function putObject(key: string, body: Buffer, contentType: string) {
  if (driver() === "r2") {
    await r2().send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key, Body: body, ContentType: contentType, CacheControl: "public, max-age=31536000, immutable" }));
  } else {
    const { error } = await createAdminClient().storage.from(BUCKET).upload(key, body, { contentType, cacheControl: "31536000", upsert: false });
    if (error) throw new Error(error.message);
  }
  return publicUrl(key);
}

export async function deleteObject(key: string) {
  if (driver() === "r2") await r2().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }));
  else await createAdminClient().storage.from(BUCKET).remove([key]);
}

/** Downloads a remote file (with size/type checks) and stores it. Returns the new public URL. */
export async function storeRemoteFile(url: string, folder: string, maxMb = 100) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, redirect: "follow" });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const mime = (res.headers.get("content-type") ?? "").split(";")[0]!.trim();
  if (!ALLOWED_MIME[mime]) throw new Error(`Unsupported type ${mime}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > maxMb * 1024 * 1024) throw new Error("File too large");
  const key = makeKey(folder, mime);
  const publicURL = await putObject(key, buf, mime);
  return { key, url: publicURL, mime, size: buf.byteLength };
}
