import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { listProducts } from "@/lib/data/catalog";
import { ProductCard } from "@/components/store/product-card";

export const dynamic = "force-dynamic";

export default async function WishlistPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data } = await supabase.from("wishlists").select("product_id").eq("user_id", auth.user!.id).order("created_at", { ascending: false }).limit(60);
  const ids = (data ?? []).map((w) => w.product_id as string);
  const { items } = ids.length ? await listProducts({ ids, pageSize: 60 }) : { items: [] };
  return (
    <div>
      <h1 className="headline text-[32px]">{t("account.wishlist")}</h1>
      {items.length ? (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      ) : <p className="mt-6 text-fg-muted">{t("misc.wishlistEmpty")}</p>}
    </div>
  );
}
