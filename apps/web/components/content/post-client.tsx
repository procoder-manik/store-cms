"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Thin bar at the top that fills as you read. */
export function ReadingProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => { const el = document.getElementById("post-body"); if (!el) return; const r = el.getBoundingClientRect(); const total = el.offsetHeight - window.innerHeight * 0.6; setP(Math.max(0, Math.min(1, -r.top / Math.max(1, total)))); };
    on(); window.addEventListener("scroll", on, { passive: true }); window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, []);
  return <div aria-hidden className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-accent transition-transform duration-150" style={{ transform: `scaleX(${p})` }} />;
}

/** Sticky table of contents that highlights the heading in view. */
export function Toc({ items, title }: { items: { id: string; text: string; level: 2 | 3 }[]; title: string }) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) setActive(vis.target.id);
    }, { rootMargin: "-90px 0px -65% 0px" });
    items.forEach((i) => { const el = document.getElementById(i.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [items]);
  if (items.length < 2) return null;
  return (
    <nav aria-label={title} className="rounded-[var(--radius-card)] bg-surface p-4 shadow-card lg:sticky lg:top-24">
      <p className="mb-2 text-[13px] font-semibold text-fg-muted">{title}</p>
      <ol className="max-h-[60vh] space-y-0.5 overflow-y-auto text-[14px]">
        {items.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`} className={cn("block rounded-[8px] border-l-2 py-1.5 pr-2 transition-colors", i.level === 3 ? "pl-6" : "pl-3", active === i.id ? "border-accent bg-accent-soft font-medium text-fg" : "border-transparent text-fg-muted hover:text-fg")}>{i.text}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
