"use client";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { deleteAccountAction, updateProfileAction } from "./actions";
import { signOutAction } from "@/app/[locale]/(auth)/actions";

export function ProfileForm({ initial }: { initial: { full_name: string; phone: string; email: string; marketing_opt_in: boolean } }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(updateProfileAction, null);
  const [optIn, setOptIn] = useState(initial.marketing_opt_in);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  const err = (k?: string) => (k ? t(`auth.errors.${k}` as "auth.errors.generic") : undefined);
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <Field label={t("auth.name")} htmlFor="full_name" error={err(fe.full_name)}>
        <Input id="full_name" name="full_name" defaultValue={initial.full_name} />
      </Field>
      <Field label={t("auth.phone")} htmlFor="phone" error={err(fe.phone)}>
        <Input id="phone" name="phone" type="tel" defaultValue={initial.phone} />
      </Field>
      <Field label={t("auth.email")} htmlFor="email" className="md:col-span-2">
        <Input id="email" value={initial.email} disabled readOnly />
      </Field>
      <div className="md:col-span-2"><Switch name="marketing_opt_in" checked={optIn} onChange={setOptIn} label="Email me offers" /></div>
      <div className="flex items-center gap-3 md:col-span-2">
        <Button type="submit" disabled={pending}>{t("account.save")}</Button>
        {state?.ok && <span className="text-[13px] text-success">{t("account.saved")}</span>}
      </div>
    </form>
  );
}

export function SignOutButton({ label }: { label: string }) {
  const router = useRouter();
  return (
    <Button variant="secondary" size="sm" onClick={async () => { await signOutAction(); router.replace("/"); router.refresh(); }}>
      {label}
    </Button>
  );
}

export function DeleteAccount() {
  const t = useTranslations("account");
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <div className="space-y-3">
      <p className="text-[14px] text-fg-muted">{t("deleteBody")}</p>
      <div className="flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="DELETE" aria-label={t("deleteConfirm")} className="max-w-40" />
        <Button variant="danger" disabled={pending || text.trim().toUpperCase() !== "DELETE"} onClick={async () => {
          setPending(true);
          const r = await deleteAccountAction(text);
          setPending(false);
          if (!r.ok) return setError(r.error === "openOrders" ? t("deleteOpenOrders") : t("deleteFailed"));
          router.replace("/"); router.refresh();
        }}>{t("delete")}</Button>
      </div>
      {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
    </div>
  );
}
