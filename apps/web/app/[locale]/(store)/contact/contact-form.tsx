"use client";
import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Turnstile } from "@/components/auth/turnstile";
import { contactAction } from "@/lib/store/actions";

export interface ContactField { key: string; label: string; label_bn?: string; type: string; required?: boolean; options?: string }
export interface ContactConfig { fields?: ContactField[]; submit_label?: string; success_message?: string }

const DEFAULT: ContactField[] = [
  { key: "name", label: "Name", type: "text", required: true }, { key: "email", label: "Email", type: "email", required: true },
  { key: "phone", label: "Phone", type: "tel" }, { key: "subject", label: "Subject", type: "text" }, { key: "message", label: "Message", type: "textarea", required: true },
];

/** Contact form built from Admin > Content > Contact form. */
export function ContactForm({ config }: { config?: ContactConfig }) {
  const t = useTranslations();
  const locale = useLocale();
  const fields = config?.fields?.length ? config.fields : DEFAULT;
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");
  const [pending, start] = useTransition();
  const label = (f: ContactField) => (locale === "bn" && f.label_bn ? f.label_bn : f.label);
  if (state === "sent") return <p className="rounded-[var(--radius-card)] bg-success/10 p-6 text-[15px]">{config?.success_message || t("misc.sent")}</p>;
  return (
    <form className="grid gap-3 rounded-[var(--radius-card)] bg-surface p-5 shadow-card sm:grid-cols-2 md:p-6" onSubmit={(e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const data = Object.fromEntries(fields.map((x) => [x.key, x.type === "checkbox" ? (f.get(x.key) ? "yes" : "") : String(f.get(x.key) ?? "")]));
      start(async () => {
        const r = await contactAction({ data, turnstile: (f.get("cf-turnstile-response") as string) ?? undefined });
        setState(r.ok ? "sent" : "error");
      });
    }}>
      {fields.map((x) => {
        const id = `ct-${x.key}`;
        const wide = x.type === "textarea" || x.type === "checkbox";
        return (
          <Field key={x.key} label={`${label(x)}${x.required ? " *" : ""}`} htmlFor={id} className={wide ? "sm:col-span-2" : undefined}>
            {x.type === "textarea" ? <Textarea id={id} name={x.key} required={x.required} className="min-h-32" maxLength={3000} />
              : x.type === "select" ? <Select id={id} name={x.key} required={x.required} defaultValue=""><option value="" disabled>{t("checkout.choose")}</option>{(x.options ?? "").split(",").map((o) => o.trim()).filter(Boolean).map((o) => <option key={o}>{o}</option>)}</Select>
              : x.type === "checkbox" ? <label className="flex items-center gap-2 text-[14px]"><input id={id} type="checkbox" name={x.key} required={x.required} className="h-4 w-4 accent-[var(--accent)]" />{label(x)}</label>
              : <Input id={id} name={x.key} type={x.type === "email" ? "email" : x.type === "tel" ? "tel" : "text"} required={x.required} maxLength={300} />}
          </Field>
        );
      })}
      <div className="sm:col-span-2"><Turnstile /></div>
      {state === "error" && <p role="alert" className="text-[14px] text-danger sm:col-span-2">{t("checkout.errors.form")}</p>}
      <Button type="submit" disabled={pending} className="sm:col-span-2">{config?.submit_label || t("misc.send")}</Button>
    </form>
  );
}
