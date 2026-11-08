"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/dialog";
import { formatBDT } from "@/lib/utils";
import { CheckoutForm, type CheckoutDefaults, type CheckoutFields, type PayMethod } from "../checkout/checkout-form";
import { Quantity } from "./quantity";

export interface QuickItem {
  productId: string; variantId: string | null; quantity: number; title: string;
  variantTitle?: string | null; image?: string | null; price: number; max?: number | null;
}

/** "Buy now" sheet: one product, delivery details and COD in a single step. */
export function QuickCheckout({ item, onClose, isGuest, defaults, methods, fields }: { item: QuickItem | null; onClose: () => void; isGuest: boolean; defaults?: CheckoutDefaults; methods?: PayMethod[]; fields?: CheckoutFields }) {
  const t = useTranslations("checkout");
  const locale = useLocale() as "en" | "bn";
  const [qty, setQty] = useState(1);
  useEffect(() => { if (item) setQty(item.quantity); }, [item]);

  return (
    <Dialog open={!!item} onClose={onClose} title={t("quickTitle")} className="md:max-w-xl">
      {item && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-[16px] bg-fill/60 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {item.image ? <img src={item.image} alt="" className="h-16 w-16 rounded-[12px] object-cover" /> : <span className="h-16 w-16 rounded-[12px] bg-fill" />}
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[14px] leading-snug">{item.title}</p>
              {item.variantTitle && <p className="text-[12px] text-fg-muted">{item.variantTitle}</p>}
              <p className="mt-0.5 text-[15px] font-semibold">{formatBDT(item.price, locale)}</p>
            </div>
            <Quantity size="sm" value={qty} max={item.max ?? 99} onChange={(v) => setQty(Math.max(1, v))} />
          </div>
          <CheckoutForm compact isGuest={isGuest} defaults={defaults} onPlaced={onClose} methods={methods} fields={fields}
            items={[{ product_id: item.productId, variant_id: item.variantId, quantity: qty }]} />
        </div>
      )}
    </Dialog>
  );
}
