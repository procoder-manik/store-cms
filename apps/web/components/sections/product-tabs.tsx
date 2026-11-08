"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ProductCardData } from "@/lib/data/catalog";
import type { CardId } from "@/lib/theme/presets";
import { ProductCard } from "@/components/store/product-card";

export function ProductTabs({ tabs, card }: { tabs: { label: string; items: ProductCardData[] }[]; card?: CardId }) {
  const [i, setI] = useState(0);
  return (
    <div>
      <div role="tablist" className="no-scrollbar mx-auto flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-fill p-1">
        {tabs.map((t, n) => (
          <button key={t.label} role="tab" aria-selected={i === n} onClick={() => setI(n)}
            className={cn("h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-[14px] transition-all", i === n ? "bg-surface font-medium shadow-card" : "text-fg-muted")}>{t.label}</button>
        ))}
      </div>
      <div key={i} className="fade-up mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
        {tabs[i]?.items.map((p) => <ProductCard key={p.id} product={p} variant={card} />)}
      </div>
    </div>
  );
}
