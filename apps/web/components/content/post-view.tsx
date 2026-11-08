import Image from "next/image";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ProductCard } from "@/components/store/product-card";
import { Sections } from "@/components/sections/render";
import { listProducts } from "@/lib/data/catalog";
import { withToc, type PostCard } from "@/lib/content/posts";
import type { PostType } from "@/lib/content/post-types";
import type { SectionRow } from "@/lib/sections/registry";
import { JsonLd, breadcrumb, graph } from "@/lib/seo/jsonld";
import { schemaNodes, type SeoData } from "@/lib/seo/model";
import { EntityCode } from "@/lib/code/inject";
import { absoluteUrl, cn } from "@/lib/utils";
import { ReadingProgress, Toc } from "./post-client";
import { getTemplates } from "@/lib/theme/templates-server";
import { ShareButtons } from "@/components/store/share-buttons";

const date = (d: string, locale: string) => new Date(d).toLocaleDateString(locale === "bn" ? "bn-BD" : "en-GB", { dateStyle: "long" });

export function PostGridCard({ p, type, locale, big }: { p: PostCard; type: PostType; locale: string; big?: boolean }) {
  return (
    <Link href={`/${type.path}/${p.slug}`} className={cn("group block", big && "sm:col-span-2 lg:col-span-3")}>
      <div className={cn("relative overflow-hidden rounded-[var(--radius-card)] bg-accent-soft", big ? "aspect-[21/9] min-h-[220px]" : "aspect-[4/3]")}>
        {p.cover_url && <Image src={p.cover_url} alt="" fill sizes={big ? "100vw" : "33vw"} className="object-cover transition-transform duration-700 group-hover:scale-105" />}
        {p.category && <span className="glass absolute left-3 top-3 rounded-full px-3 py-1 text-[12px] font-medium">{p.category}</span>}
      </div>
      <p className="mt-3 text-[13px] text-fg-muted">{date(p.published_at, locale)}</p>
      <h2 className={cn("headline mt-1 group-hover:text-accent", big ? "text-[28px] md:text-[38px]" : "text-[20px]")}>{p.title}</h2>
      {p.excerpt && <p className="mt-2 line-clamp-2 text-fg-muted">{p.excerpt}</p>}
    </Link>
  );
}

/** Article page: hero, sticky contents, reading progress, products, next and previous, related. Layout follows the post type. */
export async function PostView({ type, post, prev, next, related, locale }: {
  type: PostType; post: Record<string, unknown>; prev: { slug: string; title: string } | null; next: { slug: string; title: string } | null; related: PostCard[]; locale: string;
}) {
  const t = await getTranslations("post");
  const tp = await getTranslations("product");
  const tpl = (await getTemplates()).post;
  const { html, toc } = withToc(String(post.content_html ?? ""));
  const words = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  const productIds = (post.related_product_ids as string[]) ?? [];
  const products = productIds.length ? (await listProducts({ ids: productIds, pageSize: productIds.length })).items : [];
  const cat = post.blog_categories as { name: string; slug: string } | null;
  const author = (post.profiles as { full_name: string | null } | null)?.full_name ?? process.env.NEXT_PUBLIC_SITE_NAME ?? "";
  const cover = post.cover_url as string | null;
  const layout = type.layout ?? "classic";
  const showToc = tpl.toc && post.show_toc !== false && toc.length > 1;
  const sections = ((post.sections as SectionRow[]) ?? []).filter((x) => x?.type);
  const meta = (
    <p className={cn("mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px]", layout === "magazine" ? "text-white/80" : "text-fg-muted")}>
      <span>{author}</span><span>·</span><span>{date(String(post.published_at), locale)}</span><span>·</span><span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{t("minutes", { n: minutes })}</span>
    </p>
  );

  return (
    <article>
      <EntityCode entity="post" id={String(post.id)} slot="head" />
      <EntityCode entity="post" id={String(post.id)} slot="body_start" />
      {tpl.progress && <ReadingProgress />}
      <JsonLd data={graph(
        breadcrumb([{ name: tp("home"), url: "/" }, { name: type.label, url: `/${type.path}` }, { name: String(post.title), url: `/${type.path}/${post.slug}` }]),
        { "@type": type.id === "news" ? "NewsArticle" : "BlogPosting", headline: post.title, description: post.excerpt ?? undefined, image: cover ? [cover] : undefined,
          datePublished: post.published_at, dateModified: post.updated_at, author: { "@type": "Person", name: author }, publisher: { "@id": absoluteUrl("/#org") }, mainEntityOfPage: absoluteUrl(`/${type.path}/${post.slug}`), wordCount: words },
        ...schemaNodes((post.seo as SeoData | undefined)?.schemas),
      )} />

      {layout === "magazine" ? (
        <header className="container-x pt-4 md:pt-6">
          <div className="relative flex min-h-[420px] items-end overflow-hidden rounded-[var(--radius-sheet)] bg-[#0b0b0f] md:min-h-[540px]">
            {cover && <Image src={cover} alt="" fill priority sizes="100vw" className="object-cover opacity-80" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            <div className="relative max-w-3xl p-6 text-white md:p-12">
              {cat && <Link href={`/${type.path}?category=${cat.slug}`} className="glass inline-block rounded-full px-3 py-1 text-[13px] text-fg">{cat.name}</Link>}
              <h1 className="headline fade-up mt-4 text-[34px] md:text-[56px]">{String(post.title)}</h1>
              {meta}
            </div>
          </div>
        </header>
      ) : (
        <header className={cn("container-x pt-10 md:pt-16", layout === "minimal" && "max-w-3xl")}>
          <Link href={`/${type.path}`} className="text-[14px] text-accent">{type.label}{cat ? ` · ${cat.name}` : ""}</Link>
          <h1 className="headline fade-up mt-3 max-w-4xl text-[34px] md:text-[54px]">{String(post.title)}</h1>
          {post.excerpt ? <p className="mt-4 max-w-2xl text-[18px] text-fg-muted">{String(post.excerpt)}</p> : null}
          {meta}
          {cover && layout === "classic" && <div className="relative mt-8 aspect-[16/8] overflow-hidden rounded-[var(--radius-sheet)] bg-fill"><Image src={cover} alt="" fill priority sizes="100vw" className="object-cover" /></div>}
        </header>
      )}

      <div className={cn("container-x mt-10 grid gap-10", showToc && "lg:grid-cols-[260px_minmax(0,1fr)]", layout === "minimal" && !showToc && "max-w-3xl")}>
        {showToc && <aside className="order-first"><Toc items={toc} title={t("contents")} /></aside>}
        <div id="post-body" className="min-w-0">
          <div className="rich mx-auto max-w-[72ch] text-[17px] leading-[1.8] [&_h2]:scroll-mt-24 [&_h3]:scroll-mt-24" dangerouslySetInnerHTML={{ __html: html }} />
          {tpl.share && <div className="mx-auto mt-8 max-w-[72ch]"><ShareButtons title={String(post.title)} /></div>}
          {tpl.author && author && (
            <div className="mx-auto mt-8 flex max-w-[72ch] items-center gap-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-card">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[18px] font-semibold text-accent">{author.charAt(0)}</span>
              <div><p className="text-[12px] text-fg-muted">{t("by")}</p><p className="font-medium">{author}</p></div>
            </div>
          )}
          {tpl.tags && ((post.tags as string[]) ?? []).length > 0 && (
            <div className="mx-auto mt-8 flex max-w-[72ch] flex-wrap gap-2">{(post.tags as string[]).map((tag) => <span key={tag} className="rounded-full bg-fill px-3 py-1 text-[13px] text-fg-muted">#{tag}</span>)}</div>
          )}
        </div>
      </div>

      {sections.length > 0 && <Sections rows={sections} />}

      {tpl.products && products.length > 0 && (
        <section className="container-x mt-16">
          <h2 className="headline text-[26px] md:text-[32px]">{t("products")}</h2>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      )}

      {tpl.prev_next && (prev || next) && (
        <nav className="container-x mt-16 grid gap-3 sm:grid-cols-2" aria-label={t("more")}>
          {prev ? <Link href={`/${type.path}/${prev.slug}`} className="group rounded-[var(--radius-card)] bg-surface p-5 shadow-card"><span className="flex items-center gap-1 text-[13px] text-fg-muted"><ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />{t("previous")}</span><span className="mt-1 line-clamp-2 block font-medium">{prev.title}</span></Link> : <span />}
          {next && <Link href={`/${type.path}/${next.slug}`} className="group rounded-[var(--radius-card)] bg-surface p-5 text-right shadow-card"><span className="flex items-center justify-end gap-1 text-[13px] text-fg-muted">{t("next")}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span><span className="mt-1 line-clamp-2 block font-medium">{next.title}</span></Link>}
        </nav>
      )}

      {tpl.related && related.length > 0 && (
        <section className="container-x mt-16">
          <h2 className="headline text-[26px] md:text-[32px]">{t("related")}</h2>
          <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">{related.map((p) => <PostGridCard key={p.id} p={p} type={type} locale={locale} />)}</div>
        </section>
      )}
      <EntityCode entity="post" id={String(post.id)} slot="footer" />
    </article>
  );
}
