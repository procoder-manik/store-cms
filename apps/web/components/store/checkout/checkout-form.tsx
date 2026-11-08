"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Banknote, CreditCard, Loader2, Smartphone, Tag, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Turnstile } from "@/components/auth/turnstile";
import { BD_DIVISIONS } from "@/lib/data/bd-locations";
import { cn, formatBDT } from "@/lib/utils";
import { placeOrderAction, quoteAction, type Quote } from "@/lib/store/actions";
import { track } from "@/lib/tracking/client";

export interface CheckoutItem { product_id: string; variant_id: string | null; quantity: number }
export interface CheckoutCustomField { key: string; label: string; label_bn?: string; type: "text" | "textarea" | "select" | "checkbox"; required?: boolean; options?: string }
export interface CheckoutFields { email?: { show?: boolean; required?: boolean }; upazila?: { show?: boolean; required?: boolean }; note?: { show?: boolean }; custom?: CheckoutCustomField[] }
export interface CheckoutDefaults { name?: string; phone?: string; email?: string; district?: string; upazila?: string; address?: string }

/** Shared by the full checkout page (cart) and the Buy Now quick checkout (explicit items). */
/** "Use my rewards" switch: referral discount and loyalty points. Shown to signed-in customers. */
function RewardsToggle({ on, setOn, rewards, locale }: { on: boolean; setOn: (v: boolean) => void; rewards?: Quote["rewards"]; locale: "en" | "bn" }) {
  const t = useTranslations("checkout");
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-[12px] bg-accent-soft px-3 py-2.5 text-[14px]">
      <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
      <span className="flex-1">{t("useRewards")}{on && rewards && (rewards.referral_discount + rewards.points_discount) > 0 ? ` · −${formatBDT(rewards.referral_discount + rewards.points_discount, locale)}` : ""}</span>
    </label>
  );
}

export type PayMethod = "cod" | "bkash" | "sslcommerz";
const PAY_ICON = { cod: Banknote, bkash: Smartphone, sslcommerz: CreditCard } as const;

export function CheckoutForm({ items, compact, defaults, isGuest, onPlaced, methods = ["cod"], fields = {} }: {
  items?: CheckoutItem[]; compact?: boolean; defaults?: CheckoutDefaults; isGuest: boolean; onPlaced?: () => void; methods?: PayMethod[]; fields?: CheckoutFields;
}) {
  const t = useTranslations("checkout");
  const locale = useLocale() as "en" | "bn";
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [district, setDistrict] = useState(defaults?.district ?? "");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState("");
  const [phone, setPhone] = useState(defaults?.phone ?? "");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [method, setMethod] = useState<PayMethod>(methods[0] ?? "cod");
  const [payAdvance, setPayAdvance] = useState(false);
  const [useRewards, setUseRewards] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [pending, start] = useTransition();
  const itemsKey = JSON.stringify(items ?? "cart");

  useEffect(() => {
    let alive = true;
    setLoadingQuote(true);
    const id = setTimeout(async () => {
      const q = await quoteAction({ items: items ?? undefined, useCart: !items, district, coupon, phone, use_rewards: useRewards });
      if (alive) {
        setQuote(q); setLoadingQuote(false);
        if (q && !items && !district && !coupon) track("begin_checkout", { value: q.subtotal, items: q.lines.map((l) => ({ item_id: l.product_id, item_name: l.title, price: l.unit_price, quantity: l.quantity, item_variant: l.variant_title })) });
      }
    }, 250);
    return () => { alive = false; clearTimeout(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, district, coupon, phone.length >= 11 ? phone : "", useRewards]);

  const couponError = quote?.coupon && !quote.coupon.valid && quote.coupon.error ? t(`couponErrors.${quote.coupon.error}` as "couponErrors.invalid") : null;
  const districtOptions = useMemo(() => BD_DIVISIONS.map((d) => (
    <optgroup key={d.name} label={locale === "bn" ? d.bn : d.name}>
      {d.districts.map((x) => <option key={x.name} value={x.name}>{locale === "bn" ? x.bn : x.name}</option>)}
    </optgroup>
  )), [locale]);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const f2 = f;
    setErrors({});
    setFormError(null);
    start(async () => {
      const r = await placeOrderAction({
        items: items ?? undefined, useCart: !items,
        name: String(f.get("name") ?? ""), phone: String(f.get("phone") ?? ""), email: String(f.get("email") ?? ""),
        district, upazila: String(f.get("upazila") ?? ""), address: String(f.get("address") ?? ""), note: String(f.get("note") ?? ""),
        coupon: quote?.coupon?.valid ? coupon : "", payment_method: activeMethod, source: items ? "quick_checkout" : "web",
        pay_advance: advActive, use_rewards: useRewards,
        custom_fields: Object.fromEntries(custom.map((f) => [f.key, f.type === "checkbox" ? (f2.get(`cf_${f.key}`) ? "yes" : "") : String(f2.get(`cf_${f.key}`) ?? "")])),
        turnstile: (f.get("cf-turnstile-response") as string) ?? undefined,
      });
      if (!r.ok) {
        if (r.fieldErrors) setErrors(r.fieldErrors);
        setFormError(t(`errors.${r.error}` as "errors.generic"));
        return;
      }
      if (r.data!.paymentRedirect) { setRedirecting(true); window.location.assign(r.data!.paymentRedirect); return; }
      onPlaced?.();
      router.push(`/order/${r.data!.orderNumber}?t=${r.data!.token}${activeMethod !== "cod" ? "&payment=failed" : ""}`);
    });
  }

  const fe = (k: string) => (errors[k] ? t(`fieldErrors.${k}` as "fieldErrors.name") : undefined);
  const online = methods.filter((m) => m !== "cod");
  const advAmount = quote?.advance?.amount ?? 0;
  const advRequired = !!quote?.advance?.required && advAmount > 0;
  const advActive = advAmount > 0 && (advRequired || payAdvance);
  const shownMethods = advActive ? online : methods;
  const activeMethod = shownMethods.includes(method) ? method : shownMethods[0] ?? "cod";
  const noOnlineForAdvance = advActive && online.length === 0;
  const blocked = !quote || quote.lines.length === 0 || quote.errors.length > 0 || noOnlineForAdvance;
  const emailCfg = { show: fields.email?.show !== false, required: !!fields.email?.required };
  const upazilaCfg = { show: fields.upazila?.show !== false, required: !!fields.upazila?.required };
  const custom = fields.custom ?? [];
  const label = (f: CheckoutCustomField) => (locale === "bn" && f.label_bn ? f.label_bn : f.label);

  const summary = (
    <div className={cn("space-y-3", !compact && "rounded-[20px] bg-surface p-5 shadow-card")}>
      {!compact && <h2 className="text-[17px] font-semibold">{t("summary")}</h2>}
      {!compact && quote?.lines.map((l) => (
        <div key={`${l.product_id}${l.variant_id}`} className="flex gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {l.image_url ? <img src={l.image_url} alt="" className="h-14 w-14 rounded-[12px] object-cover" /> : <span className="h-14 w-14 rounded-[12px] bg-fill" />}
          <div className="min-w-0 flex-1 text-[14px]">
            <p className="line-clamp-1">{l.title}</p>
            <p className="text-[12px] text-fg-muted">{l.variant_title ? `${l.variant_title} · ` : ""}×{l.quantity}</p>
          </div>
          <span className="text-[14px] font-medium">{formatBDT(l.total, locale)}</span>
        </div>
      ))}
      {quote && quote.errors.length > 0 && <p className="rounded-[12px] bg-danger/10 p-3 text-[13px] text-danger">{t("errors.stock")}</p>}

      <div className="flex gap-2">
        {quote?.coupon?.valid ? (
          <div className="flex h-10 flex-1 items-center gap-2 rounded-[12px] bg-success/10 px-3 text-[14px] text-success">
            <Tag className="h-4 w-4" />{quote.coupon.code}
            <button type="button" className="ml-auto" aria-label={t("remove")} onClick={() => { setCoupon(""); setCouponInput(""); }}><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <>
            <Input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder={t("coupon")} className="h-10" aria-label={t("coupon")} />
            <Button type="button" variant="secondary" size="sm" className="h-10" disabled={!couponInput} onClick={() => setCoupon(couponInput.trim())}>{t("apply")}</Button>
          </>
        )}
      </div>
      {couponError && <p className="text-[12px] text-danger">{couponError}</p>}

      {!isGuest && <RewardsToggle on={useRewards} setOn={setUseRewards} rewards={quote?.rewards} locale={locale} />}
      <dl className="space-y-1.5 border-t border-line pt-3 text-[14px]">
        <div className="flex justify-between"><dt className="text-fg-muted">{t("subtotal")}</dt><dd>{formatBDT(quote?.subtotal ?? 0, locale)}</dd></div>
        {!!quote?.discount && <div className="flex justify-between text-success"><dt>{t("discount")}</dt><dd>−{formatBDT(quote.discount, locale)}</dd></div>}
        {useRewards && !!quote?.rewards?.referral_discount && <div className="flex justify-between text-[12px] text-success"><dt>{t("referralOff", { percent: quote.rewards.referral_percent })}</dt><dd>−{formatBDT(quote.rewards.referral_discount, locale)}</dd></div>}
        {useRewards && !!quote?.rewards?.points_discount && <div className="flex justify-between text-[12px] text-success"><dt>{t("pointsOff", { points: quote.rewards.points_used })}</dt><dd>−{formatBDT(quote.rewards.points_discount, locale)}</dd></div>}
        {!quote?.shipping_hidden && <div className="flex justify-between">
          <dt className="text-fg-muted">{t("shipping")}</dt>
          <dd>{!district ? <span className="text-fg-subtle">{t("shippingPick")}</span> : quote?.shipping === 0 ? t("free") : formatBDT(quote?.shipping ?? 0, locale)}</dd>
        </div>}
        <div className="flex justify-between pt-1.5 text-[17px] font-semibold">
          <dt>{t("total")}</dt>
          <dd className="flex items-center gap-2">{loadingQuote && <Loader2 className="h-4 w-4 animate-spin text-fg-subtle" />}{formatBDT(quote?.grand_total ?? 0, locale)}</dd>
        </div>
        {advActive && (
          <div className="mt-2 space-y-1 rounded-[12px] bg-accent-soft p-3">
            <div className="flex justify-between font-medium"><dt>{t("payNow")}</dt><dd>{formatBDT(advAmount, locale)}</dd></div>
            <div className="flex justify-between text-fg-muted"><dt>{t("onDelivery")}</dt><dd>{formatBDT(Math.max(0, (quote?.grand_total ?? 0) - advAmount), locale)}</dd></div>
          </div>
        )}
        {district && quote?.zone && <p className="text-[12px] text-fg-muted">{t("eta", { min: quote.zone.eta_min, max: quote.zone.eta_max })}</p>}
      </dl>
    </div>
  );

  return (
    <form ref={formRef} onSubmit={submit} noValidate className={cn(!compact && "grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]")}>
      <div className="space-y-5">
        <div role="group" aria-label={t("contact")} className={cn("grid gap-3 sm:grid-cols-2", !compact && "rounded-[20px] bg-surface p-5 shadow-card")}>
          {!compact && <h2 className="mb-1 text-[17px] font-semibold sm:col-span-2">{t("contact")}</h2>}
          <Field label={t("name")} htmlFor="co-name" error={fe("name")}>
            <Input id="co-name" name="name" autoComplete="name" defaultValue={defaults?.name} required aria-invalid={!!errors.name} />
          </Field>
          <Field label={t("phone")} htmlFor="co-phone" error={fe("phone")}>
            <Input id="co-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} required aria-invalid={!!errors.phone} />
          </Field>
          {emailCfg.show && (!compact || emailCfg.required) && (
            <Field label={`${t("email")}${emailCfg.required ? " *" : ""}`} htmlFor="co-email" error={fe("email")} className="sm:col-span-2">
              <Input id="co-email" name="email" type="email" autoComplete="email" defaultValue={defaults?.email} required={emailCfg.required} aria-invalid={!!errors.email} />
            </Field>
          )}
          <Field label={t("district")} htmlFor="co-district" error={fe("district")}>
            <Select id="co-district" value={district} onChange={(e) => setDistrict(e.target.value)} required aria-invalid={!!errors.district}>
              <option value="" disabled>{t("chooseDistrict")}</option>
              {districtOptions}
            </Select>
          </Field>
          {upazilaCfg.show && (
            <Field label={`${t("upazila")}${upazilaCfg.required ? " *" : ""}`} htmlFor="co-upazila" error={errors.upazila ? t("fieldErrors.required") : undefined}>
              <Input id="co-upazila" name="upazila" defaultValue={defaults?.upazila} autoComplete="address-level3" required={upazilaCfg.required} />
            </Field>
          )}
          <Field label={t("address")} htmlFor="co-address" error={fe("address")} className="sm:col-span-2">
            <Textarea id="co-address" name="address" defaultValue={defaults?.address} autoComplete="street-address" className="min-h-16" required aria-invalid={!!errors.address} />
          </Field>
          {custom.map((f) => (
            <Field key={f.key} label={`${label(f)}${f.required ? " *" : ""}`} htmlFor={`cf-${f.key}`} error={errors[`cf_${f.key}`] ? t("fieldErrors.required") : undefined} className={f.type === "textarea" || f.type === "checkbox" ? "sm:col-span-2" : undefined}>
              {f.type === "textarea" ? <Textarea id={`cf-${f.key}`} name={`cf_${f.key}`} required={f.required} className="min-h-16" />
                : f.type === "select" ? (
                  <Select id={`cf-${f.key}`} name={`cf_${f.key}`} required={f.required} defaultValue="">
                    <option value="" disabled>{t("choose")}</option>
                    {(f.options ?? "").split(",").map((o) => o.trim()).filter(Boolean).map((o) => <option key={o} value={o}>{o}</option>)}
                  </Select>
                ) : f.type === "checkbox" ? (
                  <label className="flex items-center gap-2 text-[14px]"><input id={`cf-${f.key}`} type="checkbox" name={`cf_${f.key}`} className="h-4 w-4 accent-[var(--accent)]" required={f.required} />{label(f)}</label>
                ) : <Input id={`cf-${f.key}`} name={`cf_${f.key}`} required={f.required} />}
            </Field>
          ))}
          {!compact && fields.note?.show !== false && (
            <Field label={t("note")} htmlFor="co-note" className="sm:col-span-2">
              <Input id="co-note" name="note" />
            </Field>
          )}
        </div>

        <div role="group" aria-label={t("payment")} className={cn(!compact && "rounded-[20px] bg-surface p-5 shadow-card", compact && shownMethods.length < 2 && advAmount === 0 && "hidden")}>
          <h2 className={cn("mb-3 font-semibold", compact ? "text-[14px]" : "text-[17px]")}>{t("payment")}</h2>
          {advAmount > 0 && (
            <div className="mb-3 space-y-2">
              {advRequired ? (
                <p className="rounded-[12px] bg-accent-soft p-3 text-[14px]">{quote?.advance?.shipping_prepaid ? t("advanceShipping", { amount: formatBDT(advAmount, locale) }) : t("advanceRequired", { amount: formatBDT(advAmount, locale) })}</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {[false, true].map((adv) => (
                    <label key={String(adv)} className={cn("flex cursor-pointer items-start gap-2.5 rounded-[14px] bg-fill/60 p-3 text-[14px]", payAdvance === adv && "ring-2 ring-accent")}>
                      <input type="radio" name="advance" checked={payAdvance === adv} onChange={() => setPayAdvance(adv)} className="mt-1 accent-[var(--accent)]" />
                      <span>{adv ? t("payAdvance", { amount: formatBDT(advAmount, locale) }) : t("payLater")}</span>
                    </label>
                  ))}
                </div>
              )}
              {noOnlineForAdvance && <p className="text-[13px] text-danger">{t("advanceNoOnline")}</p>}
            </div>
          )}
          <div className="space-y-2">
            {shownMethods.map((m) => {
              const Icon = PAY_ICON[m];
              const on = activeMethod === m;
              return (
                <label key={m} className={cn("flex cursor-pointer items-start gap-3 rounded-[14px] bg-fill/60 p-3.5 transition-shadow", on && "ring-2 ring-accent")}>
                  <input type="radio" name="payment" value={m} checked={on} onChange={() => setMethod(m)} className="mt-1 accent-[var(--accent)]" />
                  <Icon className="mt-0.5 h-5 w-5 text-accent" />
                  <span><span className="block text-[15px] font-medium">{t(m)}</span><span className="text-[13px] text-fg-muted">{t(`${m}Body` as "codBody")}</span></span>
                </label>
              );
            })}
          </div>
        </div>
        {compact && (
          <>
            {summary}
            {isGuest && <Turnstile />}
            {formError && <p role="alert" className="rounded-[12px] bg-danger/10 px-4 py-3 text-[14px] text-danger">{formError}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={pending || blocked || redirecting}>
              {redirecting ? t("redirecting") : pending ? t("placing") : `${t("place")} · ${formatBDT(quote?.grand_total ?? 0, locale)}`}
            </Button>
            <p className="text-center text-[12px] text-fg-subtle">{t("agree")}</p>
          </>
        )}
      </div>
      {/* Full checkout: summary, errors and the Place order button live together so the button is never covered */}
      {!compact && (
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {summary}
          {isGuest && <Turnstile />}
          {formError && <p role="alert" className="rounded-[12px] bg-danger/10 px-4 py-3 text-[14px] text-danger">{formError}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={pending || blocked || redirecting}>
            {redirecting ? t("redirecting") : pending ? t("placing") : `${t("place")} · ${formatBDT(quote?.grand_total ?? 0, locale)}`}
          </Button>
          <p className="text-center text-[12px] text-fg-subtle">{t("agree")}</p>
        </div>
      )}
    </form>
  );
}
