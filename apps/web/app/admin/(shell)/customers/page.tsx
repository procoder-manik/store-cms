import Link from "next/link";
import { requireStaff } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { formatBDT } from "@/lib/utils";

export const metadata = { title: "Customers" };
const PAGE = 30;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const staff = await requireStaff("customers.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { data } = await (await createClient()).rpc("customers_overview", { p_q: sp.q?.slice(0, 60) ?? null, p_limit: PAGE, p_offset: (page - 1) * PAGE });
  const rows = (data ?? []) as { id: string; full_name: string | null; email: string | null; phone: string | null; is_blocked: boolean; created_at: string; orders: number; spent: number; last_order: string | null; total_count: number }[];
  const total = rows[0]?.total_count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="headline text-[28px]">Customers</h1><p className="mt-1 text-[14px] text-fg-muted">{total} registered customers</p></div>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        {staff.can("customers.export") && <a href="/api/admin/export?type=customers" className="text-[14px] text-accent">Download CSV</a>}
      </div>
      <form className="mt-5"><input name="q" defaultValue={sp.q ?? ""} placeholder="Search name, email or phone" className="h-10 w-full max-w-md rounded-[12px] bg-fill px-3.5 text-[15px] outline-none focus:ring-2 focus:ring-accent" /></form>
      <div className="mt-4 overflow-x-auto rounded-[20px] bg-surface shadow-card">
        <table className="w-full min-w-[720px] text-left text-[14px]">
          <thead className="text-[12px] text-fg-muted"><tr className="border-b border-line"><th className="px-5 py-3 font-medium">Customer</th><th className="py-3 font-medium">Phone</th><th className="py-3 font-medium">Orders</th><th className="py-3 font-medium">Spent</th><th className="py-3 font-medium">Last order</th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-line last:border-0 hover:bg-fill/40">
                <td className="px-5 py-3"><Link href={`/admin/customers/${c.id}`} className="font-medium hover:text-accent">{c.full_name ?? "No name"}</Link>{c.is_blocked && <span className="ml-2 text-[12px] text-danger">Blocked</span>}<p className="text-[12px] text-fg-muted">{c.email}</p></td>
                <td className="py-3">{c.phone}</td><td className="py-3">{c.orders}</td><td className="py-3 font-medium">{formatBDT(Number(c.spent))}</td>
                <td className="py-3 text-fg-muted">{c.last_order ? new Date(c.last_order).toLocaleDateString("en-GB") : "Never"}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="p-10 text-center text-fg-muted">No customers found.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-between text-[14px]">
        <span className="text-fg-muted">Page {page} of {pages}</span>
        <span className="flex gap-3">{page > 1 && <Link className="text-accent" href={`/admin/customers?page=${page - 1}&q=${sp.q ?? ""}`}>Previous</Link>}{page < pages && <Link className="text-accent" href={`/admin/customers?page=${page + 1}&q=${sp.q ?? ""}`}>Next</Link>}</span>
      </div>
    </div>
  );
}
