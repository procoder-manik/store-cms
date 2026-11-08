"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPermission } from "@/lib/auth/rbac";
import { deleteObject } from "@/lib/storage";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "@/lib/actions/result";

export interface MediaItem {
  id: string; url: string; thumbnail_url: string | null; mime: string; size_bytes: number;
  width: number | null; height: number | null; alt: string | null; folder: string; created_at: string;
}

const KEY_RE = /^[a-z0-9-]+\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.(jpg|png|webp|avif|gif|mp4|webm)$/;

const registerSchema = z.object({
  key: z.string().regex(KEY_RE),
  url: z.string().url(),
  mime: z.string(),
  size: z.number().int().positive(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  duration: z.number().nonnegative().nullable().optional(),
  alt: z.string().max(200).optional(),
  folder: z.string().max(40),
});

export async function registerMediaAction(input: z.infer<typeof registerSchema>): Promise<ActionResult<MediaItem>> {
  try {
    const staff = await assertPermission("media.create");
    const d = registerSchema.parse(input);
    const { data, error } = await createAdminClient().from("media").insert({
      storage_key: d.key, url: d.url, mime: d.mime, size_bytes: d.size, width: d.width ?? null,
      height: d.height ?? null, duration_sec: d.duration ?? null, alt: d.alt ?? null, folder: d.folder, uploaded_by: staff.userId,
    }).select("*").single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: data as MediaItem };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function listMediaAction(opts: { page?: number; kind?: "image" | "video" | "all"; q?: string }) {
  await assertPermission("media.view");
  const page = Math.max(1, opts.page ?? 1);
  const size = 40;
  let q = createAdminClient().from("media").select("*", { count: "exact" })
    .order("created_at", { ascending: false }).range((page - 1) * size, page * size - 1);
  if (opts.kind === "image") q = q.like("mime", "image/%");
  if (opts.kind === "video") q = q.like("mime", "video/%");
  if (opts.q) q = q.ilike("alt", `%${opts.q}%`);
  const { data, count } = await q;
  return { items: (data ?? []) as MediaItem[], total: count ?? 0, pageSize: size };
}

export async function updateMediaAltAction(id: string, alt: string): Promise<ActionResult> {
  try {
    await assertPermission("media.update");
    await createAdminClient().from("media").update({ alt: alt.slice(0, 200) }).eq("id", id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export async function deleteMediaAction(id: string): Promise<ActionResult> {
  try {
    const staff = await assertPermission("media.delete");
    const admin = createAdminClient();
    const { data } = await admin.from("media").select("storage_key,url").eq("id", id).single();
    if (!data) return { ok: false, error: "Not found" };
    const { count } = await admin.from("product_media").select("*", { count: "exact", head: true }).eq("url", data.url);
    if (count) return { ok: false, error: `Used by ${count} product(s). Remove it there first.` };
    await deleteObject(data.storage_key as string).catch(() => {});
    await admin.from("media").delete().eq("id", id);
    await logAudit({ actorId: staff.userId, action: "media.delete", entity: "media", entityId: id, before: data });
    revalidatePath("/admin/media");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}
