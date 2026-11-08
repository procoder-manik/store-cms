import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/rbac";
import { PageEditor } from "../../pages/page-editor";
import { loadPage } from "../../pages/load";

export const metadata = { title: "Edit landing page" };

export default async function EditLanding({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff("content.view");
  const r = await loadPage((await params).id, "landing");
  if (!r) notFound();
  return <PageEditor initial={{ ...r.initial, kind: "landing" }} productTitle={r.productTitle} code={r.code} canCode={staff.can("code.update")} />;
}
