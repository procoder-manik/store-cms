import TypeIndex, { generateMetadata as meta } from "../[type]/page";

export const revalidate = 300;
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ category?: string; page?: string }> };

/** /blog uses the generic post-type pages with the "blog" address. */
export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return meta({ params: Promise.resolve({ locale, type: "blog" }), searchParams: Promise.resolve({}) });
}
export default async function BlogIndex({ params, searchParams }: Props) {
  const { locale } = await params;
  return TypeIndex({ params: Promise.resolve({ locale, type: "blog" }), searchParams });
}
