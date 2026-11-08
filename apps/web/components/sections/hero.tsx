import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProductCardData } from "@/lib/data/catalog";
import { BannerSlider, CoverflowSlider, ProductSlider, type Slide } from "./hero-client";
import { MarqueeHero, MeshHero, OrbitHero, RingHero, StackHero, TiltHero } from "./hero-3d";

type C = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" ? v : "");

function Ctas({ c, center }: { c: C; center?: boolean }) {
  if (!s(c.cta_label)) return null;
  return <div className={cn("mt-8 flex flex-wrap gap-3", center && "justify-center")}><Link href={s(c.cta_url) || "/shop"} className={buttonClass("primary", "lg")}>{s(c.cta_label)}</Link></div>;
}

/** Eight hero designs. Any theme can use any of them. */
export function Hero({ c, products, fallbackTitle, fallbackBody }: { c: C; products: ProductCardData[]; fallbackTitle: string; fallbackBody: string }) {
  const variant = s(c.variant) || "centered";
  const slides = (Array.isArray(c.slides) ? c.slides : []) as Slide[];
  const title = s(c.title) || fallbackTitle;
  const subtitle = s(c.subtitle) || (variant === "centered" ? fallbackBody : "");
  const imgs = products.map((p) => p.image).filter(Boolean) as string[];
  const full = c.width === "full";
  const copy = { title, subtitle: s(c.subtitle), cta_label: s(c.cta_label), cta_url: s(c.cta_url) };
  const wrap = (node: React.ReactNode, pad = "pt-4 md:pt-6") => <section className={cn("container-x", pad, full && "hero-full")}>{node}</section>;

  if (variant === "tilt3d") return wrap(<TiltHero c={copy} product={products[0]} />);
  if (variant === "ring3d") return products.length ? wrap(<RingHero c={copy} products={products} />) : null;
  if (variant === "stack3d") return products.length ? wrap(<StackHero c={copy} products={products} />) : null;
  if (variant === "mesh") return wrap(<MeshHero c={copy} product={products[0]} />);
  if (variant === "orbit") return products.length ? wrap(<OrbitHero c={copy} products={products} />) : null;
  if (variant === "marquee") return wrap(<MarqueeHero c={copy} product={products[0]} />);

  if (variant === "slider") {
    const list = slides.length ? slides : [{ title, subtitle, cta_label: s(c.cta_label) || "Shop now", cta_url: "/shop", image: imgs[0], tone: "light" as const }];
    return <section className={cn("container-x pt-4 md:pt-6", full && "hero-full")}><BannerSlider slides={list} height={s(c.height) || "large"} autoplay={c.autoplay !== false} /></section>;
  }
  if (variant === "product") {
    if (!products.length) return null;
    return <section className={cn("container-x pt-4 md:pt-8", full && "hero-full")}><ProductSlider products={products} title={s(c.title)} autoplay={c.autoplay !== false} /></section>;
  }
  if (variant === "coverflow") {
    const list = slides.length ? slides : products.slice(0, 6).map((p) => ({ image: p.image ?? undefined, title: p.title, cta_url: `/product/${p.slug}` }));
    return <section className={cn("container-x pt-6 md:pt-10", full && "hero-full")}><CoverflowSlider slides={list} autoplay={c.autoplay !== false} /></section>;
  }
  if (variant === "split") {
    const image = s(c.image) || slides[0]?.image || imgs[0];
    return (
      <section className={cn("container-x pt-4 md:pt-8", full && "hero-full")}>
        <div className="hero-box relative grid items-center gap-8 overflow-hidden rounded-[var(--radius-sheet)] bg-accent-soft p-6 md:grid-cols-2 md:p-14">
          <div className="fade-up">
            <h1 className="headline text-[38px] md:text-[60px]">{title}</h1>
            {subtitle && <p className="mt-4 max-w-md text-[17px] text-fg-muted md:text-[19px]">{subtitle}</p>}
            <Ctas c={c} />
          </div>
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[var(--radius-sheet)] md:aspect-square">
            {image ? <Image src={image} alt="" fill priority sizes="(min-width:768px) 45vw, 100vw" className="object-cover" /> : <div className="absolute inset-0 bg-fill" />}
          </div>
        </div>
      </section>
    );
  }
  if (variant === "bento") {
    const tiles: Slide[] = slides.length ? slides : products.slice(0, 3).map((p) => ({ image: p.image ?? undefined, title: p.title, cta_url: `/product/${p.slug}`, tone: "light" as const }));
    return (
      <section className={cn("container-x pt-4 md:pt-6", full && "hero-full")}>
        <div className="grid gap-3 md:h-[520px] md:grid-cols-3 md:grid-rows-2">
          {tiles.slice(0, 5).map((t, n) => (
            <Link key={n} href={t.cta_url || "/shop"} className={cn("group relative block min-h-[220px] overflow-hidden rounded-[var(--radius-sheet)] bg-fill", n === 0 && "md:col-span-2 md:row-span-2 min-h-[340px]")}>
              {t.image && <Image src={t.image} alt={t.title ?? ""} fill priority={n === 0} sizes={n === 0 ? "66vw" : "33vw"} className="object-cover transition-transform duration-700 group-hover:scale-105" />}
              <div className={cn("absolute inset-0", t.tone === "dark" ? "bg-gradient-to-t from-white/70 to-transparent" : "bg-gradient-to-t from-black/60 via-black/10 to-transparent")} />
              <div className={cn("absolute inset-x-0 bottom-0 p-5 md:p-7", t.tone === "dark" ? "text-black" : "text-white")}>
                {t.title && <p className={cn("headline", n === 0 ? "text-[32px] md:text-[48px]" : "text-[22px]")}>{t.title}</p>}
                {t.subtitle && <p className="mt-1 max-w-md text-[15px] opacity-90">{t.subtitle}</p>}
                {n === 0 && t.cta_label && <span className={cn(buttonClass("primary", "md"), "mt-4 !bg-white !text-black")}>{t.cta_label}</span>}
              </div>
            </Link>
          ))}
        </div>
      </section>
    );
  }
  if (variant === "video") {
    const h = s(c.height) === "full" ? "h-[80svh] min-h-[480px]" : "h-[62svh] min-h-[420px]";
    return (
      <section className={cn("container-x pt-4 md:pt-6", full && "hero-full")}>
        <div className={cn("hero-box relative overflow-hidden rounded-[var(--radius-sheet)] bg-black", h)}>
          {s(c.video_url) ? <video src={s(c.video_url)} autoPlay muted loop playsInline poster={imgs[0]} className="absolute inset-0 h-full w-full object-cover opacity-80" />
            : imgs[0] && <Image src={imgs[0]} alt="" fill priority sizes="100vw" className="object-cover opacity-70" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />
          <div className="relative flex h-full flex-col items-center justify-center px-6 text-center text-white">
            <h1 className="headline fade-up text-[48px] sm:text-[72px] md:text-[104px]">{title}</h1>
            {subtitle && <p className="fade-up mt-3 max-w-xl text-[17px] opacity-90 md:text-[20px]">{subtitle}</p>}
            {s(c.cta_label) && <Link href={s(c.cta_url) || "/shop"} className={cn(buttonClass("primary", "lg"), "mt-8 !bg-white !text-black")}>{s(c.cta_label)}</Link>}
          </div>
        </div>
      </section>
    );
  }
  if (variant === "floating") {
    const pos = ["left-[2%] top-[8%] w-[22%] [--r:-8deg]", "right-[3%] top-[6%] w-[20%] [--r:7deg]", "left-[6%] bottom-[4%] w-[18%] [--r:6deg]", "right-[6%] bottom-[2%] w-[22%] [--r:-6deg]", "left-[24%] top-[-4%] w-[12%] [--r:4deg]", "right-[26%] bottom-[-6%] w-[13%] [--r:-4deg]"];
    return (
      <section className={cn("container-x pt-6 md:pt-10", full && "hero-full")}>
        <div className="hero-box relative overflow-hidden rounded-[var(--radius-sheet)] bg-accent-soft px-6 py-20 md:py-32">
          {imgs.slice(0, 6).map((src, n) => (
            <div key={src + n} className={cn("float-y absolute hidden aspect-square overflow-hidden rounded-[var(--radius-card)] shadow-float sm:block", pos[n])} style={{ animationDelay: `${n * 0.7}s` }}>
              <Image src={src} alt="" fill sizes="20vw" className="object-cover" />
            </div>
          ))}
          <div className="relative mx-auto max-w-2xl text-center">
            <h1 className="headline fade-up text-[40px] md:text-[68px]">{title}</h1>
            {subtitle && <p className="mx-auto mt-4 max-w-lg text-[17px] text-fg-muted md:text-[20px]">{subtitle}</p>}
            <Ctas c={c} center />
          </div>
          <div className="no-scrollbar relative mt-10 flex justify-center gap-3 overflow-x-auto sm:hidden">
            {imgs.slice(0, 4).map((src) => <div key={src} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[var(--radius-card)]"><Image src={src} alt="" fill sizes="96px" className="object-cover" /></div>)}
          </div>
        </div>
      </section>
    );
  }
  // centered (default)
  return (
    <section className={cn("container-x pt-10 md:pt-20", full && "hero-full")}>
      <div className="relative mx-auto max-w-3xl text-center">
        <div aria-hidden className="absolute left-1/2 top-1/2 -z-10 h-72 w-[min(90vw,720px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-3xl" />
        <h1 className="headline fade-up text-[40px] md:text-[68px]">{title}</h1>
        {subtitle && <p className="mx-auto mt-5 max-w-xl text-[17px] text-fg-muted md:text-[21px]">{subtitle}</p>}
        <Ctas c={{ cta_label: "Shop now", cta_url: "/shop", ...c }} center />
      </div>
      {imgs.length > 0 && (
        <div className="no-scrollbar mt-12 flex snap-x gap-3 overflow-x-auto md:mt-16 md:grid md:grid-cols-6 md:overflow-visible">
          {products.slice(0, 6).map((p, n) => (
            <Link key={p.id} href={`/product/${p.slug}`} className={cn("relative aspect-[3/4] w-[42%] shrink-0 snap-start overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-card transition-transform hover:-translate-y-1 md:w-auto", n % 2 === 1 && "md:translate-y-6")}>
              {p.image && <Image src={p.image} alt={p.title} fill sizes="(min-width:768px) 16vw, 42vw" className="object-cover" />}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
