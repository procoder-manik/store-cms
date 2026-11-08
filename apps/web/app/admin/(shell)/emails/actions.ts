"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPermission } from "@/lib/auth/rbac";
import { processEmailQueue } from "@/lib/email/worker";
import { logAudit } from "@/lib/audit";
import { DEFAULTS } from "@/lib/email/templates";
import type { ActionResult } from "@/lib/actions/result";

const block = z.object({ type: z.enum(["heading", "text", "button", "products", "image", "divider"]), text: z.string().max(2000).optional(), label: z.string().max(80).optional(), url: z.string().max(500).optional(), image: z.string().max(1000).optional(), source: z.string().max(20).optional(), product_ids: z.array(z.string().uuid()).max(6).optional(), limit: z.number().int().min(1).max(6).optional() });
const schema = z.object({ event: z.string().refine((e) => e in DEFAULTS), subject: z.string().max(200), heading: z.string().max(200), body_html: z.string().max(5000), is_active: z.boolean(), blocks: z.array(block).max(12).default([]) });

export async function saveTemplateAction(input: z.infer<typeof schema>): Promise<ActionResult> {
  try {
    const staff = await assertPermission("emails.update");
    const d = schema.parse(input);
    await createAdminClient().from("email_templates").upsert({ ...d, subject: d.subject || DEFAULTS[d.event as keyof typeof DEFAULTS].en.subject, updated_at: new Date().toISOString() });
    await logAudit({ actorId: staff.userId, action: "email.template", entity: "email_templates", entityId: d.event });
    revalidatePath("/admin/emails");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Failed" }; }
}

export async function sendTestAction(event: string): Promise<ActionResult> {
  try {
    const staff = await assertPermission("emails.update");
    if (!(event in DEFAULTS)) return { ok: false, error: "Unknown event" };
    if (!process.env.RESEND_API_KEY) return { ok: false, error: "Add RESEND_API_KEY to .env.local first." };
    const admin = createAdminClient();
    const { data: lastOrder } = await admin.from("orders").select("id").order("placed_at", { ascending: false }).limit(1).maybeSingle();
    const { data: product } = await admin.from("products").select("id").limit(1).maybeSingle();
    await admin.from("email_queue").insert({ event, to_email: staff.email, payload: { order_id: lastOrder?.id, product_id: product?.id, name: staff.name ?? "Test", note: "This is a test email.", link: process.env.NEXT_PUBLIC_SITE_URL } });
    const r = await processEmailQueue(5);
    return r.failed ? { ok: false, error: "Sending failed. See the queue below for the error." } : { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Failed" }; }
}

export async function retryEmailAction(id: number): Promise<ActionResult> {
  try {
    await assertPermission("emails.update");
    await createAdminClient().from("email_queue").update({ status: "queued", attempts: 0, send_after: new Date().toISOString() }).eq("id", id);
    await processEmailQueue(3);
    revalidatePath("/admin/emails");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Failed" }; }
}

export async function runQueueAction(): Promise<ActionResult<{ sent: number }>> {
  try {
    await assertPermission("emails.update");
    const r = await processEmailQueue(30);
    revalidatePath("/admin/emails");
    return { ok: true, data: { sent: r.sent } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Failed" }; }
}
