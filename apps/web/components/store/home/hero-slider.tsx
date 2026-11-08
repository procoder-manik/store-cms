"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Banner = { id: string; title: string | null; subtitle: string | null; image_url: string | null; mobile_image_url: string | null; link_url: string | null };

/** Admin-managed hero banners. Auto-advances every 6 s, pauses on hover. */
export function HeroSlider({ banners }: { banners: Banner[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (banners.length < 2 || paused) return;
    const id = setInterval(() => setI((x) => (x + 1) % banners.length), 6000);
    return () => clearInterval(id);
  }, [banners.length, paused]);
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-sheet)] bg-surface" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="relative aspect-[4/5] sm:aspect-[16/7]">
        {banners.map((b, n) => (
          <Link key={b.id} href={b.link_url || "/shop"} aria-hidden={n !== i} tabIndex={n === i ? 0 : -1}
            className={cn("absolute inset-0 transition-opacity duration-700", n === i ? "opacity-100" : "pointer-events-none opacity-0")}>
            {b.image_url && (
              <picture>
                {b.mobile_image_url && <source media="(max-width: 639px)" srcSet={b.mobile_image_url} />}
                <Image src={b.image_url} alt={b.title ?? ""} fill priority={n === 0} sizes="100vw" className="object-cover" />
              </picture>
            )}
            {(b.title || b.subtitle) && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-6 text-white md:p-12">
                {b.title && <p className="headline text-[30px] md:text-[52px]">{b.title}</p>}
                {b.subtitle && <p className="mt-2 max-w-xl text-[15px] opacity-90 md:text-[19px]">{b.subtitle}</p>}
              </div>
            )}
          </Link>
        ))}
      </div>
      {banners.length > 1 && (
        <div className="glass absolute bottom-4 right-4 flex gap-1.5 rounded-full px-2.5 py-1.5">
          {banners.map((_, n) => (
            <button key={n} onClick={() => setI(n)} aria-label={`Slide ${n + 1}`} className={cn("h-1.5 rounded-full transition-all", n === i ? "w-5 bg-fg" : "w-1.5 bg-fg-subtle")} />
          ))}
        </div>
      )}
    </div>
  );
}
