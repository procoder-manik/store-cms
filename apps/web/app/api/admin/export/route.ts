import { NextResponse, type NextRequest } from "next/server";
import { getStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PermissionKey } from "@/lib/auth/permissions";

const PERM: Record<string, PermissionKey> = { orders: "orders.export", order_items: "reports.export", products: "products.export", customers: "customers.export", newsletter: "marketing.export", coupons: "coupons.export" };

function csv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "\uFEFF";
  const cols = Object.keys(rows[0]!);
  const cell = (v: unknown) => {
    const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    // Neutralise spreadsheet formulas and quote everything
    return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
  };
  return "\uFEFF" + [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
}

/** CSV downloads for staff with the matching export permission. BOM included so Excel shows Bangla correctly. */
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "";
  const staff = await getStaff();
  if (!PERM[type] || !staff?.can(PERM[type])) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const fromIso = from ? new Date(from).toISOString() : "2000-01-01";
  const toIso = to ? new Date(new Date(to).getTime() + 86399000).toISOString() : new Date().toISOString();
  const admin = createAdminClient();
  let rows: Record<string, unknown>[] = [];

  if (type === "orders") {
    const { data } = await admin.from("orders").select("order_number,placed_at,status,payment_status,payment_method,customer_name,phone,email,shipping_address,subtotal,discount_total,shipping_total,grand_total,coupon_code,courier,tracking_code,source")
      .gte("placed_at", fromIso).lte("placed_at", toIso).order("placed_at").limit(20000);
    rows = (data ?? []).map((o) => ({ ...o, shipping_address: [(o.shipping_address as Record<string, string>).address_line, (o.shipping_address as Record<string, string>).district].filter(Boolean).join(", ") }));
  } else if (type === "order_items") {
    const { data } = await admin.from("order_items").select("title,variant_title,sku,quantity,unit_price,cost_price,total,orders!inner(order_number,placed_at,status)")
      .gte("orders.placed_at", fromIso).lte("orders.placed_at", toIso).limit(50000);
    rows = (data ?? []).map((i) => { const o = i.orders as unknown as Record<string, unknown>; const { orders: _o, ...rest } = i; void _o; return { order_number: o.order_number, placed_at: o.placed_at, status: o.status, ...rest }; });
  } else if (type === "products") {
    const { data } = await admin.from("products").select("title,slug,sku,status,price,compare_at_price,cost_price,stock,sold_count,rating_avg,rating_count,source_platform,source_url,created_at").order("created_at").limit(20000);
    rows = data ?? [];
  } else if (type === "customers") {
    const { data } = await admin.from("profiles").select("full_name,email,phone,created_at,last_login_at,loyalty_points,marketing_opt_in,is_blocked").eq("is_staff", false).order("created_at").limit(50000);
    rows = data ?? [];
  } else if (type === "newsletter") {
    const { data } = await admin.from("newsletter_subscribers").select("email,status,source,created_at").order("created_at").limit(50000);
    rows = data ?? [];
  } else if (type === "coupons") {
    const { data } = await admin.from("coupon_redemptions").select("amount,phone,created_at,coupons(code),orders(order_number)").gte("created_at", fromIso).lte("created_at", toIso).limit(50000);
    rows = (data ?? []).map((r) => ({ code: (r.coupons as unknown as { code: string })?.code, order: (r.orders as unknown as { order_number: string })?.order_number, discount: r.amount, phone: r.phone, date: r.created_at }));
  }
  return new NextResponse(csv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${type}-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" },
  });
}
