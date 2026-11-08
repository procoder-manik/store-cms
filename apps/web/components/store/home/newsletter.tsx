"use client";
import Image from "next/image";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { subscribeAction } from "@/lib/store/actions";

export function Newsletter({ variant = "card", title, subtitle, image }: { variant?: string; title?: string | null; subtitle?: string | null; image?: string | null }) {
  const t = useTranslations("misc");
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const form = done ? <p className="mt-6 text-success">{t("subscribed")}</p> : (
    <form className={cn("mt-6 flex gap-2", variant === "minimal" && "mx-auto max-w-md")} onSubmit={(e) => {
      e.preventDefault();
      const email = String(new FormData(e.currentTarget).get("email"));
      start(async () => { const r = await subscribeAction(email); if (r.ok) setDone(true); });
    }}>
      <Input name="email" type="email" required placeholder="you@example.com" aria-label="Email" className="h-12 min-w-0 flex-1" />
      <Button type="submit" size="lg" disabled={pending}>{t("subscribe")}</Button>
    </form>
  );
  const heading = <><h2 className="headline text-[28px] md:text-[38px]">{title || t("newsletter")}</h2><p className="mt-2 text-fg-muted">{subtitle || t("newsletterBody")}</p></>;

  if (variant === "minimal") return <section className="container-x mt-24 text-center">{heading}{form}</section>;
  if (variant === "split") {
    return (
      <section className="container-x mt-24">
        <div className="grid overflow-hidden rounded-[var(--radius-sheet)] bg-surface shadow-card md:grid-cols-2">
          <div className="relative min-h-[220px] bg-accent-soft">{image && <Image src={image} alt="" fill sizes="50vw" className="object-cover" />}</div>
          <div className="p-8 md:p-14">{heading}{form}</div>
        </div>
      </section>
    );
  }
  return (
    <section className="container-x mt-24">
      <div className="relative overflow-hidden rounded-[var(--radius-sheet)] bg-surface p-8 shadow-card md:p-14">
        <div aria-hidden className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative max-w-xl">{heading}{form}</div>
      </div>
    </section>
  );
}
