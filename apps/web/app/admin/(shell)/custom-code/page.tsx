import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { CodePanel, type CodeValue } from "@/components/admin/code/code-panel";

export const metadata = { title: "Custom code" };

export default async function CustomCodePage() {
  await requireStaff("code.update");
  const { data } = await createAdminClient().from("custom_code").select("entity,entity_id,head,body_start,footer").in("entity_id", ["site", "home"]);
  const get = (id: string) => ((data ?? []).find((r) => r.entity_id === id) as CodeValue | undefined) ?? null;
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div><h1 className="headline text-[28px]">Custom code</h1><p className="mt-1 text-[14px] text-fg-muted">Add code to the header, body and footer of every page, or only the home page. For one page, product or post, open its editor and use the Custom code box there. Tracking IDs (Google Analytics, Pixel and more) have their own fields under SEO and tracking.</p></div>
      <CodePanel entity="global" id="site" initial={get("site")} canEdit scope="every page of the store" />
      <CodePanel entity="home" id="home" initial={get("home")} canEdit scope="the home page" />
    </div>
  );
}
