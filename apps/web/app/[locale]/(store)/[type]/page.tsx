import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { postTypeByPath } from "@/lib/content/posts";
import { PostList } from "@/components/content/post-list";

export const revalidate = 300;
type Props = { params: Promise<{ locale: string; type: string }>; searchParams: Promise<{ category?: string; page?: string }> };

export async function generateMetadata({ params }: Props) {
  const type = await postTypeByPath((await params).type);
  if (!type) notFound(); // a real 404 status for unknown addresses
  return { title: type.label, alternates: { canonical: `/${type.path}` } };
}

export default async function TypeIndex({ params, searchParams }: Props) {
  const { locale, type: path } = await params;
  setRequestLocale(locale);
  const type = await postTypeByPath(path);
  if (!type) notFound();
  const sp = await searchParams;
  return <PostList type={type} locale={locale} category={sp.category} page={Number(sp.page) || 1} />;
}
