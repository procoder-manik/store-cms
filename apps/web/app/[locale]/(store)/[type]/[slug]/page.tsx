import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getPost, postTypeByPath } from "@/lib/content/posts";
import { PostView } from "@/components/content/post-view";
import { buildMetadata } from "@/lib/seo/meta";
import type { SeoData } from "@/lib/seo/model";

export const revalidate = 300;
type Props = { params: Promise<{ locale: string; type: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type: path, slug } = await params;
  const type = await postTypeByPath(path);
  const r = type ? await getPost(type.id, slug) : null;
  if (!r || !type) notFound();
  const p = r.post as { title: string; excerpt: string | null; cover_url: string | null; published_at: string; seo?: SeoData };
  return buildMetadata({ seo: p.seo, title: p.title, description: p.excerpt, image: p.cover_url, path: `/${type.path}/${slug}`, type: "article", publishedTime: p.published_at });
}

export default async function PostPage({ params }: Props) {
  const { locale, type: path, slug } = await params;
  setRequestLocale(locale);
  const type = await postTypeByPath(path);
  if (!type) notFound();
  const r = await getPost(type.id, slug);
  if (!r) notFound();
  return <PostView type={type} post={r.post} prev={r.prev} next={r.next} related={r.related} locale={locale} />;
}
