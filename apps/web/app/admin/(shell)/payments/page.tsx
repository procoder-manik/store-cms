import Link from "next/link";
import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettingValue, secretKeysSet } from "@/lib/settings/server";
import { SettingsForm } from "@/components/admin/settings/settings-form";
import { StatusBadge } from "@/components/admin/orders/status-badge";
import { formatBDT } from "@/lib/utils";

export const metadata = { title: "Payments" };

export default async function PaymentsPage() {
  const staff = await requireStaff("payments.view");
  const can = staff.can("payments.update");
  const [ssl, bk, sslSet, bkSet, { data: log }] = await Promise.all([
    getSettingValue("payment.sslcommerz"), getSettingValue("payment.bkash"), secretKeysSet("payment.sslcommerz"), secretKeysSet("payment.bkash"),
    createAdminClient().from("payments").select("id,gateway,amount,status,transaction_id,created_at,order_id,orders(order_number)").order("created_at", { ascending: false }).limit(50),
  ]);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <h1 className="headline text-[28px]">Payments</h1>
      <SettingsForm settingKey="payment.bkash" title="bKash" description="Tokenized checkout. Get sandbox keys from the bKash developer portal." canEdit={can}
        values={bk} savedSecrets={bkSet} fields={[
          { name: "enabled", label: "Show bKash at checkout", type: "switch" }, { name: "sandbox", label: "Sandbox (test) mode", type: "switch" },
          { name: "app_key", label: "App key", type: "secret" }, { name: "app_secret", label: "App secret", type: "secret" },
          { name: "username", label: "Username", type: "secret" }, { name: "password", label: "Password", type: "secret" },
        ]} />
      <SettingsForm settingKey="payment.sslcommerz" title="SSLCommerz" description={`Cards, Nagad, Rocket and banks. IPN URL: ${site}/api/payments/sslcommerz/ipn`} canEdit={can}
        values={ssl} savedSecrets={sslSet} fields={[
          { name: "enabled", label: "Show SSLCommerz at checkout", type: "switch" }, { name: "sandbox", label: "Sandbox (test) mode", type: "switch" },
          { name: "store_id", label: "Store ID", type: "secret" }, { name: "store_password", label: "Store password", type: "secret" },
        ]} />
      <section className="rounded-[20px] bg-surface p-5 shadow-card">
        <h2 className="text-[17px] font-semibold">Recent transactions</h2>
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-[14px]">
          <tbody>
            {(log ?? []).map((p) => (
              <tr key={p.id as string} className="border-b border-line last:border-0">
                <td className="py-2.5"><Link href={`/admin/orders/${p.order_id}`} className="font-medium hover:text-accent">{(p.orders as unknown as { order_number: string })?.order_number}</Link></td>
                <td className="py-2.5">{p.gateway as string}</td>
                <td className="py-2.5"><StatusBadge status={p.status as string} /></td>
                <td className="py-2.5 font-mono text-[12px] text-fg-muted">{(p.transaction_id as string) ?? ""}</td>
                <td className="py-2.5 text-right">{formatBDT(Number(p.amount))}</td>
              </tr>
            ))}
            {!log?.length && <tr><td className="py-6 text-center text-fg-muted">No online payments yet.</td></tr>}
          </tbody>
        </table></div>
      </section>
    </div>
  );
}
