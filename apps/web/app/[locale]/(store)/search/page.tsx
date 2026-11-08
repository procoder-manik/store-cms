import { getTranslations, setRequestLocale } from "next-intl/server";
import { Listing, type SearchParams } from "@/components/store/listing/listing";
import { SearchBox } from "@/components/store/search-box";

export const metadata = { robots: { index: false, follow: true } };

export default async function SearchPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("shop");
  const q = (sp.q ?? "").trim().slice(0, 80);
  return (
    <Listing base="/search" sp={sp} extra={{ q }} header={
      <div className="space-y-5">
        <SearchBox className="md:hidden" autoFocus={!q} />
        <h1 className="headline text-[30px] md:text-[40px]">{q ? t("searchTitle", { q }) : t("searchEmpty")}</h1>
      </div>
    } />
  );
}
