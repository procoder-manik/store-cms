import { requireStaff } from "@/lib/auth/rbac";
import { ReportDownloads } from "./report-downloads";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  const staff = await requireStaff("reports.view");
  const items = [
    { type: "orders", title: "Orders", body: "Every order with status, payment, customer, address, totals and courier.", can: staff.can("orders.export"), dated: true },
    { type: "order_items", title: "Items sold", body: "One row per product sold, with cost price for profit analysis.", can: staff.can("reports.export"), dated: true },
    { type: "products", title: "Products", body: "Catalog with prices, stock, sales and ratings.", can: staff.can("products.export"), dated: false },
    { type: "customers", title: "Customers", body: "Registered customers and marketing consent.", can: staff.can("customers.export"), dated: false },
    { type: "coupons", title: "Coupon usage", body: "Which codes were used, on which order and how much discount.", can: staff.can("coupons.export"), dated: true },
    { type: "newsletter", title: "Newsletter", body: "Subscriber list for email campaigns.", can: staff.can("marketing.export"), dated: false },
  ];
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="headline text-[28px]">Reports</h1>
      <p className="mt-1 text-[14px] text-fg-muted">Download spreadsheets (CSV, opens in Excel and Google Sheets). Charts live on the Dashboard.</p>
      <ReportDownloads items={items.filter((i) => i.can)} />
    </div>
  );
}
