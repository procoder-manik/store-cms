"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Heart, Ruler, Star, Truck } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { cn, discountPercent, formatBDT } from "@/lib/utils";
import { stockAlertAction, toggleWishlistAction } from "@/lib/store/actions";
import { Input } from "@/components/ui/field";
import type { ProductDetail } from "@/lib/data/catalog";
import { useCart } from "../cart/cart-provider";
import { Quantity } from "../cart/quantity";
import { Gallery } from "./gallery";
import { CompareButton } from "../compare";
import { track } from "@/lib/tracking/client";

/** Gallery + options + price + actions. Lives in one client component so option choice can drive the gallery. */
export function ProductHero({ product: p, wished: initialWished, thumbs = "bottom", stickyBar = true }: { product: ProductDetail; wished: boolean; thumbs?: "bottom" | "left"; stickyBar?: boolean }) {
  const t = useTranslations("product");
  const locale = useLocale() as "en" | "bn";
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const { add, buyNow } = useCart();
  const [picked, setPicked] = useState<Record<string, string>>(() =>
    p.options.length && p.variants.length === 1 ? { ...p.variants[0]!.options } : {});
  const [qty, setQty] = useState(1);
  const [wished, setWished] = useState(initialWished);
  const [guide, setGuide] = useState(false);
  const [busy, setBusy] = useState(false);

  const variant = useMemo(() => p.variants.find((v) => p.options.every((o) => v.options[o.name] === picked[o.name])) ?? null, [p, picked]);
  const needsChoice = p.options.length > 0 && !variant;
  const price = variant?.price ?? p.price;
  const compare = variant?.compareAtPrice ?? p.compareAtPrice;
  const stock = variant ? variant.stock : p.stock;
  const tracked = p.trackInventory && !p.allowBackorder;
  const inStock = p.preorder || !tracked || (needsChoice ? p.stock > 0 : stock > 0);
  const off = discountPercent(price, compare);
  const lastPicked = Object.values(picked).at(-1) ?? null;

  // Is a given option value still possible with the other choices?
  const possible = (name: string, value: string) => p.variants.some((v) =>
    v.options[name] === value && Object.entries(picked).every(([k, val]) => k === name || v.options[k] === val) && (!tracked || v.stock > 0));

  const firstUnpicked = p.options.find((o) => !picked[o.name]);
  const pleaseChoose = () => toast(t("chooseOption", { name: firstUnpicked?.name ?? "" }), "error");

  async function onAdd() {
    if (needsChoice) return pleaseChoose();
    setBusy(true);
    await add(p.id, variant?.id ?? null, qty);
    setBusy(false);
  }
  function onBuy() {
    if (needsChoice) return pleaseChoose();
    buyNow({
      productId: p.id, variantId: variant?.id ?? null, quantity: qty, title: p.title,
      variantTitle: variant ? Object.values(variant.options).join(" / ") : null,
      image: variant?.image ?? p.media.find((m) => m.type === "image")?.url ?? null, price, max: tracked ? stock : null,
    });
  }
  async function onWish() {
    const r = await toggleWishlistAction(p.id);
    if (!r.ok) { if (r.error === "login") router.push(`/login?next=/product/${p.slug}`); return; }
    setWished(r.data!.wished);
    toast(r.data!.wished ? t("wishAdded") : t("wishRemoved"));
  }

  useEffect(() => {
    track("view_item", { value: p.price, items: [{ item_id: p.id, item_name: p.title, price: p.price, quantity: 1 }] });
    if (params.get("buy") === "1" && !needsChoice) onBuy();
    // Run once on mount only (deep link from a product card's Buy now)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const media = variant?.image && !p.media.some((m) => m.url === variant.image)
    ? [{ type: "image" as const, url: variant.image, thumbnail: null, alt: p.title, optionValue: null }, ...p.media] : p.media;

  return (
    <div className="grid gap-8 md:grid-cols-2 lg:gap-14">
      <Gallery media={media} title={p.title} focusValue={lastPicked} thumbs={thumbs} />

      <div>
        <h1 className="headline text-[28px] md:text-[34px]">{locale === "bn" && p.titleBn ? p.titleBn : p.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[14px] text-fg-muted">
          {p.ratingCount > 0 && (
            <a href="#reviews" className="flex items-center gap-1 hover:text-fg"><Star className="h-4 w-4 fill-current text-warning" />{p.rating.toFixed(1)} ({p.ratingCount})</a>
          )}
          {p.soldCount > 0 && <span>{t("sold", { count: p.soldCount })}</span>}
        </div>

        <div className="mt-5 flex items-baseline gap-3">
          <span className="text-[30px] font-semibold tracking-tight">{formatBDT(price, locale)}</span>
          {off > 0 && <>
            <span className="text-[17px] text-fg-subtle line-through">{formatBDT(compare!, locale)}</span>
            <span className="rounded-full bg-sale px-2.5 py-1 text-[12px] font-semibold text-white">{t("off", { percent: off })}</span>
          </>}
        </div>
        {p.shortDescription && <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">{p.shortDescription}</p>}

        {p.options.map((o) => (
          <div key={o.name} className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-medium">{o.name}{picked[o.name] && <span className="ml-2 text-fg-muted">{picked[o.name]}</span>}</p>
              {p.sizeGuideHtml && /size/i.test(o.name) && (
                <button onClick={() => setGuide(true)} className="flex items-center gap-1 text-[13px] text-accent"><Ruler className="h-4 w-4" />{t("sizeGuide")}</button>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label={o.name}>
              {o.values.map((v) => {
                const on = picked[o.name] === v.value;
                const ok = possible(o.name, v.value);
                return (
                  <button key={v.value} role="radio" aria-checked={on} onClick={() => setPicked((s) => ({ ...s, [o.name]: v.value }))}
                    className={cn("flex h-11 min-w-11 items-center gap-2 rounded-full px-4 text-[14px] transition-all",
                      on ? "bg-fg text-background" : "bg-surface shadow-card hover:ring-1 hover:ring-line",
                      !ok && !on && "text-fg-subtle line-through decoration-1")}>
                    {v.swatch && <span className="h-4 w-4 rounded-full ring-1 ring-line" style={{ background: v.swatch }} />}
                    {v.image && !v.swatch && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.image} alt="" className="-ml-2 h-7 w-7 rounded-full object-cover" />
                    )}
                    {v.value}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mt-6 flex items-center gap-3">
          <Quantity value={qty} max={tracked && !needsChoice ? Math.max(1, stock) : 99} onChange={(v) => setQty(Math.max(1, v))} />
          <p className={cn("text-[14px]", inStock ? "text-success" : "text-danger")}>
            {p.preorder ? (p.preorderShipsAt ? t("preorderShips", { date: new Date(p.preorderShipsAt).toLocaleDateString(locale === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short" }) }) : t("preorderShipsSoon"))
              : !inStock ? t("outOfStock") : tracked && !needsChoice && stock <= 5 ? t("onlyLeft", { count: stock }) : t("inStock")}
          </p>
        </div>

        {!inStock && !needsChoice && (
          <form className="mt-5 flex flex-wrap gap-2 sm:flex-nowrap" onSubmit={(e) => {
            e.preventDefault();
            const email = String(new FormData(e.currentTarget).get("email") ?? "");
            stockAlertAction(p.id, variant?.id ?? null, email).then((r) => toast(r.ok ? t("notifyDone") : t("notifyError"), r.ok ? "success" : "error"));
          }}>
            <Input name="email" type="email" required placeholder={t("notifyPlaceholder")} aria-label={t("notifyPlaceholder")} className="min-w-0 flex-1" />
            <Button type="submit" variant="secondary">{t("notifyMe")}</Button>
          </form>
        )}

        <div className="mt-6 hidden gap-3 md:flex">
          <Button size="lg" variant="secondary" className="flex-1" disabled={!inStock || busy} onClick={onAdd}>{t("addToCart")}</Button>
          <Button size="lg" className="flex-1" disabled={!inStock} onClick={onBuy}>{p.preorder ? t("preorderNow") : t("buyNow")}</Button>
          <Button size="lg" variant="secondary" aria-label="Wishlist" aria-pressed={wished} onClick={onWish} className="w-13 px-0">
            <Heart className={cn("h-5 w-5", wished && "fill-sale text-sale")} />
          </Button>
        </div>

        {p.preorder && p.preorderNote && <p className="mt-4 rounded-[var(--radius-card)] bg-accent-soft p-3 text-[14px]">{p.preorderNote}</p>}
        <CompareButton item={{ id: p.id, title: p.title, image: p.media.find((m) => m.type === "image")?.url ?? null }} withLabel className="mt-4 text-[14px] text-fg-muted hover:text-fg" />
        <div className="mt-6 flex gap-3 rounded-[18px] bg-surface p-4 shadow-card">
          <Truck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div><p className="text-[14px] font-medium">{t("shipping")}</p><p className="text-[13px] text-fg-muted">{t("shippingBody")}</p></div>
        </div>
      </div>

      {/* Sticky buy bar on phones */}
      {stickyBar && <div className="glass fixed inset-x-0 bottom-14 z-30 flex gap-2 border-x-0 border-b-0 p-3 md:hidden">
        <button aria-label="Wishlist" onClick={onWish} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-fill">
          <Heart className={cn("h-5 w-5", wished && "fill-sale text-sale")} />
        </button>
        <Button variant="secondary" className="h-12 flex-1" disabled={!inStock || busy} onClick={onAdd}>{t("addToCart")}</Button>
        <Button className="h-12 flex-1" disabled={!inStock} onClick={onBuy}>{p.preorder ? t("preorderNow") : t("buyNow")}</Button>
      </div>}

      <Dialog open={guide} onClose={() => setGuide(false)} title={t("sizeGuide")} className="md:max-w-2xl">
        <div className="rich overflow-x-auto text-[14px]" dangerouslySetInnerHTML={{ __html: p.sizeGuideHtml ?? "" }} />
      </Dialog>
    </div>
  );
}
