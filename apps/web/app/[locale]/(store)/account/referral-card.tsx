"use client";
import { Copy, Gift, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function ReferralCard({ code, link, available, used, points, percentPer, maxPercent, pointsPer }: {
  code: string; link: string; available: number; used: number; points: number; percentPer: number; maxPercent: number; pointsPer: number;
}) {
  const t = useTranslations("referral");
  const toast = useToast();
  const copy = (v: string) => { navigator.clipboard.writeText(v); toast(t("copied")); };
  return (
    <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-surface p-5 shadow-card md:p-6">
      <div aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
      <div className="relative">
        <p className="flex items-center gap-2 text-[17px] font-semibold"><Gift className="h-5 w-5 text-accent" />{t("title")}</p>
        <p className="mt-1 max-w-xl text-[14px] text-fg-muted">{t("body", { percent: percentPer, max: maxPercent, points: pointsPer })}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-[var(--radius-btn)] border-2 border-dashed border-accent px-4 py-2 font-mono text-[18px] font-semibold tracking-wider text-accent">{code}</span>
          <Button variant="secondary" size="sm" onClick={() => copy(link)}><Copy className="h-4 w-4" />{t("copyLink")}</Button>
          <a href={`https://wa.me/?text=${encodeURIComponent(`${t("share")} ${link}`)}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-btn)] bg-[#25D366] px-4 text-[14px] font-medium text-white"><MessageCircle className="h-4 w-4" />WhatsApp</a>
        </div>
        <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-[var(--radius-card)] bg-fill/70 p-3"><dt className="text-[12px] text-fg-muted">{t("available")}</dt><dd className="text-[20px] font-semibold">{Math.min(maxPercent, available * percentPer)}%</dd></div>
          <div className="rounded-[var(--radius-card)] bg-fill/70 p-3"><dt className="text-[12px] text-fg-muted">{t("friends")}</dt><dd className="text-[20px] font-semibold">{available + used}</dd></div>
          <div className="rounded-[var(--radius-card)] bg-fill/70 p-3"><dt className="text-[12px] text-fg-muted">{t("points")}</dt><dd className="text-[20px] font-semibold">{points}</dd></div>
        </dl>
      </div>
    </section>
  );
}
