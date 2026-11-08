"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/audit";
import { sanitizeCss, sanitizeRich } from "@/lib/security/sanitize";
import { slugify } from "@/lib/utils";
import { redirectOnSlugChange } from "@/lib/seo/slug-redirect";
import { seoSchema } from "@/lib/validators/seo";
import type { ActionResult } from "@/lib/actions/result";

const fail = (e: unknown): ActionResult<never> => ({ ok: false, error: e instanceof z.ZodError ? e.issues[0]?.message ?? "Invalid" : e instanceof Error ? e.message : "Failed" });

const pageSchema = z.object({
  id: z.string().uuid().optional(), kind: z.enum(["page", "landing"]), title: z.string().trim().min(2).max(160), slug: z.string().max(120).default(""),
  content_html: z.string().max(200_000).default(""), is_published: z.boolean(), seo: seoSchema.default({}),
  hide_chrome: z.boolean().default(false), product_id: z.string().uuid().nullable().default(null), custom_css: z.string().max(20000).default(""),
});
export type PageInput = z.input<typeof pageSchema>;

export async function savePageAction(input: PageInput): Promise<ActionResult<{ id: string }>> {
  try {
    const d = pageSchema.parse(input);
    const staff = await assertPermission(d.id ? "content.update" : "content.create");
    const row = { kind: d.kind, title: d.title, slug: slugify(d.slug || d.title), content_html: sanitizeRich(d.content_html), is_published: d.is_published, seo: d.seo,
      hide_chrome: d.hide_chrome, product_id: d.product_id, custom_css: sanitizeCss(d.custom_css) || null };
    const admin = createAdminClient();
    const oldSlug = d.id ? ((await admin.from("pages").select("slug").eq("id", d.id).maybeSingle()).data?.slug as string | undefined) : undefined;
    const q = d.id ? admin.from("pages").update(row).eq("id", d.id) : admin.from("pages").insert(row);
    const { data, error } = await q.select("id").single();
    if (error) return { ok: false, error: error.code === "23505" ? "That URL is already used by another page." : error.message };
    await redirectOnSlugChange(admin, d.kind === "landing" ? "/lp" : "/pages", oldSlug, row.slug);
    await logAudit({ actorId: staff.userId, action: `${d.kind}.save`, entity: "pages", entityId: data.id as string });
    revalidatePath("/", "layout");
    return { ok: true, data: { id: data.id as string } };
  } catch (e) { return fail(e); }
}

export async function deletePageAction(id: string): Promise<ActionResult> {
  try {
    const staff = await assertPermission("content.delete");
    await createAdminClient().from("pages").delete().eq("id", z.string().uuid().parse(id));
    await logAudit({ actorId: staff.userId, action: "page.delete", entity: "pages", entityId: id });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) { return fail(e); }
}

export async function duplicatePageAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    await assertPermission("content.create");
    const admin = createAdminClient();
    const { data: p } = await admin.from("pages").select("*").eq("id", id).single();
    if (!p) return { ok: false, error: "Not found" };
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = p as Record<string, unknown>;
    void _id; void _c; void _u;
    const { data, error } = await admin.from("pages").insert({ ...rest, title: `${rest.title} (copy)`, slug: `${rest.slug}-copy-${Date.now().toString(36)}`, is_published: false }).select("id").single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: { id: data.id as string } };
  } catch (e) { return fail(e); }
}
