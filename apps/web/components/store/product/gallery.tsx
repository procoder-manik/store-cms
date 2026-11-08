"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { ProductDetail } from "@/lib/data/catalog";

type Media = ProductDetail["media"][number];

/** Swipeable gallery with thumbnails, inline video and a fullscreen zoom view. */
export function Gallery({ media, title, focusValue, thumbs = "bottom" }: { media: Media[]; title: string; focusValue?: string | null; thumbs?: "bottom" | "left" }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  // Videos first: a short clip sells better than a still photo
  const ordered = [...media.filter((m) => m.type === "video"), ...media.filter((m) => m.type !== "video")];
  const list = ordered.length ? ordered : [{ type: "image" as const, url: "", thumbnail: null, alt: null, optionValue: null }];
  const poster = list.find((m) => m.type === "image")?.url;

  // Play the visible video (muted, looping), pause the others
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === index) v.play().catch(() => {}); else v.pause();
    });
  }, [index]);

  // Jump to the first image tagged for the chosen option (e.g. color)
  useEffect(() => {
    if (!focusValue) return;
    const i = list.findIndex((m) => m.optionValue === focusValue);
    if (i >= 0) go(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusValue]);

  function go(i: number) {
    const n = (i + list.length) % list.length;
    setIndex(n);
    trackRef.current?.scrollTo({ left: n * trackRef.current.clientWidth, behavior: "smooth" });
  }

  return (
    <div className={cn("md:sticky md:top-20", thumbs === "left" && "md:flex md:flex-row-reverse md:items-start md:gap-3")}>
      <div className={cn("group relative overflow-hidden rounded-[var(--radius-sheet)] bg-surface", thumbs === "left" && "md:min-w-0 md:flex-1")}>
        <div ref={trackRef} className="no-scrollbar flex aspect-square snap-x snap-mandatory overflow-x-auto"
          onScroll={(e) => { const el = e.currentTarget; setIndex(Math.round(el.scrollLeft / el.clientWidth)); }}>
          {list.map((m, i) => (
            <div key={m.url + i} className="relative aspect-square w-full shrink-0 snap-center">
              {m.type === "video" ? (
                <video src={m.url} poster={m.thumbnail ?? undefined} controls playsInline muted={i !== index} className="h-full w-full object-contain" />
              ) : m.url ? (
                <button type="button" onClick={() => setZoom(true)} className="relative block h-full w-full cursor-zoom-in" aria-label="Zoom image">
                  <Image src={m.url} alt={m.alt ?? title} fill priority={i === 0} sizes="(min-width:768px) 50vw, 100vw" className="object-cover" />
                </button>
              ) : <div className="h-full w-full bg-fill" />}
            </div>
          ))}
        </div>
        {list.length > 1 && (
          <>
            <button onClick={() => go(index - 1)} aria-label="Previous" className="glass absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 md:flex"><ChevronLeft className="h-5 w-5" /></button>
            <button onClick={() => go(index + 1)} aria-label="Next" className="glass absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 md:flex"><ChevronRight className="h-5 w-5" /></button>
            <div className="glass pointer-events-none absolute left-1/2 top-3 flex -translate-x-1/2 gap-1.5 rounded-full px-2.5 py-1.5 md:hidden">
              {list.map((_, i) => <span key={i} className={cn("h-1.5 rounded-full transition-all", i === index ? "w-4 bg-fg" : "w-1.5 bg-fg-subtle")} />)}
            </div>
          </>
        )}
      </div>
      {list.length > 1 && (
        <div className={cn("no-scrollbar mt-3 hidden gap-2 overflow-x-auto md:flex", thumbs === "left" && "md:mt-0 md:max-h-[560px] md:w-16 md:shrink-0 md:flex-col md:overflow-y-auto md:overflow-x-visible")}>
          {list.map((m, i) => (
            <button key={m.url + i} onClick={() => go(i)} aria-label={`Show media ${i + 1}`}
              className={cn("relative h-16 w-16 shrink-0 overflow-hidden rounded-[12px] bg-surface", i === index ? "ring-2 ring-accent" : "opacity-70 hover:opacity-100")}>
              {m.type === "video" ? (
                <>{(m.thumbnail ?? poster) && <Image src={(m.thumbnail ?? poster)!} alt="" fill sizes="64px" className="object-cover" />}<span className="absolute inset-0 bg-black/30" /><Play className="absolute inset-0 m-auto h-5 w-5 fill-white text-white" /></>
              ) : m.url && <Image src={m.url} alt="" fill sizes="64px" className="object-cover" />}
            </button>
          ))}
        </div>
      )}
      {zoom && list[index]?.type === "image" && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90" onClick={() => setZoom(false)} role="dialog" aria-modal="true">
          <button aria-label="Close" className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white"><X className="h-5 w-5" /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={list[index]?.url} alt={list[index]?.alt ?? title} className="max-h-[92vh] max-w-[96vw] touch-pinch-zoom object-contain" onClick={(e) => e.stopPropagation()} />
        </div>, document.body)}
    </div>
  );
}
