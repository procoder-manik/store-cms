"use client";
import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ShoppingBag } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonClass } from "@/components/ui/button";
import { useCart } from "@/components/store/cart/cart-provider";
import { CartLines } from "@/components/store/cart/cart-lines";
import { getCartAction } from "@/lib/store/actions";
import { formatBDT } from "@/lib/utils";

export function CartPageClient() {
  const t = useTranslations("cart");
  const locale = useLocale() as "en" | "bn";
  const { cart, setCart } = useCart();
  useEffect(() => { getCartAction().then(setCart); }, [setCart]);

  return (
    <div className="container-x py-10 md:py-14">
      <h1 className="headline text-[34px] md:text-[44px]">{t("title")}</h1>
      {!cart ? <div className="mt-8 h-40 animate-pulse rounded-[20px] bg-fill" /> : cart.lines.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <ShoppingBag className="h-12 w-12 text-fg-subtle" strokeWidth={1.5} />
          <p className="mt-4 text-[19px] font-medium">{t("empty")}</p>
          <p className="text-fg-muted">{t("emptyBody")}</p>
          <Link href="/shop" className={buttonClass("primary", "lg", "mt-6")}>{t("continue")}</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[20px] bg-surface px-5 shadow-card"><CartLines cart={cart} onChange={setCart} /></div>
          <aside className="h-fit space-y-3 rounded-[20px] bg-surface p-5 shadow-card lg:sticky lg:top-20">
            <div className="flex justify-between text-[17px] font-semibold"><span>{t("subtotal")}</span><span>{formatBDT(cart.subtotal, locale)}</span></div>
            <p className="text-[13px] text-fg-muted">{t("shippingAtCheckout")}</p>
            <Link href="/checkout" className={buttonClass("primary", "lg", "w-full")}>{t("checkout")}</Link>
            <Link href="/shop" className={buttonClass("ghost", "md", "w-full")}>{t("continue")}</Link>
          </aside>
        </div>
      )}
    </div>
  );
}
