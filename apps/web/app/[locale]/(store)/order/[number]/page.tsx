import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrder } from "@/lib/data/orders";
import { safeEqual } from "@/lib/security/crypto";
import { OrderDetail } from "@/components/store/order-detail";
import { OrderActions } from "@/components/store/order-actions";
import { PurchaseEvent } from "@/components/store/tracking/purchase";
import { enabledPaymentMethods } from "@/lib/payments";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ locale: string; number: string }>; searchParams: Promise<{ t?: string; payment?: string }> }) {
  const { locale, number } = await params;
  setRequestLocale(locale);
  const { t: token, payment } = await searchParams;
  const order = await getOrder(number);
  if (!order) notFound();
  const { data } = await (await createClient()).auth.getUser();
  const allowed = (token && safeEqual(token, order.access_token)) || (data.user && data.user.id === order.user_id);
  if (!allowed) notFound();
  const t = await getTranslations("order");
  return (
    <div className="container-x py-10 md:py-14">
      <div className="mx-auto max-w-2xl text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-success" strokeWidth={1.5} />
        <h1 className="headline mt-4 text-[32px] md:text-[40px]">{t("thanks", { name: order.customer_name.split(" ")[0] ?? "" })}</h1>
        <p className="mt-2 text-fg-muted">{t("placed", { number: order.order_number })}</p>
      </div>
      <OrderActions orderNumber={order.order_number} token={order.access_token} paymentStatus={order.payment_status} paymentMethod={order.payment_method}
        status={order.status} methods={await enabledPaymentMethods()} items={order.items.map((i) => ({ id: i.id, title: i.title }))} justPaid={payment === "success"}
        canReturn={order.status === "delivered"} />
      <div className="mt-10"><OrderDetail order={order} /></div>
      {(order.payment_method === "cod" || order.payment_status === "paid") && !["cancelled", "failed"].includes(order.status) && (
        <PurchaseEvent order={{ number: order.order_number, total: order.grand_total, shipping: order.shipping_total, coupon: order.coupon_code,
          items: order.items.map((i) => ({ id: i.product_id, title: i.title, price: i.unit_price, quantity: i.quantity, variant: i.variant_title })) }} />
      )}
    </div>
  );
}
