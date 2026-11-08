import { MailCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export const metadata = { robots: { index: false } };

export default async function VerifyEmailPage() {
  const t = await getTranslations("auth");
  return (
    <div className="text-center">
      <MailCheck className="mx-auto h-12 w-12 text-accent" strokeWidth={1.5} />
      <h1 className="headline mt-4 text-[26px]">{t("verifyTitle")}</h1>
      <p className="mt-2 text-[15px] text-fg-muted">{t("verifyBody")}</p>
      <p className="mt-6 text-[14px]"><Link href="/login" className="text-accent">{t("backToLogin")}</Link></p>
    </div>
  );
}
