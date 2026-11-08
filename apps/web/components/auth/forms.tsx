"use client";
import { useActionState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Turnstile } from "./turnstile";
import { OAuthButtons } from "./oauth-buttons";
import {
  forgotPasswordAction, resetPasswordAction, signInAction, signUpAction,
} from "@/app/[locale]/(auth)/actions";
import type { ActionResult } from "@/lib/actions/result";

function useErr() {
  const t = useTranslations("auth.errors");
  return (key?: string) => (key ? (t.has(key) ? t(key) : t("generic")) : undefined);
}

function Divider() {
  const t = useTranslations("auth");
  return (
    <div className="my-5 flex items-center gap-3 text-[12px] text-fg-subtle">
      <span className="h-px flex-1 bg-line" />{t("orContinue")}<span className="h-px flex-1 bg-line" />
    </div>
  );
}

function FormError({ state }: { state: ActionResult<unknown> | null }) {
  const err = useErr();
  if (!state || state.ok) return null;
  return <p role="alert" className="rounded-[12px] bg-danger/10 px-3.5 py-2.5 text-[13px] text-danger">{err(state.error)}</p>;
}

export function LoginForm() {
  const t = useTranslations("auth");
  const params = useSearchParams();
  const router = useRouter();
  const next = params.get("next") ?? "/account";
  const [state, action, pending] = useActionState(signInAction, null);

  useEffect(() => {
    if (state?.ok && state.data) {
      router.replace(state.data.next);
      router.refresh();
    }
  }, [state, router]);

  return (
    <>
      <OAuthButtons next={next} />
      <Divider />
      <form action={action} className="space-y-3">
        <input type="hidden" name="next" value={next} />
        <Field label={t("email")} htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
        <Field label={t("password")} htmlFor="password"><Input id="password" name="password" type="password" autoComplete="current-password" required /></Field>
        <div className="flex justify-end"><Link href="/forgot-password" className="text-[13px] text-accent">{t("forgot")}</Link></div>
        <Turnstile />
        <FormError state={state} />
        <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? t("signingIn") : t("signIn")}</Button>
      </form>
      <p className="mt-5 text-center text-[14px] text-fg-muted">
        {t("noAccount")} <Link href="/register" className="text-accent">{t("createAccount")}</Link>
      </p>
    </>
  );
}

export function RegisterForm() {
  const t = useTranslations("auth");
  const err = useErr();
  const router = useRouter();
  const [state, action, pending] = useActionState(signUpAction, null);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};

  useEffect(() => {
    if (state?.ok) router.push("/verify-email");
  }, [state, router]);

  return (
    <>
      <OAuthButtons />
      <Divider />
      <form action={action} className="space-y-3" noValidate>
        <Field label={t("name")} htmlFor="name" error={err(fe.name)}>
          <Input id="name" name="name" autoComplete="name" required aria-invalid={!!fe.name} />
        </Field>
        <Field label={t("email")} htmlFor="email" error={err(fe.email)}>
          <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!fe.email} />
        </Field>
        <Field label={t("phone")} htmlFor="phone" error={err(fe.phone)}>
          <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" required aria-invalid={!!fe.phone} />
        </Field>
        <Field label={t("password")} htmlFor="password" error={err(fe.password)} hint={t("errors.password")}>
          <Input id="password" name="password" type="password" autoComplete="new-password" required aria-invalid={!!fe.password} />
        </Field>
        <Turnstile />
        {state && !state.ok && !state.fieldErrors && <FormError state={state} />}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? t("creating") : t("createAccount")}</Button>
      </form>
      <p className="mt-5 text-center text-[14px] text-fg-muted">
        {t("haveAccount")} <Link href="/login" className="text-accent">{t("signIn")}</Link>
      </p>
    </>
  );
}

export function ForgotForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(forgotPasswordAction, null);
  if (state?.ok) return <p className="rounded-[12px] bg-success/10 px-4 py-3 text-[14px]">{t("linkSent")}</p>;
  return (
    <form action={action} className="space-y-3">
      <Field label={t("email")} htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
      <Turnstile />
      <FormError state={state} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{t("sendLink")}</Button>
    </form>
  );
}

export function ResetForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [state, action, pending] = useActionState(resetPasswordAction, null);
  useEffect(() => {
    if (state?.ok) router.replace("/account");
  }, [state, router]);
  return (
    <form action={action} className="space-y-3">
      <Field label={t("newPassword")} htmlFor="password" hint={t("errors.password")}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <FormError state={state} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{t("savePassword")}</Button>
    </form>
  );
}
