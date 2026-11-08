import { getTranslations, setRequestLocale } from "next-intl/server";
import { TrackForm } from "./track-form";

export async function generateMetadata() {
  const t = await getTranslations("order");
  return { title: t("trackTitle") };
}

export default async function TrackPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ o?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("order");
  return (
    <div className="container-x py-12 md:py-20">
      <div className="mx-auto max-w-md">
        <h1 className="headline text-[32px]">{t("trackTitle")}</h1>
        <p className="mt-2 text-fg-muted">{t("trackBody")}</p>
        <TrackForm initial={((await searchParams).o ?? "").slice(0, 20)} />
      </div>
    </div>
  );
}
