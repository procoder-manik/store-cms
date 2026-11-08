"use client";
import { Facebook, Link2, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { useToast } from "@/components/ui/toast";

/** Share to WhatsApp, Facebook, or copy the link. */
export function ShareButtons({ title, className }: { title: string; className?: string }) {
  const t = useTranslations("share");
  const toast = useToast();
  const pathname = usePathname();
  const url = () => `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}${pathname}`;
  const open = (href: (u: string) => string) => window.open(href(encodeURIComponent(url())), "_blank", "noopener,noreferrer,width=600,height=500");
  const btn = "flex h-9 items-center gap-2 rounded-full bg-fill px-3.5 text-[13px] font-medium transition-colors hover:bg-accent-soft hover:text-accent";
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      <span className="text-[13px] text-fg-muted">{t("share")}</span>
      <button type="button" className={btn} onClick={() => open((u) => `https://wa.me/?text=${encodeURIComponent(title)}%20${u}`)}><MessageCircle className="h-4 w-4" />WhatsApp</button>
      <button type="button" className={btn} onClick={() => open((u) => `https://www.facebook.com/sharer/sharer.php?u=${u}`)}><Facebook className="h-4 w-4" />Facebook</button>
      <button type="button" className={btn} onClick={() => { navigator.clipboard.writeText(url()); toast(t("copied")); }}><Link2 className="h-4 w-4" />{t("copy")}</button>
    </div>
  );
}
