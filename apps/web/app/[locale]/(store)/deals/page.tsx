import { getTranslations, setRequestLocale } from "next-intl/server";
import { Listing, type SearchParams } from "@/components/store/listing/listing";

export async function generateMetadata() {
  const t = await getTranslations("shop");
  return { title: t("deals"), alternates: { canonical: "/deals" } };
}

export default async function DealsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("shop");
  return <Listing base="/deals" sp={await searchParams} extra={{ onSale: true }} header={<h1 className="headline text-[34px] md:text-[44px]">{t("deals")}</h1>} />;
}
