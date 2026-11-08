"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import { flatNav } from "./sidebar";
import { adminSearchAction, type Hit } from "@/app/admin/(shell)/search-actions";

/** Ctrl+K (or Cmd+K): jump to any admin page or find an order, product, customer, page or post. */
export function QuickSearch({ permissions }: { permissions: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const all = permissions.includes("*");

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); } if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  useEffect(() => { if (open) { setQ(""); setHits([]); setSel(0); setTimeout(() => input.current?.focus(), 30); } }, [open]);
  useEffect(() => { const id = setTimeout(async () => setHits(q.trim().length > 1 ? await adminSearchAction(q) : []), 220); return () => clearTimeout(id); }, [q]);

  const pages = useMemo(() => flatNav().filter((n) => all || permissions.includes(n.perm)), [all, permissions]);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const p = pages.filter((n) => !t || n.label.toLowerCase().includes(t)).slice(0, t ? 6 : 8).map((n) => ({ kind: "Go to", title: n.label, sub: undefined as string | undefined, href: n.href }));
    return [...p, ...hits];
  }, [pages, hits, q]);
  const go = (href: string) => { setOpen(false); router.push(href); };

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Search" className="flex h-10 items-center gap-2 rounded-full bg-fill px-3 text-[13px] text-fg-muted hover:text-fg sm:w-56">
        <Search className="h-4 w-4" /><span className="hidden flex-1 text-left sm:block">Search</span><kbd className="hidden rounded bg-surface px-1.5 text-[11px] sm:block">Ctrl K</kbd>
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center px-3 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="glass relative w-full max-w-xl overflow-hidden rounded-[20px] shadow-float">
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="h-4 w-4 text-fg-subtle" />
              <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }} placeholder="Search pages, orders, products, customers" aria-label="Search"
                onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(list.length - 1, s + 1)); } if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); } if (e.key === "Enter" && list[sel]) go(list[sel]!.href); }}
                className="h-14 flex-1 bg-transparent text-[16px] outline-none placeholder:text-fg-subtle" />
            </div>
            <ul className="max-h-[50vh] overflow-y-auto p-2">
              {list.map((h, i) => (
                <li key={`${h.href}-${i}`}>
                  <button onClick={() => go(h.href)} onMouseEnter={() => setSel(i)} className={`flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[14px] ${i === sel ? "bg-accent-soft" : ""}`}>
                    <span className="w-16 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">{h.kind}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate">{h.title}</span>{h.sub && <span className="block truncate text-[12px] text-fg-muted">{h.sub}</span>}</span>
                    {i === sel && <CornerDownLeft className="h-4 w-4 text-fg-subtle" />}
                  </button>
                </li>))}
              {!list.length && <li className="p-6 text-center text-[14px] text-fg-muted">Nothing found.</li>}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
