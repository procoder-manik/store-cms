"use client";
import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatBDT } from "@/lib/utils";
import { updateCartItemAction } from "@/lib/store/actions";
import type { CartView } from "@/lib/cart/server";
import { Quantity } from "./quantity";

export function CartLines({ cart, onChange }: { cart: CartView; onChange: (c: CartView) => void }) {
  const t = useTranslations("cart");
  const locale = useLocale() as "en" | "bn";
  const [pending, start] = useTransition();
  const update = (id: string, qty: number) => start(async () => { const r = await updateCartItemAction(id, qty); if (r.ok) onChange(r.data!); });
  return (
    <ul className={pending ? "opacity-60 transition-opacity" : undefined}>
      {cart.lines.map((l) => (
        <li key={l.id} className="flex gap-3 border-b border-line py-4 last:border-0">
          <Link href={`/product/${l.slug}`} className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {l.image ? <img src={l.image} alt="" className="h-20 w-20 rounded-[14px] object-cover" /> : <span className="block h-20 w-20 rounded-[14px] bg-fill" />}
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/product/${l.slug}`} className="line-clamp-2 text-[14px] leading-snug">{l.title}</Link>
            {l.variantTitle && <p className="text-[12px] text-fg-muted">{l.variantTitle}</p>}
            {!l.ok && <p className="text-[12px] text-danger">{l.available ? t("limited", { count: l.available }) : t("unavailable")}</p>}
            <div className="mt-2 flex items-center justify-between gap-2">
              <Quantity size="sm" value={l.quantity} max={l.available ?? 99} onChange={(v) => update(l.id, v)} />
              <span className="text-[15px] font-semibold">{formatBDT(l.price * l.quantity, locale)}</span>
            </div>
          </div>
          <button aria-label={t("remove")} onClick={() => update(l.id, 0)} className="self-start p-1 text-fg-subtle hover:text-danger"><Trash2 className="h-4 w-4" /></button>
        </li>
      ))}
    </ul>
  );
}
