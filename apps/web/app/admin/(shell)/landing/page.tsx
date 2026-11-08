import { requireStaff } from "@/lib/auth/rbac";
import { PageList } from "../pages/page-list";

export const metadata = { title: "Landing pages" };
export default async function LandingPages() {
  const staff = await requireStaff("content.view");
  return <PageList kind="landing" canEdit={staff.can("content.update")} canDelete={staff.can("content.delete")} />;
}
