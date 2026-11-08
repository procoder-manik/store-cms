import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULTS } from "@/lib/email/templates";
import { EmailManager } from "./email-manager";

export const metadata = { title: "Emails" };

export default async function EmailsPage() {
  const staff = await requireStaff("emails.view");
  const admin = createAdminClient();
  const [{ data: overrides }, { data: queue }] = await Promise.all([
    admin.from("email_templates").select("*"),
    admin.from("email_queue").select("id,event,to_email,status,attempts,error,created_at,sent_at").order("id", { ascending: false }).limit(60),
  ]);
  const templates = Object.entries(DEFAULTS).map(([event, d]) => {
    const o = (overrides ?? []).find((x) => x.event === event);
    return { event, subject: (o?.subject as string) ?? d.en.subject, heading: (o?.heading as string) ?? d.en.heading, body_html: (o?.body_html as string) ?? d.en.body, is_active: (o?.is_active as boolean) ?? true, customized: !!o, blocks: ((o?.blocks as unknown[]) ?? []) as never[] };
  });
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="headline text-[28px]">Emails</h1>
      <p className="mt-1 text-[14px] text-fg-muted">
        {process.env.RESEND_API_KEY ? "Sending through Resend." : "Add RESEND_API_KEY to start sending. Emails wait in the queue until then."} Bangla customers get the Bangla version automatically.
      </p>
      <EmailManager templates={templates} queue={(queue ?? []) as never} canEdit={staff.can("emails.update")} />
    </div>
  );
}
