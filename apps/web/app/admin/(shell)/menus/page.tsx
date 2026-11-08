import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { MENU_KEYS, type MenuItem } from "@/lib/data/menus";
import { MenuEditor } from "./menu-editor";

export const metadata = { title: "Menus" };

export default async function MenusPage() {
  const staff = await requireStaff("content.view");
  const { data } = await createAdminClient().from("menus").select("key,items");
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="headline text-[28px]">Menus</h1>
      <p className="mt-1 text-[14px] text-fg-muted">Build the header and footer menus. Leave a menu empty to use the default links of your theme. Drag order with the arrows; add a dropdown by adding sub-items.</p>
      <div className="mt-6 space-y-5">
        {MENU_KEYS.map((m) => <MenuEditor key={m.key} menuKey={m.key} title={m.label} hint={m.hint} initial={(((data ?? []).find((r) => r.key === m.key)?.items as MenuItem[] | undefined) ?? []).filter((i) => typeof i?.url === "string")} canEdit={staff.can("content.update")} />)}
      </div>
    </div>
  );
}
