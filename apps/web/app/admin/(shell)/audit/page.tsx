import Link from "next/link";
import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Activity log" };
const PAGE = 50;

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string; entity?: string }> }) {
  await requireStaff("audit.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  let q = createAdminClient()
    .from("audit_logs")
    .select("id,action,entity,entity_id,ip,created_at,profiles(full_name,email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (sp.entity) q = q.eq("entity", sp.entity);
  const { data, count } = await q;
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="headline text-[28px]">Activity log</h1>
      <p className="mt-1 text-[14px] text-fg-muted">Every change made in Admin, newest first.</p>
      <div className="mt-6 overflow-x-auto rounded-[20px] bg-surface shadow-card">
        <table className="w-full min-w-[720px] text-left text-[14px]">
          <thead className="text-[12px] text-fg-muted">
            <tr className="border-b border-line">
              <th className="px-5 py-3 font-medium">When</th>
              <th className="px-5 py-3 font-medium">Who</th>
              <th className="px-5 py-3 font-medium">Action</th>
              <th className="px-5 py-3 font-medium">Record</th>
              <th className="px-5 py-3 font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((r) => {
              const who = r.profiles as unknown as { full_name: string | null; email: string | null } | null;
              return (
                <tr key={r.id as number} className="border-b border-line last:border-0">
                  <td className="whitespace-nowrap px-5 py-3 text-fg-muted">{new Date(r.created_at as string).toLocaleString("en-GB")}</td>
                  <td className="px-5 py-3">{who?.full_name ?? who?.email ?? "System"}</td>
                  <td className="px-5 py-3 font-medium">{r.action as string}</td>
                  <td className="px-5 py-3 text-fg-muted">
                    <Link href={`/admin/audit?entity=${r.entity}`} className="hover:text-accent">{r.entity as string}</Link>
                    {r.entity_id ? <span className="ml-1 font-mono text-[12px]">{String(r.entity_id).slice(0, 8)}</span> : null}
                  </td>
                  <td className="px-5 py-3 font-mono text-[12px] text-fg-subtle">{(r.ip as string | null) ?? ""}</td>
                </tr>
              );
            })}
            {!data?.length && <tr><td colSpan={5} className="px-5 py-10 text-center text-fg-muted">No activity yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between text-[14px]">
        <span className="text-fg-muted">Page {page} of {pages}</span>
        <div className="flex gap-3">
          {page > 1 && <Link className="text-accent" href={`/admin/audit?page=${page - 1}${sp.entity ? `&entity=${sp.entity}` : ""}`}>Newer</Link>}
          {page < pages && <Link className="text-accent" href={`/admin/audit?page=${page + 1}${sp.entity ? `&entity=${sp.entity}` : ""}`}>Older</Link>}
        </div>
      </div>
    </div>
  );
}
