import { getTranslations } from "next-intl/server";
import { RegisterForm } from "@/components/auth/forms";

export async function generateMetadata() {
  const t = await getTranslations("auth");
  return { title: t("registerTitle"), robots: { index: false } };
}

export default async function RegisterPage() {
  const t = await getTranslations("auth");
  return (
    <>
      <h1 className="headline text-[28px]">{t("registerTitle")}</h1>
      <p className="mb-6 mt-1.5 text-[14px] text-fg-muted">{t("registerBody")}</p>
      <RegisterForm />
    </>
  );
}
