"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPermission } from "@/lib/auth/rbac";
import { randomToken, sha256 } from "@/lib/security/crypto";
import { logAudit } from "@/lib/audit";
import { fetchAliExpress } from "@/lib/importers/aliexpress";
import { getImportPricing } from "@/lib/importers/pricing";
import { buildProductFromImport } from "@/lib/importers/to-product";
import { importedSchema } from "@/lib/importers/schema";
import { saveProductAction } from "../products/actions";
import type { ActionResult } from "@/lib/actions/result";

const fail = (e: unknown): ActionResult<never> => ({ ok: false, error: e instanceof Error ? e.message : "Failed" });

export async function createImportTokenAction(name: string): Promise<ActionResult<{ token: string }>> {
  try {
    const staff = await assertPermission("imports.create");
    const token = `imp_${randomToken(32)}`;
    await createAdminClient().from("import_tokens").insert({ name: name.trim().slice(0, 60) || "Chrome extension", token_hash: sha256(token), created_by: staff.userId });
    await logAudit({ actorId: staff.userId, action: "import.token_create", entity: "import_tokens" });
    revalidatePath("/admin/imports");
    return { ok: true, data: { token } };
  } catch (e) { return fail(e); }
}

export async function revokeImportTokenAction(id: string): Promise<ActionResult> {
  try {
    const staff = await assertPermission("imports.delete");
    await createAdminClient().from("import_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    await logAudit({ actorId: staff.userId, action: "import.token_revoke", entity: "import_tokens", entityId: id });
    revalidatePath("/admin/imports");
    return { ok: true };
  } catch (e) { return fail(e); }
}

/** Paste-a-link import. AliExpress uses the official API; Temu and Alibaba block servers, so they go through the extension. */
export async function importFromUrlAction(raw: string): Promise<ActionResult<{ jobId: string }>> {
  try {
    const staff = await assertPermission("imports.create");
    let url: URL;
    try { url = new URL(raw.trim()); } catch { return { ok: false, error: "That is not a valid link." }; }
    const host = url.hostname;
    if (/temu\.com$/.test(host) || /alibaba\.com$/.test(host) || /1688\.com$/.test(host)) {
      return { ok: false, error: "Temu and Alibaba block server imports. Open the product page in Chrome and click the extension's Import button." };
    }
    if (!/aliexpress\./.test(host)) return { ok: false, error: "Paste a product link from AliExpress, or use the extension for Temu and Alibaba." };
    const product = importedSchema.parse(await fetchAliExpress(url));
    const { data, error } = await createAdminClient().from("import_jobs")
      .insert({ source_platform: "aliexpress", url: url.toString(), status: "previewed", normalized: product, actor_id: staff.userId }).select("id").single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: { jobId: data.id as string } };
  } catch (e) { return fail(e); }
}

const choiceSchema = z.object({
  title: z.string().trim().min(2).max(200), price: z.number().positive().nullable(), status: z.enum(["draft", "published"]),
  categoryIds: z.array(z.string().uuid()), includeImages: z.array(z.string()), includeVideo: z.boolean(), copyDescriptionImages: z.boolean(),
});

/** Copies media into our storage and creates the product. */
export async function runImportAction(jobId: string, input: z.infer<typeof choiceSchema>): Promise<ActionResult<{ productId: string }>> {
  const admin = createAdminClient();
  try {
    const staff = await assertPermission("imports.create");
    await assertPermission("products.create");
    const choice = choiceSchema.parse(input);
    const { data: job } = await admin.from("import_jobs").select("normalized,status").eq("id", jobId).single();
    if (!job) return { ok: false, error: "Import not found" };
    const src = importedSchema.parse(job.normalized);
    const product = await buildProductFromImport(src, choice, await getImportPricing());
    if (!product.media?.length) return { ok: false, error: "None of the images could be downloaded. Try again, or add images by hand." };
    const r = await saveProductAction(product);
    if (!r.ok) {
      if (r.error.includes("slug")) {
        const retry = await saveProductAction({ ...product, slug: `${product.slug}-${Date.now().toString(36)}` });
        if (!retry.ok) throw new Error(retry.error);
        await admin.from("import_jobs").update({ status: "imported", product_id: retry.data!.id, error: null }).eq("id", jobId);
        return { ok: true, data: { productId: retry.data!.id } };
      }
      throw new Error(r.error);
    }
    await admin.from("import_jobs").update({ status: "imported", product_id: r.data!.id, error: null }).eq("id", jobId);
    await logAudit({ actorId: staff.userId, action: "import.product", entity: "products", entityId: r.data!.id, after: { source: src.source, url: src.sourceUrl } });
    revalidatePath("/admin/imports");
    return { ok: true, data: { productId: r.data!.id } };
  } catch (e) {
    await admin.from("import_jobs").update({ status: "failed", error: e instanceof Error ? e.message.slice(0, 500) : "failed" }).eq("id", jobId);
    return fail(e);
  }
}

export async function deleteImportJobAction(id: string): Promise<ActionResult> {
  try {
    await assertPermission("imports.delete");
    await createAdminClient().from("import_jobs").delete().eq("id", id);
    revalidatePath("/admin/imports");
    return { ok: true };
  } catch (e) { return fail(e); }
}
