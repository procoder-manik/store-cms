"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import { addToCartAction, getCartAction } from "@/lib/store/actions";
import type { CartView } from "@/lib/cart/server";
import { CartDrawer } from "./cart-drawer";
import { track } from "@/lib/tracking/client";
import { QuickCheckout, type QuickItem } from "./quick-checkout";
import type { CheckoutDefaults, CheckoutFields, PayMethod } from "../checkout/checkout-form";

interface CartCtx {
  count: number;
  cart: CartView | null;
  openCart: () => void;
  setCart: (c: CartView) => void;
  add: (productId: string, variantId: string | null, qty?: number) => Promise<boolean>;
  buyNow: (item: QuickItem) => void;
}
const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children, initialCount, isGuest, defaults, methods, fields }: {
  children: ReactNode; initialCount: number; isGuest: boolean; defaults?: CheckoutDefaults; methods?: PayMethod[]; fields?: CheckoutFields;
}) {
  const t = useTranslations();
  const toast = useToast();
  const [cart, setCartState] = useState<CartView | null>(null);
  const [count, setCount] = useState(initialCount);
  const [drawer, setDrawer] = useState(false);
  const [quick, setQuick] = useState<QuickItem | null>(null);

  const setCart = useCallback((c: CartView) => { setCartState(c); setCount(c.count); }, []);
  const openCart = useCallback(() => {
    setDrawer(true);
    getCartAction().then(setCart);
  }, [setCart]);

  const add = useCallback(async (productId: string, variantId: string | null, qty = 1) => {
    const r = await addToCartAction(productId, variantId, qty);
    if (!r.ok) {
      toast(r.error === "choose_variant" ? t("product.chooseOption", { name: "" }) : t("checkout.errors.generic"), "error");
      return false;
    }
    setCart(r.data!);
    const line = r.data!.lines.find((l) => l.productId === productId && l.variantId === variantId);
    if (line) track("add_to_cart", { value: line.price * qty, items: [{ item_id: productId, item_name: line.title, price: line.price, quantity: qty, item_variant: line.variantTitle }] });
    toast(t("product.added"));
    setDrawer(true);
    return true;
  }, [setCart, t, toast]);

  return (
    <Ctx.Provider value={{ count, cart, openCart, setCart, add, buyNow: (item) => { track("begin_checkout", { value: item.price * item.quantity, items: [{ item_id: item.productId, item_name: item.title, price: item.price, quantity: item.quantity }] }); setQuick(item); } }}>
      {children}
      <CartDrawer open={drawer} onClose={() => setDrawer(false)} />
      <QuickCheckout item={quick} onClose={() => setQuick(null)} isGuest={isGuest} defaults={defaults} methods={methods} fields={fields} />
    </Ctx.Provider>
  );
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
