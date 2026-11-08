import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProductBySlug, getQuestions, getRelated, getReviews } from "@/lib/data/catalog";
import { ProductHero } from "@/components/store/product/buy-box";
import { Reviews } from "@/components/store/product/reviews";
import { RecentlyViewed } from "@/components/store/product/recently-viewed";
import { ProductCard } from "@/components/store/product-card";
import { JsonLd, breadcrumb, graph } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/meta";
import { EntityCode } from "@/lib/code/inject";
import { getTemplates } from "@/lib/theme/templates-server";
import { ProductInfo } from "@/components/store/product/product-info";
import { ShareButtons } from "@/components/store/share-buttons";
import { ShieldCheck, Truck, RotateCcw, Banknote } from "lucide-react";
import { schemaNodes, type SeoData } from "@/lib/seo/model";
import { stripTags } from "@/lib/security/sanitize";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 60;

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(decodeURIComponent(slug));
  if (!p) return {};
  return buildMetadata({
    seo: p.seo as SeoData, title: p.title, description: p.shortDescription || stripTags(p.descriptionHtml).slice(0, 160), image: p.media.find((m) => m.type === "image")?.url,
    path: `/product/${p.slug}`, type: "product", languages: { en: `/product/${p.slug}`, bn: `/bn/product/${p.slug}` },
  });
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const p = await getProductBySlug(decodeURIComponent(slug));
  if (!p) notFound();
  const t = await getTranslations("product");
  const ts = await getTranslations("share");
  const tpl = (await getTemplates()).product;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const [reviews, questions, related, wish] = await Promise.all([
    getReviews(p.id), getQuestions(p.id), getRelated(p, 8),
    auth.user ? supabase.from("wishlists").select("product_id").eq("user_id", auth.user.id).eq("product_id", p.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const cat = p.categories[0];
  const crumbs = [{ name: t("home"), url: "/" }, ...(cat ? [{ name: cat.name, url: `/category/${cat.slug}` }] : []), { name: p.title, url: `/product/${p.slug}` }];

  const prices = p.variants.length ? p.variants.map((v) => v.price) : [p.price];
  const available = !p.trackInventory || p.allowBackorder || p.stock > 0;
  const productLd = {
    "@type": "Product", "@id": absoluteUrl(`/product/${p.slug}#product`), name: p.title,
    description: p.seo.description || p.shortDescription || stripTags(p.descriptionHtml).slice(0, 500),
    image: p.media.filter((m) => m.type === "image").map((m) => m.url).slice(0, 8), sku: p.sku ?? undefined,
    brand: { "@type": "Brand", name: process.env.NEXT_PUBLIC_SITE_NAME ?? "Lumen" },
    offers: {
      "@type": "AggregateOffer", priceCurrency: "BDT", lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: prices.length,
      availability: available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: absoluteUrl(`/product/${p.slug}`),
    },
    ...(p.ratingCount > 0 && {
      aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating, reviewCount: p.ratingCount },
      review: reviews.slice(0, 5).map((r) => ({ "@type": "Review", reviewRating: { "@type": "Rating", ratingValue: r.rating }, author: { "@type": "Person", name: r.profiles?.full_name ?? "Customer" }, reviewBody: r.body ?? undefined })),
    }),
  };

  return (
    <>
      <EntityCode entity="product" id={p.id} slot="head" />
      <EntityCode entity="product" id={p.id} slot="body_start" />
      <JsonLd data={graph(breadcrumb(crumbs), productLd, ...schemaNodes((p.seo as SeoData).schemas))} />
      <div className="container-x pb-28 pt-4 md:pb-0 md:pt-8">
        {tpl.breadcrumb && (
          <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1 overflow-hidden text-[13px] text-fg-muted">
            {crumbs.slice(0, -1).map((c) => (
              <span key={c.url} className="flex shrink-0 items-center gap-1"><Link href={c.url} className="hover:text-fg">{c.name}</Link><ChevronRight className="h-3.5 w-3.5" /></span>
            ))}
            <span className="truncate text-fg">{p.title}</span>
          </nav>
        )}
        <Suspense><ProductHero product={p} wished={!!wish.data} thumbs={tpl.gallery === "thumbs-left" ? "left" : "bottom"} stickyBar={tpl.sticky_bar} /></Suspense>

        {tpl.trust && (
          <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[[Banknote, ts("trust1")], [RotateCcw, ts("trust2")], [ShieldCheck, ts("trust3")], [Truck, ts("trust4")]].map(([Icon, label], n) => {
              const I = Icon as typeof Truck;
              return <li key={n} className="flex items-center gap-3 rounded-[var(--radius-card)] bg-surface px-4 py-3 text-[14px] shadow-card"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent"><I className="h-4 w-4" /></span>{label as string}</li>;
            })}
          </ul>
        )}
        {tpl.share && <ShareButtons title={p.title} className="mt-6" />}

        {(() => {
          const description = p.descriptionHtml ? <div className="rich" dangerouslySetInnerHTML={{ __html: p.descriptionHtml }} /> : null;
          const specs = tpl.specs && p.specs.length > 0 ? (
            <dl className="overflow-hidden rounded-[18px] bg-surface shadow-card">
              {p.specs.map((sp) => (
                <div key={sp.label} className="grid grid-cols-[40%_minmax(0,1fr)] gap-3 border-b border-line px-4 py-3 text-[14px] last:border-0"><dt className="text-fg-muted">{sp.label}</dt><dd>{sp.value}</dd></div>
              ))}
            </dl>
          ) : null;
          const reviewsNode = tpl.reviews ? <Reviews productId={p.id} slug={p.slug} rating={p.rating} count={p.ratingCount} reviews={reviews} questions={questions} /> : null;
          if (tpl.info === "stacked") {
            return (
              <>
                <div className="mt-16 grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
                  {description && <section><h2 className="headline text-[26px]">{t("description")}</h2><div className="mt-4">{description}</div></section>}
                  {specs && <section><h2 className="headline text-[26px]">{t("specs")}</h2><div className="mt-4">{specs}</div></section>}
                </div>
                {reviewsNode && <section className="mt-16">{reviewsNode}</section>}
              </>
            );
          }
          const tabs = [
            description && { id: "d", label: t("description"), node: description }, specs && { id: "s", label: t("specs"), node: specs },
            reviewsNode && { id: "r", label: `${t("reviews")} (${p.ratingCount})`, node: reviewsNode },
          ].filter(Boolean) as { id: string; label: string; node: React.ReactNode }[];
          return <section className="mt-16"><ProductInfo mode={tpl.info} tabs={tabs} /></section>;
        })()}

        {tpl.related && related.length > 0 && (
          <section className="mt-20">
            <h2 className="headline text-[26px]">{t("related")}</h2>
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
              {related.map((r) => <ProductCard key={r.id} product={r} />)}
            </div>
          </section>
        )}
      </div>
      {tpl.recent && <RecentlyViewed currentId={p.id} />}
      <EntityCode entity="product" id={p.id} slot="footer" />
    </>
  );
}
