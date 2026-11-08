"use server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaff } from "@/lib/auth/rbac";

export interface Hit { kind: "Order" | "Product" | "Customer" | "Page" | "Post"; title: string; sub?: string; href: string }

/** Admin quick search across orders, products, customers, pages and posts. Only searches what the staff member may view. */
export async function adminSearchAction(q: string): Promise<Hit[]> {
  const staff = await getStaff();
  const term = q.replace(/[%,()]/g, " ").trim();
  if (!staff || term.length < 2) return [];
  const admin = createAdminClient();
  const out: Hit[] = [];
  const jobs: PromiseLike<void>[] = [];
  if (staff.can("orders.view")) jobs.push(admin.from("orders").select("id,order_number,customer_name,phone,grand_total").or(`order_number.ilike.%${term}%,customer_name.ilike.%${term}%,phone.ilike.%${term}%`).order("placed_at", { ascending: false }).limit(5)
    .then(({ data }) => { (data ?? []).forEach((o) => out.push({ kind: "Order", title: `${o.order_number} · ${o.customer_name}`, sub: String(o.phone), href: `/admin/orders/${o.id}` })); }));
  if (staff.can("products.view")) jobs.push(admin.from("products").select("id,title,sku,status").or(`title.ilike.%${term}%,sku.ilike.%${term}%`).limit(5)
    .then(({ data }) => { (data ?? []).forEach((p) => out.push({ kind: "Product", title: p.title as string, sub: `${p.status}${p.sku ? ` · ${p.sku}` : ""}`, href: `/admin/products/${p.id}` })); }));
  if (staff.can("customers.view")) jobs.push(admin.from("profiles").select("id,full_name,email,phone").eq("is_staff", false).or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`).limit(4)
    .then(({ data }) => { (data ?? []).forEach((c) => out.push({ kind: "Customer", title: (c.full_name as string) ?? "Customer", sub: (c.email as string) ?? (c.phone as string), href: `/admin/customers/${c.id}` })); }));
  if (staff.can("content.view")) {
    jobs.push(admin.from("pages").select("id,title,kind").ilike("title", `%${term}%`).limit(4)
      .then(({ data }) => { (data ?? []).forEach((p) => out.push({ kind: "Page", title: p.title as string, sub: p.kind === "landing" ? "Landing page" : "Page", href: p.kind === "landing" ? `/admin/landing/${p.id}` : `/admin/pages/${p.id}` })); }));
    jobs.push(admin.from("blog_posts").select("id,title").ilike("title", `%${term}%`).limit(4)
      .then(({ data }) => { (data ?? []).forEach((p) => out.push({ kind: "Post", title: p.title as string, href: `/admin/posts/${p.id}` })); }));
  }
  await Promise.all(jobs);
  return out;
}
