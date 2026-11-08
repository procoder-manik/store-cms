import { requireStaff } from "@/lib/auth/rbac";
import { getSettingValue } from "@/lib/settings/server";
import { resolveAppearance, type Appearance } from "@/lib/theme/presets";
import { AppearanceEditor } from "./appearance-editor";

export const metadata = { title: "Appearance" };

export default async function AppearancePage() {
  const staff = await requireStaff("settings.view");
  const current = resolveAppearance(await getSettingValue<Partial<Appearance>>("theme"));
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="headline text-[28px]">Appearance</h1>
      <p className="mt-1 text-[14px] text-fg-muted">Pick a theme, then fine-tune colors, fonts, header, footer and product cards. Changes apply to the whole store.</p>
      <AppearanceEditor current={current} canEdit={staff.can("settings.update")} />
    </div>
  );
}
