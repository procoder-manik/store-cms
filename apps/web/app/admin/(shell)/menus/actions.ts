"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPermission } from "@/lib/auth/rbac";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "@/lib/actions/result";

const url = z.string().trim().max(500).refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//.test(v) || v.startsWith("#") || /^(mailto|tel):/.test(v), "Links start with /, https://, mailto: or tel:");
const item: z.ZodType<{ label: string; label_bn?: string; url: string; new_tab?: boolean; children?: unknown[] }> = z.lazy(() => z.object({
  label: z.string().trim().min(1).max(60), label_bn: z.string().trim().max(60).optional(), url, new_tab: z.boolean().optional(), children: z.array(item).max(20).optional(),
}));

export async function saveMenuAction(key: string, items: unknown): Promise<ActionResult> {
  try {
    const staff = await assertPermission("content.update");
    if (!["header", "footer_help", "footer_company"].includes(key)) return { ok: false, error: "Unknown menu" };
    const parsed = z.array(item).max(30).parse(items);
    await createAdminClient().from("menus").upsert({ key, items: parsed });
    await logAudit({ actorId: staff.userId, action: "menu.save", entity: "menus", entityId: key });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof z.ZodError ? e.issues[0]?.message ?? "Invalid" : e instanceof Error ? e.message : "Failed" }; }
}

export async function menuLinkOptionsAction() {
  await assertPermission("content.view");
  const admin = createAdminClient();
  const [pages, cats, types] = await Promise.all([
    admin.from("pages").select("title,slug,kind").eq("is_published", true).order("title").limit(100),
    admin.from("categories").select("name,slug").eq("is_active", true).order("name").limit(100),
    admin.from("settings").select("value").eq("key", "post_types").maybeSingle(),
  ]);
  const postTypes = ((types.data?.value as { types?: { label: string; path: string }[] })?.types ?? [{ label: "Blog", path: "blog" }]);
  return [
    { label: "Home", url: "/" }, { label: "Shop", url: "/shop" }, { label: "Deals", url: "/deals" }, { label: "All categories", url: "/categories" }, { label: "Contact", url: "/contact" }, { label: "FAQ", url: "/faq" },
    { label: "Track order", url: "/track-order" }, { label: "Catalog", url: "/catalog" },
    ...postTypes.map((t) => ({ label: t.label, url: `/${t.path}` })),
    ...(cats.data ?? []).map((c) => ({ label: `Category: ${c.name}`, url: `/category/${c.slug}` })),
    ...(pages.data ?? []).map((p) => ({ label: `${p.kind === "landing" ? "Landing" : "Page"}: ${p.title}`, url: `${p.kind === "landing" ? "/lp" : "/pages"}/${p.slug}` })),
  ];
}
