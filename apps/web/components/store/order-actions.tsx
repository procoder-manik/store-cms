"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, FileText, RotateCcw } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button, buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { requestReturnAction, retryPaymentAction } from "@/lib/store/actions";

export function OrderActions({ orderNumber, token, paymentStatus, paymentMethod, status, methods, items, canReturn, justPaid }: {
  orderNumber: string; token: string; paymentStatus: string; paymentMethod: string; status: string;
  methods: ("cod" | "bkash" | "sslcommerz")[]; items: { id: string; title: string }[]; canReturn: boolean; justPaid: boolean;
}) {
  const t = useTranslations("order");
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [ret, setRet] = useState(false);
  const [picked, setPicked] = useState<string[]>(items.map((i) => i.id));
  const needsPayment = paymentMethod !== "cod" && paymentStatus !== "paid" && status === "pending";

  const retry = (m: "cod" | "bkash" | "sslcommerz") => start(async () => {
    const r = await retryPaymentAction(orderNumber, token, m);
    if (!r.ok) return toast(r.error, "error");
    if (r.data!.redirect) window.location.assign(r.data!.redirect);
    else { toast(t("switched")); router.refresh(); }
  });

  return (
    <div className="mx-auto mt-6 flex max-w-2xl flex-col items-center gap-4">
      {justPaid && paymentStatus === "paid" && (
        <p className="flex items-center gap-2 rounded-full bg-success/10 px-4 py-2 text-[14px] text-success"><CheckCircle2 className="h-4 w-4" />{t("paidOnline")}</p>
      )}
      {needsPayment && (
        <div className="w-full rounded-[20px] bg-warning/10 p-5 text-center">
          <p className="flex items-center justify-center gap-2 text-[15px]"><AlertCircle className="h-5 w-5 text-warning" />{t("paymentFailed")}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {methods.includes(paymentMethod as "bkash") && <Button disabled={pending} onClick={() => retry(paymentMethod as "bkash")}>{t("tryAgain")}</Button>}
            {methods.includes("cod") && <Button variant="secondary" disabled={pending} onClick={() => retry("cod")}>{t("switchCod")}</Button>}
          </div>
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        <Link href={`/invoice/${orderNumber}?t=${token}`} target="_blank" className={buttonClass("secondary", "sm")}><FileText className="h-4 w-4" />{t("invoice")}</Link>
        {canReturn && <Button size="sm" variant="secondary" onClick={() => setRet(true)}><RotateCcw className="h-4 w-4" />{t("returnRequest")}</Button>}
      </div>
      <Dialog open={ret} onClose={() => setRet(false)} title={t("returnRequest")}>
        <form className="space-y-3" onSubmit={(e) => {
          e.preventDefault();
          const reason = String(new FormData(e.currentTarget).get("reason") ?? "");
          start(async () => {
            const r = await requestReturnAction({ orderNumber, token, reason, itemIds: picked });
            if (!r.ok) return toast(r.error, "error");
            toast(t("returnSent")); setRet(false);
          });
        }}>
          {items.map((i) => (
            <label key={i.id} className="flex items-center gap-2 text-[14px]">
              <input type="checkbox" checked={picked.includes(i.id)} className="accent-[var(--accent)]"
                onChange={() => setPicked((s) => (s.includes(i.id) ? s.filter((x) => x !== i.id) : [...s, i.id]))} />{i.title}
            </label>
          ))}
          <Textarea name="reason" placeholder={t("returnReason")} required minLength={5} />
          <Button type="submit" className="w-full" disabled={pending || !picked.length}>{t("returnRequest")}</Button>
        </form>
      </Dialog>
    </div>
  );
}
