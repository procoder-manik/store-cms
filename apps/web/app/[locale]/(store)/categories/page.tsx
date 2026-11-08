import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getAllCategories } from "@/lib/data/catalog";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("categories") };
}

export default async function CategoriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("nav");
  const all = await getAllCategories();
  const roots = all.filter((c) => !c.parentId);
  const name = (c: { name: string; nameBn: string | null }) => (locale === "bn" && c.nameBn ? c.nameBn : c.name);
  return (
    <div className="container-x pt-8 md:pt-12">
      <h1 className="headline text-[34px] md:text-[44px]">{t("categories")}</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roots.map((c) => (
          <div key={c.id} className="rounded-[var(--radius-card)] bg-surface p-5 shadow-card">
            <Link href={`/category/${c.slug}`} className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {c.imageUrl ? <img src={c.imageUrl} alt="" className="h-16 w-16 rounded-[14px] object-cover" /> : <span className="h-16 w-16 rounded-[14px] bg-fill" />}
              <span className="text-[19px] font-semibold tracking-tight">{name(c)}</span>
            </Link>
            {all.some((x) => x.parentId === c.id) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {all.filter((x) => x.parentId === c.id).map((s) => <Link key={s.id} href={`/category/${s.slug}`} className="rounded-full bg-fill px-3 py-1.5 text-[13px]">{name(s)}</Link>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
