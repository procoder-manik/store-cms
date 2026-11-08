"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { productsByIdsAction } from "@/lib/store/actions";
import type { ProductCardData } from "@/lib/data/catalog";
import { ProductCard } from "../product-card";

const KEY = "recently_viewed";

/** Remembers the last products viewed on this device and shows them (excluding the current one). */
export function RecentlyViewed({ currentId }: { currentId?: string }) {
  const t = useTranslations("product");
  const [items, setItems] = useState<ProductCardData[]>([]);
  useEffect(() => {
    let ids: string[] = [];
    try { ids = JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { ids = []; }
    const others = ids.filter((i) => i !== currentId).slice(0, 8);
    if (currentId) {
      try { localStorage.setItem(KEY, JSON.stringify([currentId, ...others].slice(0, 12))); } catch { /* storage full or blocked */ }
    }
    if (others.length) productsByIdsAction(others).then(setItems);
  }, [currentId]);
  if (!items.length) return null;
  return (
    <section className="container-x mt-20">
      <h2 className="headline text-[26px]">{t("recent")}</h2>
      <div className="no-scrollbar mt-6 grid auto-cols-[46%] grid-flow-col gap-4 overflow-x-auto sm:auto-cols-[30%] lg:auto-cols-[22%]">
        {items.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}
