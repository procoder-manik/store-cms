"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const SORTS = ["newest", "popular", "price_asc", "price_desc", "rating"] as const;

export function Filters({ total }: { total: number }) {
  const t = useTranslations("shop");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState(params.get("min") ?? "");
  const [max, setMax] = useState(params.get("max") ?? "");
  const [inStock, setInStock] = useState(params.get("stock") === "1");
  const [rating, setRating] = useState(params.get("rating") ?? "");

  const push = (patch: Record<string, string>) => {
    const p = new URLSearchParams(params.toString());
    Object.entries(patch).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    p.delete("page");
    router.push(`${pathname}?${p.toString()}`, { scroll: false });
  };
  const apply = () => { push({ min, max, stock: inStock ? "1" : "", rating }); setOpen(false); };
  const clear = () => { setMin(""); setMax(""); setInStock(false); setRating(""); push({ min: "", max: "", stock: "", rating: "" }); setOpen(false); };
  const active = ["min", "max", "stock", "rating"].filter((k) => params.get(k)).length;

  const panel = (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-[14px] font-medium">{t("price")}</p>
        <div className="flex items-center gap-2">
          <Input inputMode="numeric" placeholder={t("min")} value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} className="h-10" aria-label={t("min")} />
          <span className="text-fg-subtle">to</span>
          <Input inputMode="numeric" placeholder={t("max")} value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} className="h-10" aria-label={t("max")} />
        </div>
      </div>
      <div>
        <p className="mb-2 text-[14px] font-medium">{t("rating")}</p>
        <div className="flex flex-wrap gap-2">
          {["4", "3"].map((r) => (
            <button key={r} onClick={() => setRating(rating === r ? "" : r)}
              className={cn("h-9 rounded-full px-4 text-[13px]", rating === r ? "bg-fg text-background" : "bg-fill")}>{t("andUp", { n: r })}</button>
          ))}
        </div>
      </div>
      <Switch checked={inStock} onChange={setInStock} label={t("inStock")} />
      <div className="flex gap-2">
        <Button className="flex-1" onClick={apply}>{t("apply")}</Button>
        {active > 0 && <Button variant="ghost" onClick={clear}>{t("clear")}</Button>}
      </div>
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[14px] text-fg-muted">{t("results", { count: total })}</p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)} className="lg:hidden">
            <SlidersHorizontal className="h-4 w-4" />{t("filters")}{active > 0 && ` (${active})`}
          </Button>
          <Select aria-label={t("sort")} value={params.get("sort") ?? "newest"} onChange={(e) => push({ sort: e.target.value === "newest" ? "" : e.target.value })} className="h-9 w-auto rounded-full text-[13px]">
            {SORTS.map((s) => <option key={s} value={s}>{t(`sorts.${s}`)}</option>)}
          </Select>
        </div>
      </div>
      <aside className="hidden lg:block lg:absolute lg:left-0 lg:top-14 lg:z-10 lg:w-60">{panel}</aside>
      <Dialog open={open} onClose={() => setOpen(false)} title={t("filters")}>{panel}</Dialog>
    </>
  );
}
