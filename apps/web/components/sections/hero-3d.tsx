"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonClass } from "@/components/ui/button";
import { cn, discountPercent, formatBDT } from "@/lib/utils";
import type { ProductCardData } from "@/lib/data/catalog";

type Copy = { title: string; subtitle?: string; cta_label?: string; cta_url?: string };
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Pointer position over an element, -1..1 on each axis, smoothed. */
function usePointer<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [p, setP] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced()) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 2 - 1;
      const y = ((e.clientY - r.top) / r.height) * 2 - 1;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setP({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) }));
    };
    const leave = () => setP({ x: 0, y: 0 });
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); cancelAnimationFrame(raf); };
  }, []);
  return { ref, p };
}

function Text({ c, center, light }: { c: Copy; center?: boolean; light?: boolean }) {
  return (
    <div className={cn("relative z-10", center && "text-center")}>
      <h1 className={cn("headline fade-up text-[40px] sm:text-[52px] md:text-[68px]", light && "text-white")}>{c.title}</h1>
      {c.subtitle && <p className={cn("fade-up mt-4 max-w-lg text-[17px] md:text-[20px]", center && "mx-auto", light ? "text-white/80" : "text-fg-muted")} style={{ animationDelay: "120ms" }}>{c.subtitle}</p>}
      {c.cta_label && <div className={cn("fade-up mt-8 flex flex-wrap gap-3", center && "justify-center")} style={{ animationDelay: "240ms" }}><Link href={c.cta_url || "/shop"} className={buttonClass("primary", "lg")}>{c.cta_label}</Link></div>}
    </div>
  );
}

/** Animated gradient blobs, used as a soft 3D-feeling backdrop. */
export function Blobs({ strong }: { strong?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="blob absolute -left-[10%] top-[-20%] h-[60%] w-[55%] rounded-full bg-accent" style={{ opacity: strong ? 0.55 : 0.28 }} />
      <div className="blob blob-2 absolute right-[-10%] top-[10%] h-[55%] w-[50%] rounded-full bg-sale" style={{ opacity: strong ? 0.4 : 0.2 }} />
      <div className="blob blob-3 absolute bottom-[-25%] left-[25%] h-[60%] w-[55%] rounded-full bg-[#7c5cff]" style={{ opacity: strong ? 0.45 : 0.18 }} />
      <div className="absolute inset-0 backdrop-blur-3xl" />
      <div className="noise absolute inset-0 opacity-[0.07]" />
    </div>
  );
}

/** Product card that tilts in 3D with the pointer, with floating chips at different depths. */
export function TiltHero({ c, product }: { c: Copy; product?: ProductCardData }) {
  const t = useTranslations("product");
  const locale = useLocale() as "en" | "bn";
  const { ref, p } = usePointer<HTMLDivElement>();
  const off = product ? discountPercent(product.price, product.compareAtPrice) : 0;
  return (
    <div ref={ref} className="hero-box relative overflow-hidden rounded-[var(--radius-sheet)] bg-surface px-6 py-12 md:px-14 md:py-20">
      <Blobs />
      <div className="relative grid items-center gap-10 md:grid-cols-2">
        <Text c={c} />
        <div className="relative mx-auto w-full max-w-[440px] [perspective:1200px]">
          <div className="relative aspect-[4/5] transition-transform duration-200 ease-out [transform-style:preserve-3d]"
            style={{ transform: `rotateY(${p.x * 14}deg) rotateX(${-p.y * 12}deg)` }}>
            <div className="absolute inset-0 overflow-hidden rounded-[var(--radius-sheet)] bg-fill shadow-float [transform:translateZ(0)]">
              {product?.image && <Image src={product.image} alt={product.title} fill priority sizes="(min-width:768px) 40vw, 90vw" className="object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/0 to-white/25" style={{ opacity: 0.6 + p.x * 0.3 }} />
            </div>
            {product && (
              <>
                <div className="glass absolute -left-6 bottom-10 rounded-[var(--radius-card)] px-4 py-3 shadow-float [transform:translateZ(80px)]">
                  <p className="line-clamp-1 max-w-[180px] text-[13px] text-fg-muted">{product.title}</p>
                  <p className="text-[20px] font-semibold">{formatBDT(product.price, locale)}{off > 0 && <span className="ml-2 rounded-full bg-sale px-2 py-0.5 align-middle text-[11px] text-white">{t("off", { percent: off })}</span>}</p>
                </div>
                {product.ratingCount > 0 && <div className="glass absolute -right-4 top-10 flex items-center gap-1 rounded-full px-3 py-2 text-[14px] font-medium shadow-float [transform:translateZ(120px)]"><Star className="h-4 w-4 fill-warning text-warning" />{product.rating.toFixed(1)}</div>}
                <Link href={`/product/${product.slug}`} className={cn(buttonClass("primary", "md"), "absolute -bottom-5 right-6 shadow-float [transform:translateZ(60px)]")}>{t("buyNow")}</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** 3D ring of products that rotates on its own and can be dragged. */
export function RingHero({ c, products }: { c: Copy; products: ProductCardData[] }) {
  const items = products.filter((p) => p.image).slice(0, 10);
  const [angle, setAngle] = useState(0);
  const drag = useRef<{ x: number; a: number } | null>(null);
  const paused = useRef(false);
  useEffect(() => {
    if (reduced() || items.length < 3) return;
    let raf = 0;
    const tick = () => { if (!paused.current && !drag.current) setAngle((a) => a - 0.12); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [items.length]);
  const n = Math.max(items.length, 3);
  const step = 360 / n;
  const radius = Math.round(150 / Math.tan(Math.PI / n));
  return (
    <div className="hero-box relative overflow-hidden rounded-[var(--radius-sheet)] bg-[#07070c] px-6 pb-10 pt-14 text-white md:pt-20">
      <Blobs strong />
      <Text c={c} center light />
      <div className="relative mx-auto mt-10 h-[300px] touch-pan-y select-none [perspective:1100px] md:h-[380px]"
        onPointerEnter={() => { paused.current = true; }} onPointerLeave={() => { paused.current = false; drag.current = null; }}
        onPointerDown={(e) => { drag.current = { x: e.clientX, a: angle }; }} onPointerUp={() => { drag.current = null; }}
        onPointerMove={(e) => { if (drag.current) setAngle(drag.current.a + (e.clientX - drag.current.x) * 0.3); }}>
        <div className="absolute left-1/2 top-1/2 h-[220px] w-[170px] [transform-style:preserve-3d] md:h-[280px] md:w-[210px]"
          style={{ transform: `translate(-50%,-50%) translateZ(-${radius}px) rotateY(${angle}deg)` }}>
          {items.map((p, i) => (
            <Link key={p.id} href={`/product/${p.slug}`} draggable={false}
              className="absolute inset-0 overflow-hidden rounded-[var(--radius-card)] border border-white/15 bg-white/5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)] [backface-visibility:hidden]"
              style={{ transform: `rotateY(${i * step}deg) translateZ(${radius}px)` }}>
              <Image src={p.image!} alt={p.title} fill sizes="210px" className="pointer-events-none object-cover" draggable={false} />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-10 text-[13px] font-medium">{p.title}</div>
            </Link>
          ))}
        </div>
        <div aria-hidden className="absolute bottom-0 left-1/2 h-10 w-[70%] -translate-x-1/2 rounded-[50%] bg-accent/40 blur-2xl" />
      </div>
    </div>
  );
}

/** Deck of cards in perspective that cycles to the front. */
export function StackHero({ c, products }: { c: Copy; products: ProductCardData[] }) {
  const items = products.filter((p) => p.image).slice(0, 5);
  const [front, setFront] = useState(0);
  useEffect(() => {
    if (items.length < 2 || reduced()) return;
    const id = setInterval(() => setFront((f) => (f + 1) % items.length), 3200);
    return () => clearInterval(id);
  }, [items.length]);
  return (
    <div className="hero-box relative overflow-hidden rounded-[var(--radius-sheet)] bg-accent-soft px-6 py-14 md:px-14 md:py-20">
      <Blobs />
      <div className="relative grid items-center gap-12 md:grid-cols-2">
        <Text c={c} />
        <div className="relative mx-auto h-[360px] w-full max-w-[360px] [perspective:1400px] md:h-[440px]">
          {items.map((p, i) => {
            const d = (i - front + items.length) % items.length;
            return (
              <Link key={p.id} href={`/product/${p.slug}`} aria-hidden={d !== 0} tabIndex={d === 0 ? 0 : -1}
                className="absolute inset-0 overflow-hidden rounded-[var(--radius-sheet)] bg-surface shadow-float transition-all duration-700 ease-[var(--ease-spring)]"
                style={{ transform: `translateX(${d * 26}px) translateY(${-d * 18}px) translateZ(${-d * 90}px) rotateY(${-d * 8}deg) rotateZ(${d * 3}deg)`, zIndex: 10 - d, opacity: d > 3 ? 0 : 1 - d * 0.18 }}>
                <Image src={p.image!} alt={p.title} fill sizes="360px" className="object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 pt-14 text-white"><p className="line-clamp-1 font-medium">{p.title}</p></div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Full-bleed animated mesh gradient with a cursor spotlight and a glass product card. */
export function MeshHero({ c, product }: { c: Copy; product?: ProductCardData }) {
  const locale = useLocale() as "en" | "bn";
  const t = useTranslations("product");
  const { ref, p } = usePointer<HTMLDivElement>();
  return (
    <div ref={ref} className="hero-box relative overflow-hidden rounded-[var(--radius-sheet)] bg-[#0a0a12] px-6 py-16 text-white md:px-14 md:py-24">
      <Blobs strong />
      <div aria-hidden className="pointer-events-none absolute h-[420px] w-[420px] rounded-full bg-white/10 blur-3xl transition-transform duration-300"
        style={{ left: "50%", top: "50%", transform: `translate(calc(-50% + ${p.x * 35}%), calc(-50% + ${p.y * 35}%))` }} />
      <div className="relative grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
        <Text c={c} light />
        {product && (
          <Link href={`/product/${product.slug}`} className="group relative mx-auto block w-full max-w-[380px] [perspective:1000px]">
            <div className="rounded-[var(--radius-sheet)] border border-white/15 bg-white/10 p-3 backdrop-blur-xl transition-transform duration-300 [transform-style:preserve-3d]"
              style={{ transform: `rotateY(${p.x * 10}deg) rotateX(${-p.y * 8}deg)` }}>
              <div className="relative aspect-square overflow-hidden rounded-[calc(var(--radius-sheet)-8px)]">
                {product.image && <Image src={product.image} alt={product.title} fill sizes="380px" className="object-cover transition-transform duration-700 group-hover:scale-105" />}
              </div>
              <div className="flex items-center justify-between gap-3 px-2 pb-1 pt-3 [transform:translateZ(40px)]">
                <span className="line-clamp-1 text-[15px] font-medium">{product.title}</span>
                <span className="shrink-0 text-[17px] font-semibold">{formatBDT(product.price, locale)}</span>
              </div>
              <span className="sr-only">{t("details")}</span>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}

/** Hero product in the center with others orbiting around it on a tilted plane. */
export function OrbitHero({ c, products }: { c: Copy; products: ProductCardData[] }) {
  const items = products.filter((p) => p.image);
  const [center, ...rest] = items;
  const orbit = rest.slice(0, 6);
  return (
    <div className="hero-box relative overflow-hidden rounded-[var(--radius-sheet)] bg-surface px-6 py-14 md:py-20">
      <Blobs />
      <div className="relative grid items-center gap-10 md:grid-cols-2">
        <Text c={c} />
        <div className="relative mx-auto aspect-square w-full max-w-[460px] [perspective:1000px]">
          <div className="absolute inset-[6%] rounded-full border border-line [transform:rotateX(68deg)]" />
          <div className="absolute inset-[20%] rounded-full border border-line [transform:rotateX(68deg)]" />
          {center && (
            <Link href={`/product/${center.slug}`} className="float-y absolute left-1/2 top-1/2 h-[46%] w-[46%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[var(--radius-sheet)] shadow-float">
              <Image src={center.image!} alt={center.title} fill priority sizes="220px" className="object-cover" />
            </Link>
          )}
          <div className="orbit absolute inset-0">
            {orbit.map((p, i) => {
              const a = (i / orbit.length) * Math.PI * 2;
              return (
                <Link key={p.id} href={`/product/${p.slug}`} className="orbit-item absolute h-[18%] w-[18%] overflow-hidden rounded-[var(--radius-card)] shadow-card"
                  style={{ left: `${50 + Math.cos(a) * 42 - 9}%`, top: `${50 + Math.sin(a) * 42 - 9}%` }}>
                  <Image src={p.image!} alt={p.title} fill sizes="90px" className="object-cover" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Giant scrolling outline text behind a floating product. */
export function MarqueeHero({ c, product }: { c: Copy; product?: ProductCardData }) {
  const { ref, p } = usePointer<HTMLDivElement>();
  const word = (c.title || "NEW").toUpperCase();
  return (
    <div ref={ref} className="hero-box relative overflow-hidden rounded-[var(--radius-sheet)] bg-accent px-0 py-16 text-accent-contrast md:py-24">
      <div aria-hidden className="absolute inset-0 flex flex-col justify-center gap-2 opacity-90">
        {[0, 1].map((r) => (
          <div key={r} className={cn("flex w-max gap-10 whitespace-nowrap", r === 0 ? "marquee" : "marquee-rev")}>
            {Array.from({ length: 6 }).map((_, i) => <span key={i} className="headline text-[18vw] leading-none md:text-[11vw]" style={{ WebkitTextStroke: "2px currentColor", color: i % 2 ? "transparent" : "currentColor" }}>{word}</span>)}
          </div>
        ))}
      </div>
      {product?.image && (
        <div className="relative mx-auto aspect-square w-[62%] max-w-[380px] transition-transform duration-300" style={{ transform: `translate(${p.x * 18}px, ${p.y * 14}px) rotate(${p.x * 4}deg)` }}>
          <Image src={product.image} alt={product.title} fill priority sizes="380px" className="rounded-[var(--radius-sheet)] object-cover shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)]" />
        </div>
      )}
      <div className="relative mt-8 flex flex-col items-center gap-3 px-6 text-center">
        {c.subtitle && <p className="max-w-md text-[17px] opacity-90">{c.subtitle}</p>}
        {c.cta_label && <Link href={c.cta_url || "/shop"} className={cn(buttonClass("primary", "lg"), "!bg-[var(--accent-contrast)] !text-[var(--accent)]")}>{c.cta_label}</Link>}
      </div>
    </div>
  );
}
