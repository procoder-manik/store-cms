import { getTranslations, setRequestLocale } from "next-intl/server";
import { Listing, type SearchParams } from "@/components/store/listing/listing";
import { createClient } from "@/lib/supabase/server";
import { configured } from "@/lib/data/catalog";

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const t = await getTranslations("shop");
  const sp = await searchParams;
  // Filtered views stay out of search results; the main shop page is the one to index
  return { title: t("title"), alternates: { canonical: "/shop" }, ...(sp.brand || sp.tag ? { robots: { index: false, follow: true } } : {}) };
}

/** /shop, optionally filtered with ?brand=slug or ?tag=slug. */
export default async function ShopPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("shop");
  const sp = await searchParams;
  let title = t("title");
  const extra: { brandId?: string; tagId?: string } = {};
  if (configured() && (sp.brand || sp.tag)) {
    const supabase = await createClient();
    if (sp.brand) { const { data } = await supabase.from("brands").select("id,name").eq("slug", sp.brand).eq("is_active", true).maybeSingle(); if (data) { extra.brandId = data.id as string; title = data.name as string; } }
    if (sp.tag) { const { data } = await supabase.from("tags").select("id,name").eq("slug", sp.tag).maybeSingle(); if (data) { extra.tagId = data.id as string; title = `#${data.name}`; } }
  }
  return <Listing base="/shop" sp={sp} extra={extra} header={<h1 className="headline text-[34px] md:text-[44px]">{title}</h1>} />;
}
