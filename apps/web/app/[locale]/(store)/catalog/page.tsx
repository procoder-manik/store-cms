import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getAllCategories, listProducts } from "@/lib/data/catalog";
import { PrintButton } from "./print-button";
import { formatBDT } from "@/lib/utils";

export const revalidate = 600;
export async function generateMetadata() {
  const t = await getTranslations("catalog");
  return { title: t("title"), alternates: { canonical: "/catalog" } };
}

/** Full product catalog grouped by category. Print or save as PDF to share on WhatsApp or Facebook. */
export default async function CatalogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("catalog");
  const cats = (await getAllCategories()).filter((c) => !c.parentId);
  const groups = await Promise.all(cats.map(async (c) => ({ c, items: (await listProducts({ categoryIds: [c.id], sort: "popular", pageSize: 48 })).items })));
  const name = (c: (typeof cats)[number]) => (locale === "bn" && c.nameBn ? c.nameBn : c.name);
  return (
    <div className="container-x py-10 md:py-14 print:py-0">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="headline text-[34px] md:text-[48px]">{t("title")}</h1><p className="mt-2 text-fg-muted">{t("body")}</p></div>
        <PrintButton label={t("print")} />
      </div>
      {groups.filter((g) => g.items.length).map(({ c, items }) => (
        <section key={c.id} className="mt-12 break-inside-avoid-page">
          <h2 className="headline border-b border-line pb-2 text-[24px]">{name(c)}</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 print:grid-cols-4">
            {items.map((p) => (
              <Link key={p.id} href={`/product/${p.slug}`} className="group break-inside-avoid">
                <div className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] bg-fill">{p.image && <Image src={p.image} alt={p.title} fill sizes="200px" className="object-cover" />}</div>
                <p className="mt-2 line-clamp-2 text-[13px] leading-snug group-hover:text-accent">{p.title}</p>
                <p className="text-[14px] font-semibold">{formatBDT(p.price, locale as "en" | "bn")}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
