import { getTranslations } from "next-intl/server";
import { ResetForm } from "@/components/auth/forms";

export const metadata = { robots: { index: false } };

export default async function ResetPage() {
  const t = await getTranslations("auth");
  return (
    <>
      <h1 className="headline mb-6 text-[28px]">{t("resetTitle")}</h1>
      <ResetForm />
    </>
  );
}
