import { NextResponse } from "next/server";
import { z } from "zod";
import { getStaff } from "@/lib/auth/rbac";
import { rateLimit } from "@/lib/security/ratelimit";
import { ALLOWED_MIME, createUploadTarget, makeKey } from "@/lib/storage";

const schema = z.object({
  contentType: z.string(),
  size: z.number().int().positive(),
  folder: z.string().max(40).default("uploads"),
});

/** Returns a short-lived signed upload target for staff with media.create. */
export async function POST(req: Request) {
  const staff = await getStaff();
  if (!staff?.can("media.create")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rl = await rateLimit(`upload:${staff.userId}`, 120, 600);
  if (!rl.ok) return NextResponse.json({ error: "Too many uploads. Wait a few minutes." }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const info = ALLOWED_MIME[parsed.data.contentType];
  if (!info) return NextResponse.json({ error: "Only JPG, PNG, WebP, AVIF, GIF, MP4 and WebM files are allowed." }, { status: 415 });
  if (parsed.data.size > info.maxMb * 1024 * 1024) {
    return NextResponse.json({ error: `Max size is ${info.maxMb} MB for this file type.` }, { status: 413 });
  }
  try {
    const key = makeKey(parsed.data.folder, parsed.data.contentType);
    return NextResponse.json(await createUploadTarget(key, parsed.data.contentType));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 500 });
  }
}
