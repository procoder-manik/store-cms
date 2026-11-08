"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/audit";
import { saveSetting } from "@/lib/settings/server";
import { sanitizeRich } from "@/lib/security/sanitize";
import { slugify } from "@/lib/utils";
import { seoSchema } from "@/lib/validators/seo";
import { RESERVED_PATHS, readPostTypes } from "@/lib/content/post-types";
import { redirectOnSlugChange } from "@/lib/seo/slug-redirect";
import type { ActionResult } from "@/lib/actions/result";

const fail = (e: unknown): ActionResult<never> => ({ ok: false, error: e instanceof z.ZodError ? e.issues[0]?.message ?? "Invalid" : e instanceof Error ? e.message : "Failed" });

const postSchema = z.object({
  id: z.string().uuid().optional(), post_type: z.string().regex(/^[a-z0-9_-]{2,30}$/), title: z.string().trim().min(2).max(200), slug: z.string().max(120).default(""),
  excerpt: z.string().max(400).default(""), content_html: z.string().max(300_000).default(""), cover_url: z.string().url().or(z.literal("")).default(""),
  category_id: z.string().uuid().nullable().default(null), tags: z.array(z.string().trim().min(1).max(40)).max(15).default([]),
  related_product_ids: z.array(z.string().uuid()).max(12).default([]), show_toc: z.boolean().default(true),
  status: z.enum(["draft", "published"]), published_at: z.string().nullable().default(null), seo: seoSchema.default({}),
});
export type PostInput = z.input<typeof postSchema>;

export async function savePostAction(input: PostInput): Promise<ActionResult<{ id: string }>> {
  try {
    const d = postSchema.parse(input);
    const staff = await assertPermission(d.id ? "content.update" : "content.create");
    const row = {
      ...d, slug: slugify(d.slug || d.title), content_html: sanitizeRich(d.content_html), cover_url: d.cover_url || null, excerpt: d.excerpt || null,
      published_at: d.status === "published" ? (d.published_at ? new Date(d.published_at).toISOString() : new Date().toISOString()) : d.published_at,
      ...(d.id ? {} : { author_id: staff.userId }),
    };
    const { id, ...values } = row;
    const admin = createAdminClient();
    const before = id ? (await admin.from("blog_posts").select("slug,post_type").eq("id", id).maybeSingle()).data : null;
    const { data, error } = await (id ? admin.from("blog_posts").update(values).eq("id", id) : admin.from("blog_posts").insert(values)).select("id").single();
    if (error) return { ok: false, error: error.code === "23505" ? "That URL is already used." : error.message };
    if (before?.slug) {
      const types = readPostTypes((await admin.from("settings").select("value").eq("key", "post_types").maybeSingle()).data?.value);
      const pathOf = (t: string) => types.find((x) => x.id === t)?.path ?? (t === "post" ? "blog" : t);
      const oldBase = `/${pathOf(before.post_type as string)}`, newBase = `/${pathOf(d.post_type)}`;
      if (oldBase === newBase) await redirectOnSlugChange(admin, oldBase, before.slug as string, row.slug);
      else await admin.from("redirects").upsert({ from_path: `${oldBase}/${before.slug}`, to_path: `${newBase}/${row.slug}`, code: 301 }, { onConflict: "from_path" });
    }
    await logAudit({ actorId: staff.userId, action: "post.save", entity: "blog_posts", entityId: data.id as string });
    revalidatePath("/", "layout");
    return { ok: true, data: { id: data.id as string } };
  } catch (e) { return fail(e); }
}

export async function deletePostAction(id: string): Promise<ActionResult> {
  try {
    const staff = await assertPermission("content.delete");
    await createAdminClient().from("blog_posts").delete().eq("id", z.string().uuid().parse(id));
    await logAudit({ actorId: staff.userId, action: "post.delete", entity: "blog_posts", entityId: id });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function saveCategoryAction(postType: string, name: string, id?: string): Promise<ActionResult> {
  try {
    await assertPermission("content.update");
    const n = z.string().trim().min(2).max(60).parse(name);
    const admin = createAdminClient();
    const row = { name: n, slug: `${postType === "post" ? "" : `${postType}-`}${slugify(n)}`, post_type: postType };
    const { error } = id ? await admin.from("blog_categories").update(row).eq("id", id) : await admin.from("blog_categories").insert(row);
    if (error) return { ok: false, error: error.code === "23505" ? "A category with that name exists." : error.message };
    revalidatePath("/admin/posts");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  try {
    await assertPermission("content.delete");
    await createAdminClient().from("blog_categories").delete().eq("id", id);
    revalidatePath("/admin/posts");
    return { ok: true };
  } catch (e) { return fail(e); }
}

const typeSchema = z.object({ id: z.string().regex(/^[a-z0-9_-]{2,30}$/), label: z.string().trim().min(2).max(40), label_bn: z.string().max(40).optional(), path: z.string().regex(/^[a-z0-9-]{2,30}$/), layout: z.enum(["classic", "magazine", "minimal"]).optional() });
export async function savePostTypesAction(types: z.input<typeof typeSchema>[]): Promise<ActionResult> {
  try {
    const staff = await assertPermission("content.update");
    const list = z.array(typeSchema).min(1).max(12).parse(types);
    if (list.some((t) => RESERVED_PATHS.has(t.path))) return { ok: false, error: "One of the addresses is used by the store. Pick another." };
    if (new Set(list.map((t) => t.path)).size !== list.length || new Set(list.map((t) => t.id)).size !== list.length) return { ok: false, error: "Each type needs a unique ID and address." };
    await saveSetting("post_types", { types: list }, undefined, staff.userId);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) { return fail(e); }
}
