import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getPage } from "@/lib/data/catalog";
import { Sections } from "@/components/sections/render";
import { buildMetadata } from "@/lib/seo/meta";
import { EntityCode } from "@/lib/code/inject";
import { schemaNodes, type SeoData } from "@/lib/seo/model";
import { JsonLd, graph } from "@/lib/seo/jsonld";
import type { SectionRow } from "@/lib/sections/registry";

type Props = { params: Promise<{ locale: string; slug: string }> };
export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getPage((await params).slug);
  return p ? buildMetadata({ seo: p.seo as SeoData, title: p.title, path: `/pages/${(await params).slug}` }) : {};
}

export default async function StaticPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const page = await getPage(slug);
  if (!page) notFound();
  const sections = ((page as unknown as { sections?: SectionRow[] }).sections ?? []).filter((x) => x && x.type);
  const ld = schemaNodes((page.seo as SeoData)?.schemas);
  const code = (slot: "head" | "body_start" | "footer") => <EntityCode entity="page" id={page.id} slot={slot} />;
  if (sections.length && !page.content_html?.replace(/<[^>]+>/g, "").trim()) return <div className="pb-8">{code("head")}{code("body_start")}{ld.length > 0 && <JsonLd data={graph(...ld)} />}<Sections rows={sections} />{code("footer")}</div>;
  return (
    <>
    {code("head")}{code("body_start")}
    {ld.length > 0 && <JsonLd data={graph(...ld)} />}
    <article className="container-x py-12 md:py-20">
      <div className="mx-auto max-w-3xl">
        <h1 className="headline text-[36px] md:text-[48px]">{page.title}</h1>
        <div className="rich mt-8" dangerouslySetInnerHTML={{ __html: page.content_html ?? "" }} />
      </div>
    </article>
    {sections.length > 0 && <Sections rows={sections} />}
    {code("footer")}
    </>
  );
}
