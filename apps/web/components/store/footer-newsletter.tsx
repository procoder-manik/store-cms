"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { subscribeAction } from "@/lib/store/actions";

export function FooterNewsletter({ dark }: { dark?: boolean }) {
  const t = useTranslations("misc");
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  if (done) return <p className="text-[14px]">{t("subscribed")}</p>;
  return (
    <form className="flex w-full gap-2" onSubmit={(e) => {
      e.preventDefault();
      const email = String(new FormData(e.currentTarget).get("email"));
      start(async () => { const r = await subscribeAction(email); if (r.ok) setDone(true); });
    }}>
      <input name="email" type="email" required placeholder="you@example.com" aria-label="Email"
        className={cn("h-11 min-w-0 flex-1 rounded-[var(--radius-btn)] px-4 text-[14px] outline-none", dark ? "bg-white/10 text-white placeholder:text-white/40" : "bg-black/10 placeholder:opacity-60")} />
      <button type="submit" disabled={pending} className={cn("h-11 shrink-0 whitespace-nowrap rounded-[var(--radius-btn)] px-5 text-[14px] font-medium", dark ? "bg-white text-black" : "bg-current/90")}>
        <span className={dark ? "" : "text-accent mix-blend-normal"} style={dark ? undefined : { color: "var(--accent)" }}>{t("subscribe")}</span>
      </button>
    </form>
  );
}
