"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Star, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonClass } from "@/components/ui/button";
import { useCompare } from "@/components/store/compare";
import { compareProductsAction } from "@/lib/store/actions";
import { formatBDT } from "@/lib/utils";

type P = Awaited<ReturnType<typeof compareProductsAction>>[number];

export function ComparePage() {
  const t = useTranslations();
  const locale = useLocale() as "en" | "bn";
  const { items, remove } = useCompare();
  const [rows, setRows] = useState<P[] | null>(null);
  const ids = items.map((i) => i.id).join(",");
  useEffect(() => { compareProductsAction(ids ? ids.split(",") : []).then(setRows); }, [ids]);
  const labels = [...new Set((rows ?? []).flatMap((p) => p.specs.map((s) => s.label)))].slice(0, 20);

  return (
    <div className="container-x py-10 md:py-14">
      <h1 className="headline text-[34px] md:text-[44px]">{t("product.compare")}</h1>
      {rows && !rows.length && <div className="mt-10 text-center"><p className="text-fg-muted">{t("compare.empty")}</p><Link href="/shop" className={buttonClass("primary", "lg", "mt-5")}>{t("cart.continue")}</Link></div>}
      {!!rows?.length && (
        <div className="mt-8 overflow-x-auto rounded-[var(--radius-card)] bg-surface shadow-card">
          <table className="w-full min-w-[640px] text-left text-[14px]">
            <tbody>
              <tr className="align-top">
                <th className="w-40 p-4" />
                {rows.map((p) => (
                  <td key={p.id} className="relative p-4">
                    <button onClick={() => remove(p.id)} aria-label="Remove" className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-fill"><X className="h-3.5 w-3.5" /></button>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.image && <img src={p.image} alt="" className="aspect-square w-full max-w-[200px] rounded-[var(--radius-card)] object-cover" />}
                    <Link href={`/product/${p.slug}`} className="mt-3 line-clamp-2 block font-medium hover:text-accent">{p.title}</Link>
                    <Link href={`/product/${p.slug}`} className={buttonClass("primary", "sm", "mt-3")}>{t("product.details")}</Link>
                  </td>
                ))}
              </tr>
              {[
                [t("compare.price"), (p: P) => <span className="font-semibold">{formatBDT(p.price, locale)}{p.compareAtPrice && p.compareAtPrice > p.price && <span className="ml-2 text-[12px] font-normal text-fg-subtle line-through">{formatBDT(p.compareAtPrice, locale)}</span>}</span>],
                [t("compare.rating"), (p: P) => p.ratingCount ? <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-warning text-warning" />{p.rating.toFixed(1)} ({p.ratingCount})</span> : "-"],
                [t("compare.stock"), (p: P) => <span className={p.inStock ? "text-success" : "text-danger"}>{p.inStock ? t("product.inStock") : t("product.outOfStock")}</span>],
                [t("compare.brand"), (p: P) => p.brand || "-"],
                [t("compare.summary"), (p: P) => <span className="text-fg-muted">{p.summary || "-"}</span>],
                ...labels.map((l) => [l, (p: P) => p.specs.find((s) => s.label === l)?.value ?? "-"] as const),
              ].map(([label, cell]) => (
                <tr key={label as string} className="border-t border-line align-top">
                  <th className="p-4 text-[13px] font-medium text-fg-muted">{label as string}</th>
                  {rows.map((p) => <td key={p.id} className="p-4">{(cell as (p: P) => React.ReactNode)(p)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
