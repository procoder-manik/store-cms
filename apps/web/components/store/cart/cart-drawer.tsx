"use client";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonClass } from "@/components/ui/button";
import { formatBDT } from "@/lib/utils";
import { useCart } from "./cart-provider";
import { CartLines } from "./cart-lines";

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("cart");
  const locale = useLocale() as "en" | "bn";
  const { cart, setCart } = useCart();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div className="absolute inset-0 bg-black/25" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.aside role="dialog" aria-modal="true" aria-label={t("title")}
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="glass absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-y-0 border-r-0 shadow-float">
            <header className="flex items-center justify-between px-5 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))]">
              <h2 className="text-[19px] font-semibold tracking-tight">{t("title")}</h2>
              <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full bg-fill"><X className="h-4 w-4" /></button>
            </header>
            <div className="flex-1 overflow-y-auto px-5">
              {!cart ? <div className="space-y-3 py-4">{[0, 1].map((i) => <div key={i} className="h-20 animate-pulse rounded-[14px] bg-fill" />)}</div>
                : cart.lines.length ? <CartLines cart={cart} onChange={setCart} />
                : (
                  <div className="flex flex-col items-center py-16 text-center">
                    <ShoppingBag className="h-10 w-10 text-fg-subtle" strokeWidth={1.5} />
                    <p className="mt-3 font-medium">{t("empty")}</p>
                    <p className="text-[14px] text-fg-muted">{t("emptyBody")}</p>
                  </div>
                )}
            </div>
            {cart && cart.lines.length > 0 && (
              <footer className="space-y-3 border-t border-line px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
                <div className="flex justify-between text-[17px] font-semibold"><span>{t("subtotal")}</span><span>{formatBDT(cart.subtotal, locale)}</span></div>
                <p className="text-[12px] text-fg-muted">{t("shippingAtCheckout")}</p>
                <Link href="/checkout" onClick={onClose} className={buttonClass("primary", "lg", "w-full")}>{t("checkout")}</Link>
                <Link href="/cart" onClick={onClose} className={buttonClass("ghost", "md", "w-full")}>{t("viewCart")}</Link>
              </footer>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
