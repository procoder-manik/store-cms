import Link from "next/link";
import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";
import { BannerManager, FlashSaleManager, PopupManager } from "./marketing-ui";

export const metadata = { title: "Marketing" };
const TABS = [["banners", "Banners"], ["popups", "Popups"], ["flash", "Flash sales"], ["home", "Home page"], ["newsletter", "Newsletter"]] as const;

export default async function MarketingPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const staff = await requireStaff("marketing.view");
  const tab = (await searchParams).tab ?? "banners";
  const admin = createAdminClient();
  const can = staff.can("marketing.update");

  let body: React.ReactNode = null;
  if (tab === "banners") {
    const { data } = await admin.from("banners").select("*").order("placement").order("sort_order");
    body = <BannerManager banners={(data ?? []) as never} canEdit={can} />;
  } else if (tab === "popups") {
    const [{ data }, { data: coupons }] = await Promise.all([admin.from("popups").select("*").order("created_at", { ascending: false }), admin.from("coupons").select("id,code").eq("is_active", true)]);
    body = <PopupManager popups={(data ?? []) as never} coupons={(coupons ?? []) as never} canEdit={can} />;
  } else if (tab === "flash") {
    const { data } = await admin.from("flash_sales").select("*, flash_sale_items(product_id,sale_price,quantity_limit,sold,products(title,price))").order("starts_at", { ascending: false });
    body = <FlashSaleManager sales={(data ?? []) as never} canEdit={can} />;
  } else if (tab === "home") {
    body = (
      <section className="rounded-[20px] bg-surface p-6 shadow-card">
        <h2 className="text-[17px] font-semibold">Home page moved to the Page builder</h2>
        <p className="mt-1 text-[14px] text-fg-muted">Design the home page and other pages visually with 15 section types and 40 designs, with a live preview.</p>
        <Link href="/admin/builder" className="mt-4 inline-flex h-10 items-center rounded-full bg-accent px-5 text-[14px] font-medium text-accent-contrast">Open Page builder</Link>
      </section>
    );
  } else if (tab === "newsletter") {
    const { data, count } = await admin.from("newsletter_subscribers").select("email,status,source,created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(100);
    body = (
      <section className="rounded-[20px] bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold">{count ?? 0} subscribers</h2>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          {staff.can("marketing.export") && <a href="/api/admin/export?type=newsletter" className="text-[14px] text-accent">Download CSV</a>}
        </div>
        <ul className="mt-3">{(data ?? []).map((s) => <li key={s.email as string} className="flex justify-between border-b border-line py-2 text-[14px] last:border-0"><span>{s.email as string}</span><span className="text-fg-muted">{s.status as string} · {new Date(s.created_at as string).toLocaleDateString("en-GB")}</span></li>)}</ul>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="headline text-[28px]">Marketing</h1>
      <nav className="no-scrollbar mt-5 flex gap-1 overflow-x-auto" aria-label="Marketing sections">
        {TABS.map(([k, label]) => <Link key={k} href={`/admin/marketing?tab=${k}`} className={cn("shrink-0 rounded-full px-4 py-1.5 text-[14px]", tab === k ? "bg-fg text-background" : "text-fg-muted hover:bg-fill")}>{label}</Link>)}
      </nav>
      <div className="mt-6">{body}</div>
    </div>
  );
}
