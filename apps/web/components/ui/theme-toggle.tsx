"use client";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** One button. Shows the current mode and opens a small menu with Light, Dark and System. */
export function ThemeToggle({ className, align = "right" }: { className?: string; align?: "left" | "right" }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const t = useTranslations("theme");
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  const options = [
    { value: "light", icon: Sun, label: t("light") },
    { value: "dark", icon: Moon, label: t("dark") },
    { value: "system", icon: Monitor, label: t("system") },
  ] as const;
  const Current = !mounted ? Sun : theme === "system" ? Monitor : resolvedTheme === "dark" ? Moon : Sun;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button onClick={() => setOpen((o) => !o)} aria-label={t("toggle")} aria-haspopup="menu" aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-full text-fg transition-colors hover:bg-fill">
        <Current className="h-[18px] w-[18px]" />
      </button>
      {open && (
        <div role="menu" className={cn("glass absolute top-12 z-50 w-40 rounded-[16px] p-1.5 shadow-float fade-up", align === "right" ? "right-0" : "left-0")}>
          {options.map(({ value, icon: Icon, label }) => {
            const on = mounted && theme === value;
            return (
              <button key={value} role="menuitemradio" aria-checked={on} onClick={() => { setTheme(value); setOpen(false); }}
                className={cn("flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-[14px] hover:bg-fill", on && "font-medium")}>
                <Icon className="h-4 w-4" /><span className="flex-1 text-left">{label}</span>{on && <Check className="h-4 w-4 text-accent" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
