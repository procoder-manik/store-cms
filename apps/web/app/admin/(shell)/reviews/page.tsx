import Link from "next/link";
import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";
import { ModerationItem } from "./moderation-item";

export const metadata = { title: "Reviews" };

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ tab?: string; status?: string }> }) {
  const staff = await requireStaff("reviews.view");
  const sp = await searchParams;
  const tab = sp.tab === "questions" ? "questions" : "reviews";
  const status = ["pending", "approved", "rejected"].includes(sp.status ?? "") ? sp.status! : "pending";
  const admin = createAdminClient();
  const { data } = tab === "reviews"
    ? await admin.from("reviews").select("id,rating,title,body,is_verified,admin_reply,status,created_at,products(id,title),profiles(full_name,email)").eq("status", status).order("created_at", { ascending: false }).limit(60)
    : await admin.from("product_questions").select("id,question,answer,status,created_at,products(id,title),profiles(full_name,email)").eq("status", status).order("created_at", { ascending: false }).limit(60);
  const [{ count: pr }, { count: pq }] = await Promise.all([
    admin.from("reviews").select("*", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("product_questions").select("*", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  const pill = (active: boolean) => cn("rounded-full px-4 py-1.5 text-[14px]", active ? "bg-fg text-background" : "text-fg-muted hover:bg-fill");
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="headline text-[28px]">Reviews and questions</h1>
      <div className="mt-5 flex flex-wrap gap-1">
        <Link className={pill(tab === "reviews")} href="/admin/reviews">Reviews{pr ? ` (${pr})` : ""}</Link>
        <Link className={pill(tab === "questions")} href="/admin/reviews?tab=questions">Questions{pq ? ` (${pq})` : ""}</Link>
        <span className="mx-2 w-px bg-line" />
        {["pending", "approved", "rejected"].map((s) => <Link key={s} className={pill(status === s)} href={`/admin/reviews?tab=${tab}&status=${s}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</Link>)}
      </div>
      <ul className="mt-6 space-y-3">
        {(data ?? []).map((r) => <ModerationItem key={r.id as string} kind={tab === "reviews" ? "review" : "question"} item={r as never} canEdit={staff.can("reviews.update")} />)}
        {!data?.length && <li className="rounded-[20px] bg-surface p-10 text-center text-fg-muted shadow-card">Nothing here.</li>}
      </ul>
    </div>
  );
}
