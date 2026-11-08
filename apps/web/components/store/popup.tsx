"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Copy } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { buttonClass } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { trackPopupAction } from "@/lib/store/actions";

export interface PopupData {
  id: string; title: string; body: string | null; image_url: string | null; cta_label: string | null; cta_url: string | null; coupon: string | null;
  trigger: { type: "delay" | "exit" | "scroll" | "entry"; value: number }; targeting: { pages: string[]; devices: string[] }; frequency: string;
}

const KEY = (id: string) => `popup_seen_${id}`;
function seen(p: PopupData) {
  try {
    if (p.frequency === "every_visit") return false;
    if (p.frequency === "once_per_session") return sessionStorage.getItem(KEY(p.id)) === "1";
    const v = localStorage.getItem(KEY(p.id));
    if (!v) return false;
    return p.frequency === "once_ever" || Date.now() - Number(v) < 86400000;
  } catch { return false; }
}
function markSeen(p: PopupData) {
  try { sessionStorage.setItem(KEY(p.id), "1"); localStorage.setItem(KEY(p.id), String(Date.now())); } catch { /* blocked storage */ }
}
function pageMatches(patterns: string[], path: string) {
  const clean = path.replace(/^\/bn(?=\/|$)/, "") || "/";
  return patterns.some((p) => p === "*" || p === clean || (p.endsWith("*") && clean.startsWith(p.slice(0, -1))));
}

/** Shows the first eligible popup, honouring trigger, pages, device and frequency. */
export function PopupHost({ popups }: { popups: PopupData[] }) {
  const pathname = usePathname();
  const toast = useToast();
  const [active, setActive] = useState<PopupData | null>(null);

  useEffect(() => {
    if (/\/(checkout|cart|order)/.test(pathname)) return;
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const p = popups.find((x) => pageMatches(x.targeting.pages?.length ? x.targeting.pages : ["*"], pathname)
      && (x.targeting.devices?.[0] ?? "all") !== (mobile ? "desktop" : "mobile") && !seen(x));
    if (!p) return;
    const show = () => { if (!seen(p)) { markSeen(p); setActive(p); trackPopupAction(p.id, "view"); } };
    const t = p.trigger;
    if (t.type === "entry") { show(); return; }
    if (t.type === "delay") { const id = setTimeout(show, Math.max(0, t.value) * 1000); return () => clearTimeout(id); }
    if (t.type === "scroll") {
      const onScroll = () => { const pct = (window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight)) * 100; if (pct >= t.value) { show(); window.removeEventListener("scroll", onScroll); } };
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }
    if (t.type === "exit") {
      const onLeave = (e: MouseEvent) => { if (e.clientY <= 0) { show(); document.removeEventListener("mouseout", onLeave); } };
      document.addEventListener("mouseout", onLeave);
      return () => document.removeEventListener("mouseout", onLeave);
    }
  }, [pathname, popups]);

  return (
    <Dialog open={!!active} onClose={() => setActive(null)} className="md:max-w-md">
      {active && (
        <div className="-mt-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {active.image_url && <img src={active.image_url} alt="" className="mb-5 aspect-[16/9] w-full rounded-[18px] object-cover" />}
          <h2 className="headline text-[26px]">{active.title}</h2>
          {active.body && <p className="mt-2 text-[15px] text-fg-muted">{active.body}</p>}
          {active.coupon && (
            <button onClick={() => { navigator.clipboard.writeText(active.coupon!); toast("Code copied"); }}
              className="mx-auto mt-5 flex items-center gap-2 rounded-full border-2 border-dashed border-accent px-5 py-2.5 font-mono text-[18px] font-semibold tracking-wider text-accent">
              {active.coupon}<Copy className="h-4 w-4" />
            </button>
          )}
          {active.cta_label && active.cta_url && (
            <a href={active.cta_url} onClick={() => { trackPopupAction(active.id, "click"); setActive(null); }} className={buttonClass("primary", "lg", "mt-6 w-full")}>{active.cta_label}</a>
          )}
        </div>
      )}
    </Dialog>
  );
}
