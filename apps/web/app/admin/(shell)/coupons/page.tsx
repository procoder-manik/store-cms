import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { CouponManager, type Coupon } from "./coupon-manager";

export const metadata = { title: "Coupons" };

export default async function CouponsPage() {
  const staff = await requireStaff("coupons.view");
  const admin = createAdminClient();
  const [{ data }, { data: cats }, { data: redemptions }] = await Promise.all([
    admin.from("coupons").select("*").order("created_at", { ascending: false }),
    admin.from("categories").select("id,name").order("name"),
    admin.from("coupon_redemptions").select("coupon_id,amount"),
  ]);
  const totals = new Map<string, number>();
  (redemptions ?? []).forEach((r) => totals.set(r.coupon_id as string, (totals.get(r.coupon_id as string) ?? 0) + Number(r.amount)));
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="headline text-[28px]">Coupons</h1>
      <p className="mt-1 text-[14px] text-fg-muted">Discount codes for checkout. Public codes can also be shown by the chatbot and popups.</p>
      <CouponManager coupons={((data ?? []) as Coupon[]).map((c) => ({ ...c, given: totals.get(c.id) ?? 0 }))} categories={(cats ?? []) as { id: string; name: string }[]}
        canCreate={staff.can("coupons.create")} canUpdate={staff.can("coupons.update")} canDelete={staff.can("coupons.delete")} />
    </div>
  );
}
