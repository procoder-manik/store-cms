import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadProductForEdit } from "../actions";
import { ProductForm } from "./product-form";

export const metadata = { title: "Edit product" };

export default async function ProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "new";
  const staff = await requireStaff(isNew ? "products.create" : "products.view");
  const [product, { data: cats }, { data: brands }, codeRes] = await Promise.all([
    isNew ? Promise.resolve(null) : loadProductForEdit(id),
    createAdminClient().from("categories").select("id,name,parent_id").order("sort_order").order("name"),
    createAdminClient().from("brands").select("id,name").eq("is_active", true).order("name"),
    isNew ? Promise.resolve({ data: null }) : createAdminClient().from("custom_code").select("head,body_start,footer").eq("entity", "product").eq("entity_id", id).maybeSingle(),
  ]);
  if (!isNew && !product) notFound();
  return <ProductForm initial={product} categories={(cats ?? []) as { id: string; name: string; parent_id: string | null }[]} canSave={staff.can(isNew ? "products.create" : "products.update")} brands={(brands ?? []) as { id: string; name: string }[]} code={codeRes.data} canCode={staff.can("code.update")} siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ""} />;
}
