"use client";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { formatBDT, cn } from "@/lib/utils";
import { searchSuggestAction } from "@/lib/store/actions";

type Suggestion = { slug: string; title: string; price: number; image: string | null };

/** Search field with live product suggestions. Enter opens the full results page. */
export function SearchBox({ className, autoFocus }: { className?: string; autoFocus?: boolean }) {
  const t = useTranslations("nav");
  const locale = useLocale() as "en" | "bn";
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) { setItems([]); return; }
    const id = setTimeout(async () => { setItems(await searchSuggestAction(q)); setActive(-1); }, 200);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const go = () => { if (q.trim()) { setOpen(false); router.push(`/search?q=${encodeURIComponent(q.trim())}`); } };

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <form role="search" onSubmit={(e) => { e.preventDefault(); if (active >= 0 && items[active]) router.push(`/product/${items[active]!.slug}`); else go(); setOpen(false); }}>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
        <input type="search" value={q} autoFocus={autoFocus} placeholder={t("searchPlaceholder")} aria-label={t("search")}
          role="combobox" aria-expanded={open && items.length > 0} aria-controls="search-suggestions" autoComplete="off"
          onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
            if (e.key === "Escape") setOpen(false);
          }}
          className="h-10 w-full rounded-full bg-fill pl-10 pr-4 text-[15px] outline-none placeholder:text-fg-subtle focus:ring-2 focus:ring-accent" />
      </form>
      {open && items.length > 0 && (
        <ul id="search-suggestions" role="listbox" className="glass absolute inset-x-0 top-12 z-50 overflow-hidden rounded-[18px] p-1.5 shadow-float">
          {items.map((s, i) => (
            <li key={s.slug} role="option" aria-selected={i === active}>
              <Link href={`/product/${s.slug}`} onClick={() => setOpen(false)}
                className={cn("flex items-center gap-3 rounded-[12px] p-2 text-[14px]", i === active ? "bg-fill" : "hover:bg-fill")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {s.image ? <img src={s.image} alt="" className="h-10 w-10 rounded-[10px] object-cover" /> : <span className="h-10 w-10 rounded-[10px] bg-fill" />}
                <span className="line-clamp-1 flex-1">{s.title}</span>
                <span className="font-medium">{formatBDT(s.price, locale)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
