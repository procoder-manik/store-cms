"use client";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, GitCompareArrows, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const KEY = "compare_items";
const EVT = "compare-change";
type Item = { id: string; title: string; image: string | null };

function read(): Item[] { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } }
function write(items: Item[]) { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* ignore */ } window.dispatchEvent(new Event(EVT)); }

/** Compare list shared across the site (up to 4 products, saved on this device). */
export function useCompare() {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => { const sync = () => setItems(read()); sync(); window.addEventListener(EVT, sync); window.addEventListener("storage", sync); return () => { window.removeEventListener(EVT, sync); window.removeEventListener("storage", sync); }; }, []);
  const toggle = useCallback((it: Item) => {
    const cur = read();
    if (cur.some((x) => x.id === it.id)) { write(cur.filter((x) => x.id !== it.id)); return "removed" as const; }
    if (cur.length >= 4) return "full" as const;
    write([...cur, it]); return "added" as const;
  }, []);
  const remove = useCallback((id: string) => write(read().filter((x) => x.id !== id)), []);
  return { items, toggle, remove, clear: () => write([]) };
}

export function CompareButton({ item, className, withLabel }: { item: Item; className?: string; withLabel?: boolean }) {
  const t = useTranslations("product");
  const toast = useToast();
  const { items, toggle } = useCompare();
  const on = items.some((x) => x.id === item.id);
  return (
    <button type="button" aria-pressed={on} aria-label={t("compare")} onClick={(e) => { e.preventDefault(); const r = toggle(item); if (r === "full") toast(t("compareFull"), "error"); else if (r === "added") toast(t("compareAdded")); }}
      className={cn("flex items-center justify-center gap-2", on && "text-accent", className)}>
      <GitCompareArrows className="h-4 w-4" />{withLabel && t("compare")}
    </button>
  );
}

/** Floating bar at the bottom when products are in the compare list. */
export function CompareBar() {
  const t = useTranslations("product");
  const pathname = usePathname();
  const { items, remove } = useCompare();
  if (!items.length || pathname.startsWith("/compare") || pathname.startsWith("/checkout")) return null;
  return (
    <div className="glass fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full py-1.5 pl-2 pr-1.5 shadow-float md:bottom-6">
      {items.map((x) => (
        <span key={x.id} className="group relative h-9 w-9 overflow-hidden rounded-full bg-fill">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {x.image && <img src={x.image} alt={x.title} className="h-full w-full object-cover" />}
          <button onClick={() => remove(x.id)} aria-label="Remove" className="absolute inset-0 hidden items-center justify-center bg-black/50 text-white group-hover:flex"><X className="h-3.5 w-3.5" /></button>
        </span>
      ))}
      <Link href="/compare" className="ml-1 flex h-9 items-center gap-1.5 rounded-full bg-accent px-4 text-[13px] font-medium text-accent-contrast">{t("compare")} ({items.length})<ArrowRight className="h-4 w-4" /></Link>
    </div>
  );
}
