import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function loadPage(id: string, kind: "page" | "landing") {
  if (id === "new") return { code: null, initial: { kind, title: "", slug: "", content_html: "", is_published: kind === "page", seo: {}, hide_chrome: kind === "landing", product_id: null, custom_css: "" }, productTitle: null };
  const { data } = await createAdminClient().from("pages").select("*, products(title)").eq("id", id).maybeSingle();
  if (!data) return null;
  const { data: code } = await createAdminClient().from("custom_code").select("head,body_start,footer").eq("entity", kind === "landing" ? "landing" : "page").eq("entity_id", data.id as string).maybeSingle();
  return {
    code,
    initial: { id: data.id, kind: (data.kind ?? "page") as "page", title: data.title, slug: data.slug, content_html: data.content_html ?? "", is_published: data.is_published, seo: data.seo ?? {},
      hide_chrome: !!data.hide_chrome, product_id: data.product_id ?? null, custom_css: data.custom_css ?? "" },
    productTitle: (data.products as { title: string } | null)?.title ?? null,
  };
}

