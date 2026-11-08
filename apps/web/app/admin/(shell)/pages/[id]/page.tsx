import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/rbac";
import { PageEditor } from "../page-editor";
import { loadPage } from "../load";

export const metadata = { title: "Edit page" };

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff("content.view");
  const r = await loadPage((await params).id, "page");
  if (!r) notFound();
  return <PageEditor initial={r.initial} productTitle={r.productTitle} code={r.code} canCode={staff.can("code.update")} />;
}
