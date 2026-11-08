"use client";
import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Touch-friendly horizontal carousel with arrow buttons (scroll-snap, no library). */
export function Carousel({ children, itemClass = "w-[46%] sm:w-[31%] lg:w-[23%]", autoplay = 0, className }: { children: ReactNode; itemClass?: string; autoplay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const update = () => {
    const el = ref.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  };
  const go = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: "smooth" });
  useEffect(() => {
    update();
    if (!autoplay) return;
    const id = setInterval(() => {
      const el = ref.current;
      if (!el || el.matches(":hover")) return;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 8) el.scrollTo({ left: 0, behavior: "smooth" }); else go(1);
    }, autoplay);
    return () => clearInterval(id);
  }, [autoplay]);
  return (
    <div className={cn("group/car relative", className)}>
      <div ref={ref} onScroll={update} className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-2">
        {Children.map(children, (c) => <div className={cn("shrink-0 snap-start", itemClass)}>{c}</div>)}
      </div>
      {!edges.start && <button onClick={() => go(-1)} aria-label="Previous" className="glass absolute -left-3 top-1/3 hidden h-11 w-11 items-center justify-center rounded-full shadow-float md:flex"><ChevronLeft className="h-5 w-5" /></button>}
      {!edges.end && <button onClick={() => go(1)} aria-label="Next" className="glass absolute -right-3 top-1/3 hidden h-11 w-11 items-center justify-center rounded-full shadow-float md:flex"><ChevronRight className="h-5 w-5" /></button>}
    </div>
  );
}
