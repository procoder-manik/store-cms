"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { Heart, Plus, ShoppingBag, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { cn, discountPercent, formatBDT } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { toggleWishlistAction } from "@/lib/store/actions";
import { useAppearance } from "@/components/theme/appearance-context";
import type { ProductCardData } from "@/lib/data/catalog";
import type { CardId } from "@/lib/theme/presets";
import { useCart } from "./cart/cart-provider";
import { CompareButton } from "./compare";

/**
 * Product card in four styles (classic, minimal, overlay, bordered). The theme picks the default;
 * any section can override it. All styles: second photo or video on hover, discount, wishlist, add and buy.
 */
export function ProductCard({ product: p, priority, variant }: { product: ProductCardData; priority?: boolean; variant?: CardId }) {
  const t = useTranslations("product");
  const locale = useLocale() as "en" | "bn";
  const router = useRouter();
  const toast = useToast();
  const { add, buyNow } = useCart();
  const theme = useAppearance();
  const v = variant ?? theme.card;
  const [hover, setHover] = useState(false);
  const [wished, setWished] = useState(false);
  const [busy, setBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const off = discountPercent(p.price, p.compareAtPrice);

  const enter = () => { setHover(true); videoRef.current?.play().catch(() => {}); };
  const leave = () => { setHover(false); if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; } };
  async function onAdd(e?: React.MouseEvent) {
    e?.preventDefault();
    if (p.hasVariants) return router.push(`/product/${p.slug}`);
    setBusy(true); await add(p.id, null, 1); setBusy(false);
  }
  function onBuy(e?: React.MouseEvent) {
    e?.preventDefault();
    if (p.hasVariants) return router.push(`/product/${p.slug}?buy=1`);
    buyNow({ productId: p.id, variantId: null, quantity: 1, title: p.title, image: p.image, price: p.price });
  }
  async function onWish(e: React.MouseEvent) {
    e.preventDefault();
    const r = await toggleWishlistAction(p.id);
    if (!r.ok) { if (r.error === "login") { toast(t("loginNeeded"), "error"); router.push(`/login?next=/product/${p.slug}`); } return; }
    setWished(r.data!.wished);
    toast(r.data!.wished ? t("wishAdded") : t("wishRemoved"));
  }

  const media = (rounded: string) => (
    <Link href={`/product/${p.slug}`} className={cn("relative block aspect-square overflow-hidden bg-surface", rounded)}>
      {p.image ? (
        <Image src={p.image} alt={p.title} fill priority={priority} sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
          className={cn("object-cover transition-all duration-500 ease-[var(--ease-spring)]", hover && (p.hoverImage || p.video) ? "opacity-0" : "opacity-100 group-hover:scale-[1.04]")} />
      ) : <div className="absolute inset-0 bg-fill" />}
      {p.hoverImage && !p.video && <Image src={p.hoverImage} alt="" fill sizes="25vw" aria-hidden className={cn("object-cover transition-opacity duration-500", hover ? "opacity-100" : "opacity-0")} />}
      {p.video && <video ref={videoRef} src={p.video} muted loop playsInline preload="none" aria-hidden className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-500", hover ? "opacity-100" : "opacity-0")} />}
      <span className="absolute left-3 top-3 flex flex-col items-start gap-1">
        {off > 0 && <span className="rounded-full bg-sale px-2.5 py-1 text-[12px] font-semibold text-white">{t("off", { percent: off })}</span>}
        {p.preorder && <span className="rounded-full bg-fg px-2.5 py-1 text-[11px] font-semibold text-background">{t("badge_preorder")}</span>}
        {p.badges.slice(0, off > 0 || p.preorder ? 1 : 2).map((b) => (
          <span key={b} className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", b === "hot" ? "bg-warning text-black" : b === "new" ? "bg-accent text-accent-contrast" : "glass text-fg")}>{t(`badge_${b}` as "badge_new")}</span>
        ))}
      </span>
      {!p.inStock && <span className="glass absolute inset-x-3 bottom-3 rounded-full py-1.5 text-center text-[13px] font-medium">{t("outOfStock")}</span>}
    </Link>
  );
  const heart = (cls = "") => (
    <div className={cn("absolute right-3 top-3 z-10 flex flex-col gap-1.5", cls)}>
      <button onClick={onWish} aria-label="Wishlist" aria-pressed={wished} className="glass flex h-9 w-9 items-center justify-center rounded-full text-fg transition-transform active:scale-90">
        <Heart className={cn("h-4 w-4", wished && "fill-sale text-sale")} />
      </button>
      <CompareButton item={{ id: p.id, title: p.title, image: p.image }} className="glass h-9 w-9 rounded-full text-fg transition md:opacity-0 md:group-hover:opacity-100" />
    </div>
  );
  const price = (big = false) => (
    <div className="flex items-baseline gap-2">
      <span className={cn("font-semibold", big ? "text-[17px]" : "text-[15px]")}>{formatBDT(p.price, locale)}</span>
      {off > 0 && <span className="text-[13px] opacity-60 line-through">{formatBDT(p.compareAtPrice!, locale)}</span>}
    </div>
  );
  const rating = p.ratingCount > 0 && (
    <div className="flex items-center gap-1 text-[12px] opacity-75"><Star className="h-3.5 w-3.5 fill-current text-warning" />{p.rating.toFixed(1)} <span className="opacity-70">({p.ratingCount})</span></div>
  );

  if (v === "minimal") {
    return (
      <article className="group relative flex flex-col" onMouseEnter={enter} onMouseLeave={leave}>
        <div className="relative">
          {media("rounded-[var(--radius-card)]")}
          {heart("opacity-0 group-hover:opacity-100 max-md:opacity-100")}
          {p.inStock && (
            <button onClick={onAdd} disabled={busy} aria-label={t("addToCart")}
              className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-fg text-background shadow-float transition-all active:scale-90 md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100">
              <Plus className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="px-0.5 pt-3">
          <Link href={`/product/${p.slug}`} className="line-clamp-1 text-[14px] text-fg-muted hover:text-fg">{p.title}</Link>
          {price()}
        </div>
      </article>
    );
  }

  if (v === "overlay") {
    return (
      <article className="group relative overflow-hidden rounded-[var(--radius-card)]" onMouseEnter={enter} onMouseLeave={leave}>
        {media("rounded-[var(--radius-card)] aspect-[4/5]")}
        {heart()}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-4 pt-16 text-white">
          <Link href={`/product/${p.slug}`} className="pointer-events-auto line-clamp-2 text-[15px] font-medium leading-snug">{p.title}</Link>
          <div className="mt-1 flex items-center justify-between gap-2">{price(true)}{rating}</div>
          {p.inStock && (
            <div className="pointer-events-auto mt-3 grid grid-cols-2 gap-2 transition-all duration-300 md:max-h-0 md:opacity-0 md:group-hover:max-h-12 md:group-hover:opacity-100">
              <button onClick={onAdd} disabled={busy} className="h-9 rounded-[var(--radius-btn)] bg-white/20 text-[13px] font-medium backdrop-blur">{t("addToCart")}</button>
              <button onClick={onBuy} className="h-9 rounded-[var(--radius-btn)] bg-white text-[13px] font-medium text-black">{p.preorder ? t("preorderNow") : t("buyNow")}</button>
            </div>
          )}
        </div>
      </article>
    );
  }

  if (v === "bordered") {
    return (
      <article className="group relative flex flex-col rounded-[var(--radius-card)] border border-line bg-surface p-2.5 transition-shadow hover:shadow-card" onMouseEnter={enter} onMouseLeave={leave}>
        {media("rounded-[calc(var(--radius-card)-6px)]")}
        {heart("right-5 top-5")}
        <div className="flex flex-1 flex-col px-1.5 pt-3">
          <Link href={`/product/${p.slug}`} className="line-clamp-2 min-h-[2.6em] text-[14px] leading-snug hover:text-accent">{p.title}</Link>
          <div className="mt-1">{rating}</div>
          <div className="mt-1.5">{price(true)}</div>
          {p.inStock ? (
            <button onClick={onBuy} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-btn)] bg-accent text-[14px] font-medium text-accent-contrast transition-transform active:scale-[0.98]">
              <ShoppingBag className="h-4 w-4" />{p.preorder ? t("preorderNow") : t("buyNow")}
            </button>
          ) : <p className="mt-3 h-10 text-center text-[13px] leading-10 text-fg-subtle">{t("outOfStock")}</p>}
        </div>
      </article>
    );
  }

  // classic
  return (
    <article className="group relative flex flex-col" onMouseEnter={enter} onMouseLeave={leave}>
      {media("rounded-[var(--radius-card)]")}
      {heart()}
      <div className="flex flex-1 flex-col px-1 pt-3">
        <Link href={`/product/${p.slug}`} className="line-clamp-2 text-[15px] leading-snug text-fg hover:underline">{p.title}</Link>
        <div className="mt-1">{rating}</div>
        <div className="mt-1.5">{price(true)}</div>
        {p.inStock && (
          <div className="mt-3 grid grid-cols-2 gap-2 transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
            <button onClick={onAdd} disabled={busy} className="h-9 rounded-[var(--radius-btn)] bg-fill text-[13px] font-medium text-fg transition-transform active:scale-[0.97] disabled:opacity-60">{t("addToCart")}</button>
            <button onClick={onBuy} className="h-9 rounded-[var(--radius-btn)] bg-accent text-[13px] font-medium text-accent-contrast transition-transform active:scale-[0.97]">{p.preorder ? t("preorderNow") : t("buyNow")}</button>
          </div>
        )}
      </div>
    </article>
  );
}
