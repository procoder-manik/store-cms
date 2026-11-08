import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/field";
import { DeleteAccount, ProfileForm, SignOutButton } from "./profile-form";
import { ReferralCard } from "./referral-card";
import { getSetting } from "@/lib/data/catalog";
import { ResetForm } from "@/components/auth/forms";
import { Link } from "@/i18n/navigation";
import { formatBDT } from "@/lib/utils";

export const metadata = { robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const t = await getTranslations("account");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const [{ data: profile }, { data: orders }] = await Promise.all([
    supabase.from("profiles").select("full_name,phone,email,marketing_opt_in,loyalty_points,referral_code").eq("id", auth.user!.id).single(),
    supabase.from("orders").select("order_number,status,grand_total,placed_at").eq("user_id", auth.user!.id).order("placed_at", { ascending: false }).limit(10),
  ]);
  const to = await getTranslations("order");
  const [refCfg, { data: rewards }] = await Promise.all([
    getSetting<{ enabled?: boolean; percent_per_referral?: number; max_percent?: number; points_per_referral?: number }>("referral"),
    supabase.from("referral_rewards").select("used_order_id").eq("referrer_id", auth.user!.id),
  ]);
  const available = (rewards ?? []).filter((r) => !r.used_order_id).length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="headline text-[32px] md:text-[40px]">{t("title")}</h1>
          <p className="mt-1 text-fg-muted">{t("greeting", { name: profile?.full_name ?? profile?.email ?? "" })}</p>
        </div>
        <SignOutButton label={t("signOut")} />
      </div>
      <div className="mt-8 grid gap-5">
        <div className="flex gap-2">
          <Link href="/account/addresses" className="rounded-full bg-surface px-4 py-2 text-[14px] shadow-card">{t("addresses")}</Link>
          <Link href="/account/wishlist" className="rounded-full bg-surface px-4 py-2 text-[14px] shadow-card">{t("wishlist")}</Link>
        </div>
        {refCfg?.enabled && profile?.referral_code && (
          <ReferralCard code={profile.referral_code as string} link={`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/?ref=${profile.referral_code}`}
            available={available} used={(rewards ?? []).length - available} points={(profile.loyalty_points as number) ?? 0}
            percentPer={refCfg.percent_per_referral ?? 10} maxPercent={refCfg.max_percent ?? 50} pointsPer={refCfg.points_per_referral ?? 0} />
        )}
        <Card title={t("orders")}>
          {orders?.length ? (
            <ul>
              {orders.map((o) => (
                <li key={o.order_number as string}>
                  <Link href={`/account/orders/${o.order_number}`} className="flex items-center justify-between border-b border-line py-3 text-[14px] last:border-0 hover:text-accent">
                    <span><span className="font-medium">{o.order_number as string}</span><span className="ml-2 text-fg-muted">{new Date(o.placed_at as string).toLocaleDateString("en-GB")}</span></span>
                    <span className="flex items-center gap-3"><span className="text-fg-muted">{to(`statuses.${o.status}` as "statuses.pending")}</span><span className="font-medium">{formatBDT(Number(o.grand_total))}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="text-[14px] text-fg-muted">{t("ordersEmpty")}</p>}
        </Card>
        <Card title={t("profile")}>
          <ProfileForm initial={{
            full_name: profile?.full_name ?? "", phone: profile?.phone ?? "",
            email: profile?.email ?? auth.user!.email ?? "", marketing_opt_in: !!profile?.marketing_opt_in,
          }} />
        </Card>
        <Card title={t("security")}><div className="max-w-sm"><ResetForm /></div></Card>
        <Card title={t("deleteTitle")}><DeleteAccount /></Card>
      </div>
    </div>
  );
}
