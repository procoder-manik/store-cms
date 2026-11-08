"use client";
import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InfoTab { id: string; label: string; node: ReactNode }

/** Description, specifications and reviews as tabs or an accordion. */
export function ProductInfo({ mode, tabs }: { mode: "tabs" | "accordion"; tabs: InfoTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const [open, setOpen] = useState<Record<string, boolean>>({ [tabs[0]?.id ?? ""]: true });
  if (!tabs.length) return null;
  if (mode === "accordion") {
    return (
      <div className="divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-card">
        {tabs.map((t) => (
          <div key={t.id}>
            <button type="button" aria-expanded={!!open[t.id]} onClick={() => setOpen((o) => ({ ...o, [t.id]: !o[t.id] }))} className="flex w-full items-center justify-between px-5 py-4 text-left text-[16px] font-medium">
              {t.label}<ChevronDown className={cn("h-4 w-4 transition-transform", open[t.id] && "rotate-180")} />
            </button>
            {open[t.id] && <div className="px-5 pb-5">{t.node}</div>}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div>
      <div role="tablist" className="no-scrollbar flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={active === t.id} onClick={() => setActive(t.id)}
            className={cn("-mb-px shrink-0 border-b-2 px-4 py-3 text-[15px] font-medium transition-colors", active === t.id ? "border-accent text-fg" : "border-transparent text-fg-muted hover:text-fg")}>{t.label}</button>
        ))}
      </div>
      <div className="pt-6" role="tabpanel">{tabs.find((t) => t.id === active)?.node}</div>
    </div>
  );
}
