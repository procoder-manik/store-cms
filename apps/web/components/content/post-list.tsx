import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { configured } from "@/lib/data/catalog";
import { listPosts } from "@/lib/content/posts";
import type { PostType } from "@/lib/content/post-types";
import { getTemplates } from "@/lib/theme/templates-server";
import { cn } from "@/lib/utils";
import { PostGridCard } from "./post-view";

/** Blog archive. Layout, columns, sidebar and intro come from Admin > Design > Page templates. */
export async function PostList({ type, locale, category, page = 1 }: { type: PostType; locale: string; category?: string; page?: number }) {
  const t = await getTranslations("post");
  const tpl = (await getTemplates()).blog;
  const per = tpl.per_page;
  const supabase = configured() ? await createClient() : null;
  const [all, cats] = await Promise.all([
    listPosts(type.id, { category, limit: 200 }),
    supabase ? supabase.from("blog_categories").select("name,slug").eq("post_type", type.id).order("name").then((r) => r.data ?? []) : Promise.resolve([]),
  ]);
  const pages = Math.max(1, Math.ceil(all.length / per));
  const cur = Math.min(Math.max(1, page), pages);
  const posts = all.slice((cur - 1) * per, cur * per);
  const label = locale === "bn" && type.label_bn ? type.label_bn : type.label;
  const href = (n: number) => `/${type.path}?${new URLSearchParams({ ...(category ? { category } : {}), ...(n > 1 ? { page: String(n) } : {}) }).toString()}`.replace(/\?$/, "");
  const first = tpl.featured && cur === 1 && !category && tpl.layout !== "list" ? posts[0] : undefined;
  const rest = first ? posts.slice(1) : posts;
  const cols = tpl.columns === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3";
  const date = (d: string) => new Date(d).toLocaleDateString(locale === "bn" ? "bn-BD" : "en-GB", { dateStyle: "medium" });

  const filters = tpl.filters && cats.length > 0 && (
    <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto">
      <Link href={`/${type.path}`} className={cn("shrink-0 rounded-full px-4 py-1.5 text-[14px]", !category ? "bg-fg text-background" : "bg-fill")}>{t("all")}</Link>
      {cats.map((c) => <Link key={c.slug as string} href={`/${type.path}?category=${c.slug}`} className={cn("shrink-0 rounded-full px-4 py-1.5 text-[14px]", category === c.slug ? "bg-fg text-background" : "bg-fill")}>{c.name as string}</Link>)}
    </div>
  );

  const card = (p: (typeof posts)[number], n: number) => {
    if (tpl.layout === "list") {
      return (
        <Link key={p.id} href={`/${type.path}/${p.slug}`} className="group grid gap-4 sm:grid-cols-[240px_minmax(0,1fr)]">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] bg-accent-soft">{p.cover_url && <Image src={p.cover_url} alt="" fill sizes="240px" className="object-cover transition-transform duration-700 group-hover:scale-105" />}</div>
          <div className="self-center">
            {tpl.meta && <p className="text-[13px] text-fg-muted">{p.category ? `${p.category} · ` : ""}{date(p.published_at)}</p>}
            <h2 className="headline mt-1 text-[22px] group-hover:text-accent md:text-[26px]">{p.title}</h2>
            {tpl.excerpt && p.excerpt && <p className="mt-2 line-clamp-3 text-fg-muted">{p.excerpt}</p>}
          </div>
        </Link>
      );
    }
    if (tpl.layout === "magazine") {
      return (
        <Link key={p.id} href={`/${type.path}/${p.slug}`} className={cn("group relative block overflow-hidden rounded-[var(--radius-card)] bg-[#111]", n % 5 === 0 ? "aspect-[16/10] sm:col-span-2" : "aspect-[4/5]")}>
          {p.cover_url && <Image src={p.cover_url} alt="" fill sizes="50vw" className="object-cover opacity-90 transition-transform duration-700 group-hover:scale-105" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            {tpl.meta && p.category && <span className="glass mb-2 inline-block rounded-full px-3 py-1 text-[12px] text-fg">{p.category}</span>}
            <h2 className="headline text-[20px] md:text-[26px]">{p.title}</h2>
            {tpl.meta && <p className="mt-1 text-[13px] opacity-80">{date(p.published_at)}</p>}
          </div>
        </Link>
      );
    }
    return <PostGridCard key={p.id} p={tpl.excerpt ? p : { ...p, excerpt: null }} type={type} locale={locale} />;
  };

  const grid = (
    <div className={cn(tpl.layout === "list" ? "space-y-10" : cn("grid gap-x-6 gap-y-10 sm:grid-cols-2", cols))}>
      {first && <div className="sm:col-span-2 lg:col-span-full"><PostGridCard p={first} type={type} locale={locale} big /></div>}
      {rest.map(card)}
      {!posts.length && <p className="text-fg-muted">{t("empty")}</p>}
    </div>
  );

  return (
    <div className="container-x py-12 md:py-20">
      <h1 className="headline text-[38px] md:text-[56px]">{tpl.intro_title || label}</h1>
      {tpl.intro_text && <p className="mt-3 max-w-2xl text-[17px] text-fg-muted">{tpl.intro_text}</p>}
      {filters}
      <div className={cn("mt-10", tpl.sidebar && "grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]")}>
        <div>{grid}
          {pages > 1 && (
            <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-2">
              {cur > 1 && <Link href={href(cur - 1)} className="h-10 rounded-full bg-fill px-4 leading-10 text-[14px]">{t("previous")}</Link>}
              <span className="px-3 text-[14px] text-fg-muted">{cur} / {pages}</span>
              {cur < pages && <Link href={href(cur + 1)} className="h-10 rounded-full bg-fill px-4 leading-10 text-[14px]">{t("next")}</Link>}
            </nav>
          )}
        </div>
        {tpl.sidebar && (
          <aside className="space-y-6">
            <section className="rounded-[var(--radius-card)] bg-surface p-5 shadow-card">
              <h3 className="text-[15px] font-semibold">{t("topics")}</h3>
              <ul className="mt-3 space-y-1.5 text-[14px]">{cats.map((c) => <li key={c.slug as string}><Link href={`/${type.path}?category=${c.slug}`} className="text-fg-muted hover:text-accent">{c.name as string}</Link></li>)}</ul>
            </section>
            <section className="rounded-[var(--radius-card)] bg-surface p-5 shadow-card">
              <h3 className="text-[15px] font-semibold">{t("latest")}</h3>
              <ul className="mt-3 space-y-3">{all.slice(0, 5).map((p) => <li key={p.id}><Link href={`/${type.path}/${p.slug}`} className="line-clamp-2 text-[14px] hover:text-accent">{p.title}</Link><p className="text-[12px] text-fg-subtle">{date(p.published_at)}</p></li>)}</ul>
            </section>
          </aside>
        )}
      </div>
    </div>
  );
}
