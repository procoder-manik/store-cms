import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrder } from "@/lib/data/orders";
import { invoiceStore } from "@/lib/data/invoice-store";
import { safeEqual } from "@/lib/security/crypto";
import { Invoice } from "@/components/invoice";
import { PrintTrigger } from "@/components/print-trigger";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

export default async function CustomerInvoice({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ t?: string }> }) {
  const { number } = await params;
  const { t } = await searchParams;
  const order = await getOrder(number);
  if (!order) notFound();
  const { data } = await (await createClient()).auth.getUser();
  if (!((t && safeEqual(t, order.access_token)) || (data.user && data.user.id === order.user_id))) notFound();
  return <div className="min-h-dvh bg-white"><Invoice order={order} store={await invoiceStore()} /><PrintTrigger auto={false} /></div>;
}
