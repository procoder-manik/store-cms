"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { trackOrderAction } from "@/lib/store/actions";

export function TrackForm({ initial = "" }: { initial?: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  return (
    <form className="mt-6 space-y-3" onSubmit={(e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      start(async () => {
        const r = await trackOrderAction(String(f.get("number")), String(f.get("phone")));
        if (!r) return setError(true);
        router.push(`/order/${r.orderNumber}?t=${r.token}`);
      });
    }}>
      <Field label={t("order.orderNumber")} htmlFor="tr-num"><Input id="tr-num" name="number" placeholder="ORD-100001" defaultValue={initial} required /></Field>
      <Field label={t("checkout.phone")} htmlFor="tr-phone"><Input id="tr-phone" name="phone" type="tel" placeholder="01XXXXXXXXX" required /></Field>
      {error && <p role="alert" className="text-[14px] text-danger">{t("order.notFound")}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{t("order.find")}</Button>
    </form>
  );
}
