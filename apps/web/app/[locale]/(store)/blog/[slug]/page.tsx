import PostPage, { generateMetadata as meta } from "../../[type]/[slug]/page";

export const revalidate = 300;
type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  return meta({ params: Promise.resolve({ locale, type: "blog", slug }) });
}
export default async function BlogPost({ params }: Props) {
  const { locale, slug } = await params;
  return PostPage({ params: Promise.resolve({ locale, type: "blog", slug }) });
}
