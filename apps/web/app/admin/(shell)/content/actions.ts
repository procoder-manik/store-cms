"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/audit";
import { sanitizeRich } from "@/lib/security/sanitize";
import { slugify } from "@/lib/utils";
import { seoSchema } from "@/lib/validators/seo";
import type { ActionResult } from "@/lib/actions/result";

const fail = (e: unknown): ActionResult<never> => ({ ok: false, error: e instanceof z.ZodError ? e.issues[0]?.message ?? "Invalid" : e instanceof Error ? e.message : "Failed" });
const TABLE = { page: "pages", faq: "faqs", post: "blog_posts", blog_category: "blog_categories" } as const;

const pageSchema = z.object({ id: z.string().uuid().optional(), title: z.string().trim().min(2).max(160), slug: z.string().max(120).default(""), content_html: z.string().max(200_000).default(""), is_published: z.boolean(), seo: seoSchema.default({}) });
const faqSchema = z.object({ id: z.string().uuid().optional(), question: z.string().trim().min(3).max(300), answer: z.string().trim().min(2).max(3000), category: z.string().max(60).default(""), sort_order: z.number().int().default(0), is_active: z.boolean() });
const postSchema = z.object({
  id: z.string().uuid().optional(), title: z.string().trim().min(2).max(200), slug: z.string().max(120).default(""), excerpt: z.string().max(400).default(""),
  content_html: z.string().max(300_000).default(""), cover_url: z.string().url().or(z.literal("")).default(""), category_id: z.string().uuid().nullable().default(null),
  status: z.enum(["draft", "published"]), published_at: z.string().nullable().default(null), seo: seoSchema.default({}),
});

export async function saveContentAction(kind: keyof typeof TABLE, input: Record<string, unknown>): Promise<ActionResult<{ id: string }>> {
  try {
    const staff = await assertPermission(input.id ? "content.update" : "content.create");
    const admin = createAdminClient();
    let row: Record<string, unknown>;
    if (kind === "page") { const d = pageSchema.parse(input); row = { ...d, slug: slugify(d.slug || d.title), content_html: sanitizeRich(d.content_html) }; }
    else if (kind === "faq") { const d = faqSchema.parse(input); row = { ...d, category: d.category || null }; }
    else if (kind === "post") {
      const d = postSchema.parse(input);
      row = { ...d, author_id: staff.userId, slug: slugify(d.slug || d.title), content_html: sanitizeRich(d.content_html), cover_url: d.cover_url || null, excerpt: d.excerpt || null,
        published_at: d.status === "published" ? (d.published_at ? new Date(d.published_at).toISOString() : new Date().toISOString()) : d.published_at };
    } else { const name = z.string().trim().min(2).max(60).parse(input.name); row = { name, slug: slugify(name) }; }
    const { id, ...values } = row as { id?: string };
    const q = id ? admin.from(TABLE[kind]).update(values).eq("id", id) : admin.from(TABLE[kind]).insert(values);
    const { data, error } = await q.select("id").single();
    if (error) return { ok: false, error: error.code === "23505" ? "That URL is already used." : error.message };
    await logAudit({ actorId: staff.userId, action: `${kind}.save`, entity: TABLE[kind], entityId: data.id as string });
    revalidatePath("/admin/content");
    revalidatePath("/", "layout");
    return { ok: true, data: { id: data.id as string } };
  } catch (e) { return fail(e); }
}

export async function deleteContentAction(kind: keyof typeof TABLE, id: string): Promise<ActionResult> {
  try {
    const staff = await assertPermission("content.delete");
    await createAdminClient().from(TABLE[kind]).delete().eq("id", z.string().uuid().parse(id));
    await logAudit({ actorId: staff.userId, action: `${kind}.delete`, entity: TABLE[kind], entityId: id });
    revalidatePath("/admin/content");
    return { ok: true };
  } catch (e) { return fail(e); }
}
