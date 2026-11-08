import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCategoryBySlug } from "@/lib/data/catalog";
import { Listing, type SearchParams } from "@/components/store/listing/listing";
import { JsonLd, breadcrumb, graph } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/meta";
import { EntityCode } from "@/lib/code/inject";
import { schemaNodes, type SeoData } from "@/lib/seo/model";

type Props = { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const r = await getCategoryBySlug(slug);
  if (!r) return {};
  const c = r.category;
  return buildMetadata({ seo: c.seo as SeoData, title: locale === "bn" && c.nameBn ? c.nameBn : c.name, description: c.description, image: c.imageUrl, path: `/category/${c.slug}` });
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const r = await getCategoryBySlug(slug);
  if (!r) notFound();
  const t = await getTranslations("product");
  const name = (c: { name: string; nameBn: string | null }) => (locale === "bn" && c.nameBn ? c.nameBn : c.name);
  const crumbs = [{ name: t("home"), url: "/" }, ...(r.parent ? [{ name: r.parent.name, url: `/category/${r.parent.slug}` }] : []), { name: r.category.name, url: `/category/${r.category.slug}` }];
  return (
    <>
      <EntityCode entity="category" id={r.category.id} slot="head" />
      <EntityCode entity="category" id={r.category.id} slot="body_start" />
      <JsonLd data={graph(breadcrumb(crumbs), { "@type": "CollectionPage", name: r.category.name, url: crumbs.at(-1)!.url }, ...schemaNodes((r.category.seo as SeoData).schemas))} />
      <Listing base={`/category/${slug}`} sp={await searchParams} extra={{ categoryIds: r.ids }} header={
        <div>
          <h1 className="headline text-[34px] md:text-[44px]">{name(r.category)}</h1>
          {r.category.description && <p className="mt-2 max-w-2xl text-fg-muted">{r.category.description}</p>}
          {r.children.length > 0 && (
            <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto">
              {r.children.map((c) => <Link key={c.id} href={`/category/${c.slug}`} className="shrink-0 rounded-full bg-surface px-4 py-2 text-[14px] shadow-card">{name(c)}</Link>)}
            </div>
          )}
        </div>
      } />
      <EntityCode entity="category" id={r.category.id} slot="footer" />
    </>
  );
}
