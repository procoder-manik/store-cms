import { getTranslations, setRequestLocale } from "next-intl/server";
import { CartPageClient } from "./cart-client";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getTranslations("cart");
  return { title: t("title"), robots: { index: false } };
}

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CartPageClient />;
}
