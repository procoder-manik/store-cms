import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrder } from "@/lib/data/orders";
import { OrderDetail } from "@/components/store/order-detail";
import { OrderActions } from "@/components/store/order-actions";
import { enabledPaymentMethods } from "@/lib/payments";

export const dynamic = "force-dynamic";

export default async function AccountOrderPage({ params }: { params: Promise<{ locale: string; number: string }> }) {
  const { locale, number } = await params;
  setRequestLocale(locale);
  const { data } = await (await createClient()).auth.getUser();
  const order = await getOrder(number);
  if (!order || order.user_id !== data.user?.id) notFound();
  const t = await getTranslations("order");
  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/account" className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-fill" aria-label="Back"><ArrowLeft className="h-4 w-4" /></Link>
      <h1 className="headline text-[30px]">{order.order_number}</h1>
      <p className="mb-8 mt-1 text-fg-muted">{t("placedOn", { date: new Date(order.placed_at).toLocaleDateString(locale === "bn" ? "bn-BD" : "en-GB") })}</p>
      <div className="mb-6"><OrderActions orderNumber={order.order_number} token={order.access_token} paymentStatus={order.payment_status} paymentMethod={order.payment_method}
        status={order.status} methods={await enabledPaymentMethods()} items={order.items.map((i) => ({ id: i.id, title: i.title }))} justPaid={false}
        canReturn={order.status === "delivered"} /></div>
      <OrderDetail order={order} />
    </div>
  );
}
