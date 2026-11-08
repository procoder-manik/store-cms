import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { getImportPricing, toBDT } from "@/lib/importers/pricing";
import { importedSchema } from "@/lib/importers/schema";
import { ImportReview } from "./import-review";

export const metadata = { title: "Review import" };
export const maxDuration = 60;

export default async function ImportReviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("imports.create");
  const { id } = await params;
  const admin = createAdminClient();
  const [{ data: job }, { data: cats }, pricing] = await Promise.all([
    admin.from("import_jobs").select("*").eq("id", id).maybeSingle(),
    admin.from("categories").select("id,name").order("name"),
    getImportPricing(),
  ]);
  if (!job) notFound();
  const parsed = importedSchema.safeParse(job.normalized);
  if (!parsed.success) return <p className="text-danger">This import has unreadable data: {parsed.error.issues[0]?.message}</p>;
  const p = parsed.data;
  return (
    <ImportReview jobId={id} product={p} status={job.status as string} productId={(job.product_id as string) ?? null} categories={(cats ?? []) as { id: string; name: string }[]}
      suggested={toBDT(p.price, p.currency, pricing)} cost={Math.round(toBDT(p.price, p.currency, pricing, false))} defaultStatus={pricing.default_status} />
  );
}
