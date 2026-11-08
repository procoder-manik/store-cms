import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComparePage } from "./compare-client";

export async function generateMetadata() {
  const t = await getTranslations("product");
  return { title: t("compare"), robots: { index: false } };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ComparePage />;
}
