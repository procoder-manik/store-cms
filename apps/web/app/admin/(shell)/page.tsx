import Link from "next/link";
import { requireStaff } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatusBadge, STATUS_LABEL } from "@/components/admin/orders/status-badge";
import { SalesChart, type Point } from "@/components/admin/dashboard/sales-chart";
import { RangePicker } from "@/components/admin/dashboard/range-picker";
import { formatBDT } from "@/lib/utils";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const RANGES: Record<string, { days: number; bucket: "hour" | "day" | "week" | "month"; label: string }> = {
  "1d": { days: 1, bucket: "hour", label: "Last 24 hours" }, "7d": { days: 7, bucket: "day", label: "Last 7 days" },
  "15d": { days: 15, bucket: "day", label: "Last 15 days" }, "30d": { days: 30, bucket: "day", label: "Last 30 days" },
  "3m": { days: 90, bucket: "week", label: "Last 3 months" }, "6m": { days: 182, bucket: "week", label: "Last 6 months" },
  "1y": { days: 365, bucket: "month", label: "Last 12 months" },
};

type Stats = {
  revenue: number; orders: number; all_orders: number; aov: number; items: number; profit: number; discounts: number; new_customers: number;
  delivered: number; cancelled: number; by_status: Record<string, number>; by_payment: Record<string, { orders: number; revenue: number }>;
  by_source: Record<string, number>; top_products: { product_id: string; title: string; qty: number; revenue: number }[];
  top_categories: { name: string; revenue: number; qty: number }[]; by_district: { district: string; orders: number; revenue: number }[];
};

function delta(now: number, before: number) {
  if (!before) return now ? 100 : 0;
  return Math.round(((now - before) / before) * 100);
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string; denied?: string }> }) {
  const staff = await requireStaff();
  const sp = await searchParams;
  if (!staff.can("dashboard.view")) {
    return <div className="mx-auto max-w-3xl"><h1 className="headline text-[28px]">Welcome, {staff.name ?? "there"}</h1><p className="mt-2 text-fg-muted">Use the menu to get started.</p></div>;
  }
  const custom = sp.from && sp.to;
  const r = RANGES[sp.range ?? "30d"] ?? RANGES["30d"]!;
  const to = custom ? new Date(new Date(sp.to!).getTime() + 86399000) : new Date();
  const from = custom ? new Date(sp.from!) : new Date(to.getTime() - r.days * 86400000);
  const span = to.getTime() - from.getTime();
  const days = span / 86400000;
  const bucket = custom ? (days <= 2 ? "hour" : days <= 45 ? "day" : days <= 200 ? "week" : "month") : r.bucket;
  const prevFrom = new Date(from.getTime() - span);

  const supabase = await createClient();
  const [cur, prev, series, prevSeries, { data: recent }, { data: low }] = await Promise.all([
    supabase.rpc("dashboard_stats", { p_from: from.toISOString(), p_to: to.toISOString() }),
    supabase.rpc("dashboard_stats", { p_from: prevFrom.toISOString(), p_to: from.toISOString() }),
    supabase.rpc("sales_summary", { p_from: from.toISOString(), p_to: to.toISOString(), p_bucket: bucket }),
    supabase.rpc("sales_summary", { p_from: prevFrom.toISOString(), p_to: from.toISOString(), p_bucket: bucket }),
    createAdminClient().from("orders").select("id,order_number,customer_name,status,grand_total,placed_at").order("placed_at", { ascending: false }).limit(8),
    createAdminClient().from("products").select("id,title,stock,low_stock_threshold").eq("status", "published").eq("track_inventory", true).lte("stock", 5).order("stock").limit(8),
  ]);
  const s = (cur.data ?? {}) as Stats;
  const p = (prev.data ?? {}) as Stats;
  const prevRows = (prevSeries.data ?? []) as { revenue: number; orders: number }[];
  const fmt = (d: string) => {
    const dt = new Date(d);
    return bucket === "hour" ? dt.toLocaleTimeString("en-GB", { hour: "2-digit", timeZone: "Asia/Dhaka" })
      : bucket === "month" ? dt.toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "Asia/Dhaka" })
      : dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Dhaka" });
  };
  const points: Point[] = ((series.data ?? []) as { bucket: string; revenue: number; orders: number; profit: number }[]).map((row, i) => ({
    label: fmt(row.bucket), revenue: Number(row.revenue), orders: Number(row.orders), profit: Number(row.profit), previous: Number(prevRows[i]?.revenue ?? 0),
  }));

  const kpis = [
    { label: "Revenue", value: formatBDT(s.revenue ?? 0), d: delta(s.revenue, p.revenue) },
    { label: "Orders", value: String(s.orders ?? 0), d: delta(s.orders, p.orders) },
    { label: "Average order", value: formatBDT(s.aov ?? 0), d: delta(s.aov, p.aov) },
    { label: "Gross profit", value: formatBDT(s.profit ?? 0), d: delta(s.profit, p.profit) },
    { label: "New customers", value: String(s.new_customers ?? 0), d: delta(s.new_customers, p.new_customers) },
    { label: "Items sold", value: String(s.items ?? 0), d: delta(s.items, p.items) },
    { label: "Delivered", value: String(s.delivered ?? 0), d: delta(s.delivered, p.delivered) },
    { label: "Cancel / return rate", value: `${s.all_orders ? Math.round((s.cancelled / s.all_orders) * 100) : 0}%`, d: null as number | null },
  ];
  const payTotal = Object.values(s.by_payment ?? {}).reduce((a, b) => a + b.revenue, 0);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="headline text-[28px]">Dashboard</h1>
          <p className="mt-1 text-[14px] text-fg-muted">{custom ? `${sp.from} to ${sp.to}` : r.label}, compared with the period before.</p>
        </div>
        <RangePicker active={custom ? "custom" : sp.range ?? "30d"} />
      </div>
      {sp.denied && <p className="mt-4 rounded-[14px] bg-warning/10 p-3 text-[14px]">You do not have access to that page.</p>}

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-[18px] bg-surface p-4 shadow-card md:p-5">
            <p className="text-[13px] text-fg-muted">{k.label}</p>
            <p className="mt-1.5 text-[24px] font-semibold tracking-tight md:text-[26px]">{k.value}</p>
            {k.d !== null && <p className={`mt-0.5 text-[12px] ${k.d >= 0 ? "text-success" : "text-danger"}`}>{k.d >= 0 ? "▲" : "▼"} {Math.abs(k.d)}%</p>}
          </div>
        ))}
      </div>

      <section className="mt-5 rounded-[20px] bg-surface p-5 shadow-card">
        <h2 className="text-[17px] font-semibold">Sales</h2>
        <SalesChart data={points} />
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <section className="rounded-[20px] bg-surface p-5 shadow-card">
          <h2 className="text-[17px] font-semibold">Orders by status</h2>
          <ul className="mt-3 space-y-2 text-[14px]">
            {Object.entries(s.by_status ?? {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <li key={k} className="flex items-center justify-between"><Link href={`/admin/orders?status=${k}`}><StatusBadge status={k} /></Link><span className="font-medium">{v}</span></li>
            ))}
            {!Object.keys(s.by_status ?? {}).length && <li className="text-fg-muted">No orders in this period.</li>}
          </ul>
        </section>
        <section className="rounded-[20px] bg-surface p-5 shadow-card">
          <h2 className="text-[17px] font-semibold">Payment methods</h2>
          <ul className="mt-3 space-y-3 text-[14px]">
            {Object.entries(s.by_payment ?? {}).map(([k, v]) => (
              <li key={k}>
                <div className="flex justify-between"><span>{k === "cod" ? "Cash on delivery" : k === "bkash" ? "bKash" : "SSLCommerz"}</span><span className="font-medium">{formatBDT(v.revenue)}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-fill"><div className="h-full rounded-full bg-accent" style={{ width: `${payTotal ? (v.revenue / payTotal) * 100 : 0}%` }} /></div>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-[20px] bg-surface p-5 shadow-card">
          <h2 className="text-[17px] font-semibold">Top districts</h2>
          <ul className="mt-3 space-y-2 text-[14px]">
            {(s.by_district ?? []).map((d) => <li key={d.district} className="flex justify-between"><span>{d.district}</span><span className="text-fg-muted">{d.orders} · {formatBDT(d.revenue)}</span></li>)}
          </ul>
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-[20px] bg-surface p-5 shadow-card">
          <h2 className="text-[17px] font-semibold">Best sellers</h2>
          <ul className="mt-3 space-y-2 text-[14px]">
            {(s.top_products ?? []).map((t) => (
              <li key={t.product_id} className="flex justify-between gap-3"><Link href={`/admin/products/${t.product_id}`} className="truncate hover:text-accent">{t.title}</Link><span className="shrink-0 text-fg-muted">{t.qty} sold · {formatBDT(t.revenue)}</span></li>
            ))}
          </ul>
          {(s.top_categories ?? []).length > 0 && (
            <>
              <h3 className="mt-5 text-[14px] font-semibold">Top categories</h3>
              <ul className="mt-2 space-y-1.5 text-[14px]">{s.top_categories.map((c) => <li key={c.name} className="flex justify-between"><span>{c.name}</span><span className="text-fg-muted">{formatBDT(c.revenue)}</span></li>)}</ul>
            </>
          )}
        </section>
        <section className="rounded-[20px] bg-surface p-5 shadow-card">
          <h2 className="text-[17px] font-semibold">Recent orders</h2>
          <ul className="mt-3 space-y-2 text-[14px]">
            {(recent ?? []).map((o) => (
              <li key={o.id as string} className="flex items-center justify-between gap-3">
                <Link href={`/admin/orders/${o.id}`} className="hover:text-accent"><span className="font-medium">{o.order_number as string}</span> <span className="text-fg-muted">{o.customer_name as string}</span></Link>
                <span className="flex items-center gap-2"><span className="text-[12px] text-fg-muted">{STATUS_LABEL(o.status as string)}</span>{formatBDT(Number(o.grand_total))}</span>
              </li>
            ))}
          </ul>
          {(low ?? []).length > 0 && (
            <>
              <h3 className="mt-5 text-[14px] font-semibold text-danger">Running low</h3>
              <ul className="mt-2 space-y-1.5 text-[14px]">{low!.map((l) => <li key={l.id as string} className="flex justify-between"><Link href={`/admin/products/${l.id}`} className="truncate hover:text-accent">{l.title as string}</Link><span className="text-danger">{l.stock as number} left</span></li>)}</ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
