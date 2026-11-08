"use client";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Two-option pill: EN | বাং. The active language is highlighted. */
export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const opts = [{ id: "en", label: "EN", aria: "English" }, { id: "bn", label: "বাং", aria: "বাংলা" }] as const;
  return (
    <div role="radiogroup" aria-label="Language" className={cn("inline-flex h-9 items-center rounded-full bg-fill p-0.5 text-[13px]", className)}>
      {opts.map((o) => (
        <button key={o.id} role="radio" aria-checked={locale === o.id} aria-label={o.aria} onClick={() => locale !== o.id && router.replace(pathname, { locale: o.id })}
          className={cn("h-8 min-w-10 rounded-full px-2.5 font-medium transition-all", locale === o.id ? "bg-surface text-fg shadow-card" : "text-fg-muted hover:text-fg")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
