import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ForgotForm } from "@/components/auth/forms";

export const metadata = { robots: { index: false } };

export default async function ForgotPage() {
  const t = await getTranslations("auth");
  return (
    <>
      <h1 className="headline text-[28px]">{t("forgotTitle")}</h1>
      <p className="mb-6 mt-1.5 text-[14px] text-fg-muted">{t("forgotBody")}</p>
      <ForgotForm />
      <p className="mt-5 text-center text-[14px]"><Link href="/login" className="text-accent">{t("backToLogin")}</Link></p>
    </>
  );
}
