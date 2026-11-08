import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { readCart } from "@/lib/cart/server";
import { createClient } from "@/lib/supabase/server";
import { CheckoutForm, type CheckoutFields } from "@/components/store/checkout/checkout-form";
import { getSetting } from "@/lib/data/catalog";
import { enabledPaymentMethods } from "@/lib/payments";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const cart = await readCart();
  if (!cart.lines.length) redirect({ href: "/cart", locale });
  const t = await getTranslations("checkout");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  let defaults;
  if (data.user) {
    const [{ data: profile }, { data: addr }] = await Promise.all([
      supabase.from("profiles").select("full_name,phone,email").eq("id", data.user.id).single(),
      supabase.from("addresses").select("*").eq("user_id", data.user.id).order("is_default", { ascending: false }).limit(1).maybeSingle(),
    ]);
    defaults = {
      name: addr?.name ?? profile?.full_name ?? "", phone: addr?.phone ?? profile?.phone ?? "", email: profile?.email ?? data.user.email ?? "",
      district: addr?.district ?? "", upazila: addr?.upazila ?? "", address: addr?.address_line ?? "",
    };
  }
  return (
    <div className="container-x py-10 md:py-14">
      <h1 className="headline mb-8 text-[34px] md:text-[44px]">{t("title")}</h1>
      <CheckoutForm isGuest={!data.user} defaults={defaults} methods={await enabledPaymentMethods()} fields={(await getSetting<CheckoutFields>("checkout_fields")) ?? {}} />
    </div>
  );
}
