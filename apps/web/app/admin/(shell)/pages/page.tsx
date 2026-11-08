import { requireStaff } from "@/lib/auth/rbac";
import { PageList } from "./page-list";

export const metadata = { title: "Pages" };
export default async function PagesPage() {
  const staff = await requireStaff("content.view");
  return <PageList kind="page" canEdit={staff.can("content.update")} canDelete={staff.can("content.delete")} />;
}
