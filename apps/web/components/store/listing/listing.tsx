import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { listProducts, type ListParams, type SortKey } from "@/lib/data/catalog";
import { ProductCard } from "../product-card";
import { Filters } from "./filters";
import { getTemplates } from "@/lib/theme/templates-server";
import { cn } from "@/lib/utils";

export type SearchParams = Record<string, string | undefined>;
export function parseListParams(sp: SearchParams, pageSize = 24): ListParams {
  const num = (v?: string) => (v && /^\d+$/.test(v) ? Number(v) : undefined);
  const sorts: SortKey[] = ["newest", "popular", "price_asc", "price_desc", "rating"];
  return {
    min: num(sp.min), max: num(sp.max), inStock: sp.stock === "1", rating: num(sp.rating),
    sort: sorts.includes(sp.sort as SortKey) ? (sp.sort as SortKey) : "newest", page: num(sp.page) ?? 1, pageSize,
  };
}

/** Product grid with filters, sort and pagination. Used by shop, category, search and deals. */
export async function Listing({ base, sp, extra, header }: { base: string; sp: SearchParams; extra?: Partial<ListParams>; header: ReactNode }) {
  const t = await getTranslations("shop");
  const tpl = (await getTemplates()).shop;
  const PAGE_SIZE = tpl.per_page;
  const params = { ...parseListParams(sp, PAGE_SIZE), ...extra, pageSize: extra?.pageSize ?? PAGE_SIZE };
  const { items, total } = await listProducts(params);
  const pages = Math.max(1, Math.ceil(total / (params.pageSize ?? PAGE_SIZE)));
  const cols = { 2: "xl:grid-cols-2", 3: "xl:grid-cols-3", 4: "xl:grid-cols-4", 5: "xl:grid-cols-5" }[tpl.columns];
  const side = tpl.filters === "sidebar";
  const page = params.page ?? 1;
  const href = (n: number) => {
    const p = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    if (n > 1) p.set("page", String(n)); else p.delete("page");
    const s = p.toString();
    return s ? `${base}?${s}` : base;
  };

  return (
    <div className="container-x pt-8 md:pt-12">
      {header}
      <div className={cn("relative mt-8 min-h-[32rem]", side && "lg:pl-72")}>
        {side ? <Filters total={total} /> : tpl.show_count && <p className="text-[14px] text-fg-muted">{total}</p>}
        {items.length ? (
          <div className={cn("mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3", cols)}>
            {items.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 4} variant={tpl.card || undefined} />)}
          </div>
        ) : <p className="mt-16 text-center text-fg-muted">{t("empty")}</p>}
        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-2">
            {page > 1 && <Link href={href(page - 1)} className="h-10 rounded-full bg-fill px-4 leading-10 text-[14px]">{t("prev")}</Link>}
            <span className="px-3 text-[14px] text-fg-muted">{page} / {pages}</span>
            {page < pages && <Link href={href(page + 1)} className="h-10 rounded-full bg-fill px-4 leading-10 text-[14px]">{t("next")}</Link>}
          </nav>
        )}
      </div>
    </div>
  );
}
