import Image from "next/image";
import { Banknote, Clock, Gift, MessageCircle, RotateCcw, ShieldCheck, Star, Truck, ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonClass } from "@/components/ui/button";
import { ProductCard } from "@/components/store/product-card";
import { Countdown } from "@/components/store/home/countdown";
import { cn } from "@/lib/utils";
import type { CategoryData, ProductCardData } from "@/lib/data/catalog";
import type { CardId } from "@/lib/theme/presets";
import { Carousel } from "./carousel";

type C = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" ? v : "");
const items = (c: C) => (Array.isArray(c.items) ? c.items : []) as Record<string, string>[];

export function SectionHead({ title, subtitle, href, more, center }: { title?: string | null; subtitle?: string | null; href?: string; more?: string; center?: boolean }) {
  if (!title && !subtitle) return null;
  return (
    <div className={cn("mb-6 flex items-end justify-between gap-4", center && "flex-col items-center text-center")}>
      <div>
        {title && <h2 className="headline text-[26px] md:text-[36px]">{title}</h2>}
        {subtitle && <p className="mt-1.5 max-w-xl text-[15px] text-fg-muted">{subtitle}</p>}
      </div>
      {href && more && <Link href={href} className="shrink-0 text-[15px] text-accent hover:underline">{more}</Link>}
    </div>
  );
}

const Wrap = ({ children, className }: { children: React.ReactNode; className?: string }) => <section className={cn("container-x mt-16 md:mt-24", className)}>{children}</section>;

export function CategoriesBlock({ c, title, cats, locale }: { c: C; title: string | null; cats: CategoryData[]; locale: string }) {
  if (!cats.length) return null;
  const name = (x: CategoryData) => (locale === "bn" && x.nameBn ? x.nameBn : x.name);
  const v = s(c.variant) || "tiles";
  const head = <SectionHead title={title} subtitle={s(c.subtitle)} />;
  if (v === "circles") {
    return <Wrap>{head}<div className="no-scrollbar flex gap-5 overflow-x-auto pb-2 md:justify-center">{cats.map((x) => (
      <Link key={x.id} href={`/category/${x.slug}`} className="group w-24 shrink-0 text-center md:w-28">
        <span className="relative mx-auto block aspect-square w-full overflow-hidden rounded-full bg-accent-soft ring-2 ring-transparent transition group-hover:ring-accent">
          {x.imageUrl && <Image src={x.imageUrl} alt="" fill sizes="112px" className="object-cover transition-transform duration-500 group-hover:scale-110" />}
        </span>
        <span className="mt-2 block text-[13px] font-medium">{name(x)}</span>
      </Link>))}</div></Wrap>;
  }
  if (v === "carousel") {
    return <Wrap>{head}<div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-2">{cats.map((x) => (
      <Link key={x.id} href={`/category/${x.slug}`} className="flex shrink-0 items-center gap-2.5 rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-4 text-[14px] font-medium transition hover:border-accent hover:text-accent">
        <span className="relative h-9 w-9 overflow-hidden rounded-full bg-accent-soft">{x.imageUrl && <Image src={x.imageUrl} alt="" fill sizes="36px" className="object-cover" />}</span>{name(x)}
      </Link>))}</div></Wrap>;
  }
  if (v === "bento") {
    return <Wrap>{head}<div className="grid auto-rows-[160px] grid-cols-2 gap-3 md:auto-rows-[200px] md:grid-cols-4">{cats.slice(0, 5).map((x, n) => (
      <Link key={x.id} href={`/category/${x.slug}`} className={cn("group relative overflow-hidden rounded-[var(--radius-card)] bg-accent-soft", n === 0 && "col-span-2 row-span-2", n === 4 && "col-span-2")}>
        {x.imageUrl && <Image src={x.imageUrl} alt="" fill sizes="50vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
        <span className={cn("headline absolute bottom-4 left-4 text-white", n === 0 ? "text-[28px]" : "text-[18px]")}>{name(x)}</span>
      </Link>))}</div></Wrap>;
  }
  return <Wrap>{head}<ul className="no-scrollbar flex snap-x gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible lg:grid-cols-8">{cats.map((x) => (
    <li key={x.id} className="snap-start">
      <Link href={`/category/${x.slug}`} className="group relative flex h-32 w-32 flex-col justify-end overflow-hidden rounded-[var(--radius-card)] bg-surface p-3 text-[14px] font-medium shadow-card transition-transform active:scale-[0.97] md:w-auto">
        {x.imageUrl && <span className="absolute right-2 top-2 h-16 w-16 overflow-hidden rounded-[calc(var(--radius-card)-8px)]"><Image src={x.imageUrl} alt="" fill sizes="64px" className="object-cover transition-transform duration-500 group-hover:scale-110" /></span>}
        <span className="relative">{name(x)}</span>
      </Link>
    </li>))}</ul></Wrap>;
}

export function ProductsBlock({ c, title, products, more }: { c: C; title: string | null; products: ProductCardData[]; more: string }) {
  if (!products.length) return null;
  const v = s(c.variant) || "grid";
  const card = (s(c.card) || undefined) as CardId | undefined;
  const href = s(c.view_all_url) || (s(c.source) === "on_sale" ? "/deals" : s(c.source) === "best_selling" ? "/shop?sort=popular" : "/shop");
  const head = <SectionHead title={title} subtitle={s(c.subtitle)} href={href} more={more} />;
  if (v === "carousel") return <Wrap>{head}<Carousel>{products.map((p) => <ProductCard key={p.id} product={p} variant={card} />)}</Carousel></Wrap>;
  if (v === "spotlight") {
    const [first, ...rest] = products;
    return <Wrap>{head}<div className="grid gap-4 md:grid-cols-2">
      <div className="[&_article]:h-full">{first && <ProductCard product={first} variant={card ?? "overlay"} priority />}</div>
      <div className="grid grid-cols-2 gap-4">{rest.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} variant={card} />)}</div>
    </div></Wrap>;
  }
  return <Wrap>{head}<div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">{products.map((p, i) => <ProductCard key={p.id} product={p} variant={card} priority={i < 2} />)}</div></Wrap>;
}

export function BannerBlock({ c }: { c: C }) {
  const list = items(c);
  const v = s(c.variant) || "duo";
  if (v === "strip") {
    const first = list[0] ?? {};
    return (
      <section className="mt-12">
        <Link href={first.url || "/shop"} className="block overflow-hidden bg-accent py-3 text-accent-contrast">
          <div className="marquee flex w-max gap-12 whitespace-nowrap text-[15px] font-medium">
            {Array.from({ length: 8 }).map((_, n) => <span key={n}>{first.title || "Free delivery"} ✦</span>)}
          </div>
        </Link>
        {s(c.ends_at) && <div className="container-x mt-3 flex justify-center"><Countdown to={s(c.ends_at)} /></div>}
      </section>
    );
  }
  if (!list.length) return null;
  const cols = v === "single" ? "grid-cols-1" : v === "trio" ? "md:grid-cols-3" : "md:grid-cols-2";
  return (
    <Wrap className={c.width === "full" && v === "single" ? "hero-full [&_a]:!rounded-none" : undefined}><div className={cn("grid gap-4", cols)}>{list.slice(0, v === "single" ? 1 : v === "trio" ? 3 : 2).map((b, n) => (
      <Link key={n} href={b.url || "/shop"} className={cn("group relative block overflow-hidden rounded-[var(--radius-sheet)] bg-accent-soft", v === "single" ? "aspect-[16/7] min-h-[220px]" : "aspect-[4/3]")}>
        {b.image && <Image src={b.image} alt={b.title ?? ""} fill sizes={v === "single" ? "100vw" : "50vw"} className="object-cover transition-transform duration-700 group-hover:scale-105" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-8">
          {b.title && <p className="headline text-[26px] md:text-[34px]">{b.title}</p>}
          {b.subtitle && <p className="mt-1 text-[15px] opacity-90">{b.subtitle}</p>}
          {b.cta_label && <span className={cn(buttonClass("primary", "md"), "mt-4 !bg-white !text-black")}>{b.cta_label}</span>}
        </div>
      </Link>))}</div></Wrap>
  );
}

export function CountdownBlock({ c, title }: { c: C; title: string | null }) {
  const ends = s(c.ends_at) || new Date(Date.now() + 3 * 86400000).toISOString();
  return (
    <Wrap>
      <div className="relative overflow-hidden rounded-[var(--radius-sheet)] bg-[#0b0b0f] px-6 py-14 text-center text-white md:py-20">
        {s(c.image) && <Image src={s(c.image)} alt="" fill sizes="100vw" className="object-cover opacity-40" />}
        <div aria-hidden className="absolute left-1/2 top-0 h-64 w-[70%] -translate-x-1/2 rounded-full bg-accent/40 blur-3xl" />
        <div className="relative">
          <h2 className="headline text-[32px] md:text-[52px]">{title || s(c.title) || "Sale ends soon"}</h2>
          {s(c.subtitle) && <p className="mx-auto mt-3 max-w-lg text-[16px] text-white/75">{s(c.subtitle)}</p>}
          <div className="mt-8 flex justify-center text-[20px] [&_span_span]:bg-white [&_span_span]:px-3 [&_span_span]:py-2 [&_span_span]:text-[22px] [&_span_span]:text-black"><Countdown to={ends} /></div>
          {s(c.cta_label) && <Link href={s(c.cta_url) || "/deals"} className={cn(buttonClass("primary", "lg"), "mt-8")}>{s(c.cta_label)}</Link>}
        </div>
      </div>
    </Wrap>
  );
}

const ICONS: Record<string, typeof Truck> = { truck: Truck, cash: Banknote, return: RotateCcw, shield: ShieldCheck, clock: Clock, gift: Gift, chat: MessageCircle, star: Star };
export function FeaturesBlock({ c, defaults }: { c: C; defaults: { icon: string; title: string; text: string }[] }) {
  const list = items(c).length ? items(c) : defaults;
  const v = s(c.variant) || "row";
  if (v === "cards") {
    return <Wrap><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{list.map((f, n) => { const Icon = ICONS[f.icon ?? ""] ?? Star; return (
      <div key={n} className="rounded-[var(--radius-card)] bg-surface p-5 shadow-card"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent"><Icon className="h-5 w-5" /></span>
        <p className="mt-4 text-[15px] font-semibold">{f.title}</p><p className="mt-1 text-[13px] text-fg-muted">{f.text}</p></div>); })}</div></Wrap>;
  }
  return (
    <Wrap className="md:mt-12"><div className="relative overflow-hidden rounded-[var(--radius-sheet)] bg-surface shadow-card">
      <div aria-hidden className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-accent/25 blur-3xl" />
      <div aria-hidden className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-sale/15 blur-3xl" />
      <div className="relative grid gap-3 p-4 sm:grid-cols-3 md:p-6">{list.slice(0, 3).map((f, n) => { const Icon = ICONS[f.icon ?? ""] ?? Star; return (
        <div key={n} className="glass flex items-start gap-3 rounded-[var(--radius-card)] p-4"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" /><div><p className="text-[15px] font-semibold">{f.title}</p><p className="text-[13px] text-fg-muted">{f.text}</p></div></div>); })}</div>
    </div></Wrap>
  );
}

export function ImageTextBlock({ c, title }: { c: C; title: string | null }) {
  const right = s(c.variant) === "right";
  return (
    <Wrap><div className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
      <div className={cn("relative aspect-[4/3] overflow-hidden rounded-[var(--radius-sheet)] bg-accent-soft", right && "md:order-2")}>{s(c.image) && <Image src={s(c.image)} alt="" fill sizes="50vw" className="object-cover" />}</div>
      <div>
        {(title || s(c.title)) && <h2 className="headline text-[30px] md:text-[44px]">{title || s(c.title)}</h2>}
        {s(c.text) && <p className="mt-4 text-[17px] leading-relaxed text-fg-muted">{s(c.text)}</p>}
        {s(c.cta_label) && <Link href={s(c.cta_url) || "/shop"} className={cn(buttonClass("primary", "lg"), "mt-7")}>{s(c.cta_label)}</Link>}
      </div>
    </div></Wrap>
  );
}

export function TestimonialsBlock({ c, title, quotes }: { c: C; title: string | null; quotes: { name: string; text: string; avatar?: string; rating?: number }[] }) {
  const list = items(c).length ? items(c).map((q) => ({ name: q.name ?? "", text: q.text ?? "", avatar: q.avatar, rating: 5 })) : quotes;
  if (!list.length) return null;
  if (s(c.variant) === "quote") {
    const q = list[0]!;
    return <Wrap><div className="mx-auto max-w-3xl text-center">{title && <p className="text-[14px] font-medium text-accent">{title}</p>}
      <p className="headline mt-4 text-[26px] leading-snug md:text-[38px]">&ldquo;{q.text}&rdquo;</p><p className="mt-5 text-[15px] text-fg-muted">{q.name}</p></div></Wrap>;
  }
  return <Wrap><SectionHead title={title} /><Carousel itemClass="w-[85%] sm:w-[48%] lg:w-[32%]">{list.map((q, n) => (
    <figure key={n} className="h-full rounded-[var(--radius-card)] bg-surface p-6 shadow-card">
      <div className="flex text-warning">{Array.from({ length: q.rating ?? 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
      <blockquote className="mt-3 line-clamp-5 text-[15px] leading-relaxed">{q.text}</blockquote>
      <figcaption className="mt-4 flex items-center gap-3 text-[14px] font-medium">
        <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-accent">{q.avatar ? <Image src={q.avatar} alt="" fill sizes="36px" className="object-cover" /> : (q.name[0] ?? "C")}</span>{q.name}
      </figcaption>
    </figure>))}</Carousel></Wrap>;
}

export function BrandsBlock({ c, title, logos }: { c: C; title: string | null; logos: { image: string; url?: string }[] }) {
  const list = items(c).length ? items(c).map((b) => ({ image: b.image ?? "", url: b.url })) : logos;
  if (!list.length) return null;
  const logo = (b: { image: string; url?: string }, n: number) => (
    <Link key={n} href={b.url || "/shop"} className="relative flex h-16 w-32 shrink-0 items-center justify-center grayscale transition hover:grayscale-0 md:h-20 md:w-40">
      {b.image && <Image src={b.image} alt="" fill sizes="160px" className="object-contain p-3" />}
    </Link>
  );
  if (s(c.variant) === "grid") return <Wrap><SectionHead title={title} center /><div className="grid grid-cols-3 gap-3 md:grid-cols-6">{list.map((b, n) => <div key={n} className="rounded-[var(--radius-card)] bg-surface shadow-card">{logo(b, n)}</div>)}</div></Wrap>;
  return <Wrap><SectionHead title={title} center /><div className="overflow-hidden"><div className="marquee flex w-max gap-8">{[...list, ...list].map(logo)}</div></div></Wrap>;
}

export function GalleryBlock({ c, title, photos }: { c: C; title: string | null; photos: { image: string; url?: string }[] }) {
  const list = items(c).length ? items(c).map((g) => ({ image: g.image ?? "", url: g.url })) : photos;
  if (!list.length) return null;
  return <Wrap><SectionHead title={title} center /><div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">{list.slice(0, 8).map((g, n) => (
    <Link key={n} href={g.url || "/shop"} className={cn("group relative aspect-square overflow-hidden rounded-[var(--radius-card)] bg-fill", n === 0 && "md:col-span-2 md:row-span-2")}>
      {g.image && <Image src={g.image} alt="" fill sizes="25vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />}
    </Link>))}</div></Wrap>;
}

export function VideoBlock({ c, title }: { c: C; title: string | null }) {
  if (!s(c.video_url)) return null;
  return <Wrap><SectionHead title={title} subtitle={s(c.subtitle)} center />
    <video src={s(c.video_url)} poster={s(c.poster) || undefined} controls playsInline className="aspect-video w-full rounded-[var(--radius-sheet)] bg-black object-cover" /></Wrap>;
}

export function FaqBlock({ title, faqs }: { title: string | null; faqs: { id: string; question: string; answer: string }[] }) {
  if (!faqs.length) return null;
  return <Wrap><div className="mx-auto max-w-3xl"><SectionHead title={title} center />
    <div className="divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-card">{faqs.map((f) => (
      <details key={f.id} className="group px-5 py-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">{f.question}<ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" /></summary>
        <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">{f.answer}</p></details>))}</div></div></Wrap>;
}

export function RichTextBlock({ title, html }: { title: string | null; html: string }) {
  if (!html && !title) return null;
  return <Wrap><div className="mx-auto max-w-3xl">{title && <h2 className="headline text-[28px] md:text-[38px]">{title}</h2>}<div className="rich mt-4" dangerouslySetInnerHTML={{ __html: html }} /></div></Wrap>;
}
