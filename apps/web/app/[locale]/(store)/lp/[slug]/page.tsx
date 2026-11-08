import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { configured } from "@/lib/data/catalog";
import { Sections } from "@/components/sections/render";
import { sanitizeCss, sanitizeRich } from "@/lib/security/sanitize";
import type { SectionRow } from "@/lib/sections/registry";
import { buildMetadata } from "@/lib/seo/meta";
import { EntityCode } from "@/lib/code/inject";
import { schemaNodes, type SeoData } from "@/lib/seo/model";
import { JsonLd, graph } from "@/lib/seo/jsonld";

type Props = { params: Promise<{ locale: string; slug: string }> };
export const revalidate = 120;

async function getLanding(slug: string) {
  if (!configured()) return null;
  const { data } = await (await createClient()).from("pages").select("id,title,content_html,sections,seo,hide_chrome,custom_css,kind").eq("slug", slug).eq("kind", "landing").maybeSingle();
  return data as { id: string; title: string; content_html: string | null; sections: SectionRow[]; seo: Record<string, string>; hide_chrome: boolean; custom_css: string | null } | null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getLanding((await params).slug);
  return p ? buildMetadata({ seo: p.seo as SeoData, title: p.title, path: `/lp/${(await params).slug}` }) : {};
}

/** Product or campaign landing page built from sections and HTML, optionally without header and footer. */
export default async function Landing({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const page = await getLanding(slug);
  if (!page) notFound();
  const css = [page.hide_chrome ? ".site-header,.site-footer,.site-tabbar,.site-announce{display:none!important}main{padding-bottom:0!important}" : "", sanitizeCss(page.custom_css)].join("\n");
  return (
    <div className="pb-16">
      <EntityCode entity="landing" id={page.id} slot="head" />
      <EntityCode entity="landing" id={page.id} slot="body_start" />
      {css.trim() && <style dangerouslySetInnerHTML={{ __html: css }} />}
      {schemaNodes((page.seo as SeoData)?.schemas).length > 0 && <JsonLd data={graph(...schemaNodes((page.seo as SeoData)?.schemas))} />}
      <Sections rows={(page.sections ?? []).filter((x) => x?.type)} />
      {page.content_html?.replace(/<[^>]+>/g, "").trim() && <div className="rich container-x mt-16 max-w-3xl" dangerouslySetInnerHTML={{ __html: sanitizeRich(page.content_html) }} />}
      <EntityCode entity="landing" id={page.id} slot="footer" />
    </div>
  );
}
