"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonClass } from "@/components/ui/button";
import { useCart } from "@/components/store/cart/cart-provider";
import { cn, discountPercent, formatBDT } from "@/lib/utils";
import type { ProductCardData } from "@/lib/data/catalog";

export type Slide = { image?: string; mobile_image?: string; title?: string; subtitle?: string; cta_label?: string; cta_url?: string; align?: "left" | "center" | "right"; tone?: "light" | "dark" };

function useAuto(count: number, ms: number, enabled: boolean) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!enabled || paused || count < 2) return;
    const id = setInterval(() => setI((x) => (x + 1) % count), ms);
    return () => clearInterval(id);
  }, [count, ms, enabled, paused]);
  return { i, setI, setPaused };
}
function Dots({ count, i, setI, light }: { count: number; i: number; setI: (n: number) => void; light?: boolean }) {
  if (count < 2) return null;
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: count }).map((_, n) => (
        <button key={n} onClick={() => setI(n)} aria-label={`Slide ${n + 1}`}
          className={cn("h-1.5 rounded-full transition-all duration-500", n === i ? "w-7" : "w-1.5", light ? (n === i ? "bg-white" : "bg-white/50") : (n === i ? "bg-fg" : "bg-fg-subtle"))} />
      ))}
    </div>
  );
}

/** Full-bleed banner slider with crossfade, swipe and optional phone images. */
export function BannerSlider({ slides, height, autoplay }: { slides: Slide[]; height: string; autoplay: boolean }) {
  const { i, setI, setPaused } = useAuto(slides.length, 6000, autoplay);
  const touch = useRef(0);
  const h = height === "full" ? "h-[78svh] min-h-[460px]" : height === "medium" ? "h-[52svh] min-h-[340px] md:h-[440px]" : "h-[64svh] min-h-[420px] md:h-[560px]";
  return (
    <div className={cn("hero-box relative overflow-hidden rounded-[var(--radius-sheet)] bg-fill", h)} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { touch.current = e.touches[0]!.clientX; }} onTouchEnd={(e) => { const d = e.changedTouches[0]!.clientX - touch.current; if (Math.abs(d) > 40) setI((i + (d < 0 ? 1 : -1) + slides.length) % slides.length); }}>
      {slides.map((s, n) => {
        const light = s.tone !== "dark";
        const align = s.align === "center" ? "items-center text-center" : s.align === "right" ? "items-end text-right" : "items-start text-left";
        return (
          <div key={n} aria-hidden={n !== i} className={cn("absolute inset-0 transition-opacity duration-1000", n === i ? "opacity-100" : "pointer-events-none opacity-0")}>
            {s.image && (
              <picture>
                {s.mobile_image && <source media="(max-width: 639px)" srcSet={s.mobile_image} />}
                <Image src={s.image} alt={s.title ?? ""} fill priority={n === 0} sizes="100vw" className={cn("object-cover transition-transform duration-[7000ms] ease-out", n === i && "scale-105")} />
              </picture>
            )}
            <div className={cn("absolute inset-0", light ? "bg-gradient-to-r from-black/55 via-black/20 to-transparent" : "bg-gradient-to-r from-white/70 via-white/30 to-transparent")} />
            <div className={cn("relative flex h-full flex-col justify-center gap-4 px-6 md:px-14", align, light ? "text-white" : "text-black")}>
              {s.title && <h2 className={cn("headline max-w-2xl text-[34px] sm:text-[48px] md:text-[64px]", n === i && "fade-up")}>{s.title}</h2>}
              {s.subtitle && <p className={cn("max-w-xl text-[16px] opacity-90 md:text-[20px]", n === i && "fade-up")}>{s.subtitle}</p>}
              {s.cta_label && <Link href={s.cta_url || "/shop"} className={cn(buttonClass("primary", "lg"), light ? "!bg-white !text-black" : "!bg-black !text-white")}>{s.cta_label}</Link>}
            </div>
          </div>
        );
      })}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2"><Dots count={slides.length} i={i} setI={setI} light={slides[i]?.tone !== "dark"} /></div>
      {slides.length > 1 && (
        <>
          <button onClick={() => setI((i - 1 + slides.length) % slides.length)} aria-label="Previous" className="glass absolute left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full md:flex"><ChevronLeft className="h-5 w-5" /></button>
          <button onClick={() => setI((i + 1) % slides.length)} aria-label="Next" className="glass absolute right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full md:flex"><ChevronRight className="h-5 w-5" /></button>
        </>
      )}
    </div>
  );
}

/** Product spotlight: one product per slide with price and Buy now, on a soft accent stage. */
export function ProductSlider({ products, title, autoplay }: { products: ProductCardData[]; title?: string; autoplay: boolean }) {
  const t = useTranslations("product");
  const locale = useLocale() as "en" | "bn";
  const { buyNow } = useCart();
  const { i, setI, setPaused } = useAuto(products.length, 5500, autoplay);
  const p = products[i];
  if (!p) return null;
  const off = discountPercent(p.price, p.compareAtPrice);
  return (
    <div className="hero-box relative overflow-hidden rounded-[var(--radius-sheet)] bg-surface shadow-card" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div aria-hidden className="absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-accent/25 blur-3xl" />
      <div aria-hidden className="absolute -bottom-32 left-10 h-80 w-80 rounded-full bg-sale/15 blur-3xl" />
      <div className="relative grid items-center gap-6 p-6 md:grid-cols-2 md:p-12">
        <div key={p.id} className="fade-up order-2 md:order-1">
          {title && <p className="text-[14px] font-medium text-accent">{title}</p>}
          <h2 className="headline mt-2 text-[30px] md:text-[48px]">{p.title}</h2>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-[28px] font-semibold md:text-[34px]">{formatBDT(p.price, locale)}</span>
            {off > 0 && <><span className="text-[17px] text-fg-subtle line-through">{formatBDT(p.compareAtPrice!, locale)}</span><span className="rounded-full bg-sale px-2.5 py-1 text-[12px] font-semibold text-white">{t("off", { percent: off })}</span></>}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {p.inStock && <button onClick={() => (p.hasVariants ? location.assign(`/product/${p.slug}?buy=1`) : buyNow({ productId: p.id, variantId: null, quantity: 1, title: p.title, image: p.image, price: p.price }))} className={buttonClass("primary", "lg")}>{t("buyNow")}</button>}
            <Link href={`/product/${p.slug}`} className={buttonClass("secondary", "lg")}>{t("details")}</Link>
          </div>
          <div className="mt-8"><Dots count={products.length} i={i} setI={setI} /></div>
        </div>
        <div key={`${p.id}-img`} className="fade-up relative order-1 mx-auto aspect-square w-full max-w-[460px] md:order-2">
          {p.image && <Image src={p.image} alt={p.title} fill priority sizes="(min-width:768px) 40vw, 90vw" className="rounded-[var(--radius-sheet)] object-cover" />}
        </div>
      </div>
    </div>
  );
}

/** Peeking card carousel: centered slide large, neighbours smaller. */
export function CoverflowSlider({ slides, autoplay }: { slides: Slide[]; autoplay: boolean }) {
  const { i, setI, setPaused } = useAuto(slides.length, 4500, autoplay);
  return (
    <div className="relative h-[380px] overflow-hidden md:h-[480px]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {slides.map((s, n) => {
        let d = n - i;
        if (d > slides.length / 2) d -= slides.length;
        if (d < -slides.length / 2) d += slides.length;
        const abs = Math.abs(d);
        return (
          <Link key={n} href={s.cta_url || "/shop"} aria-hidden={d !== 0} tabIndex={d === 0 ? 0 : -1} onClick={(e) => { if (d !== 0) { e.preventDefault(); setI(n); } }}
            className="absolute left-1/2 top-1/2 block aspect-[3/4] h-[88%] overflow-hidden rounded-[var(--radius-sheet)] shadow-float transition-all duration-700 ease-[var(--ease-spring)]"
            style={{ transform: `translate(calc(-50% + ${d * 62}%), -50%) scale(${1 - abs * 0.14})`, zIndex: 10 - abs, opacity: abs > 2 ? 0 : 1 - abs * 0.25 }}>
            {s.image && <Image src={s.image} alt={s.title ?? ""} fill sizes="40vw" className="object-cover" />}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 pt-16 text-white">
              {s.title && <p className="headline text-[24px] md:text-[30px]">{s.title}</p>}
              {s.subtitle && <p className="mt-1 text-[14px] opacity-85">{s.subtitle}</p>}
            </div>
          </Link>
        );
      })}
      <div className="absolute bottom-2 left-1/2 z-20 -translate-x-1/2"><Dots count={slides.length} i={i} setI={setI} /></div>
    </div>
  );
}
