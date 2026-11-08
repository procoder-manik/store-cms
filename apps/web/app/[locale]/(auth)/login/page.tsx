import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/auth/forms";

export async function generateMetadata() {
  const t = await getTranslations("auth");
  return { title: t("loginTitle"), robots: { index: false } };
}

export default async function LoginPage() {
  const t = await getTranslations("auth");
  return (
    <>
      <h1 className="headline text-[28px]">{t("loginTitle")}</h1>
      <p className="mb-6 mt-1.5 text-[14px] text-fg-muted">{t("loginBody")}</p>
      <Suspense><LoginForm /></Suspense>
    </>
  );
}
