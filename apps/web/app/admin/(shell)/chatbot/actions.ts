"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPermission } from "@/lib/auth/rbac";
import type { ActionResult } from "@/lib/actions/result";

const schema = z.object({ id: z.string().uuid().optional(), title: z.string().trim().min(2).max(120), content: z.string().trim().min(5).max(4000), is_active: z.boolean() });

export async function saveKnowledgeAction(input: z.infer<typeof schema>): Promise<ActionResult> {
  try {
    await assertPermission("chatbot.update");
    const { id, ...d } = schema.parse(input);
    const admin = createAdminClient();
    const { error } = id ? await admin.from("chatbot_knowledge").update({ ...d, updated_at: new Date().toISOString() }).eq("id", id) : await admin.from("chatbot_knowledge").insert(d);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/chatbot");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof z.ZodError ? e.issues[0]?.message ?? "Invalid" : e instanceof Error ? e.message : "Failed" }; }
}

export async function deleteKnowledgeAction(id: string): Promise<ActionResult> {
  try {
    await assertPermission("chatbot.delete");
    await createAdminClient().from("chatbot_knowledge").delete().eq("id", id);
    revalidatePath("/admin/chatbot");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Failed" }; }
}

export async function refreshBrainAction(): Promise<ActionResult<{ brain: string }>> {
  try {
    await assertPermission("chatbot.update");
    const { buildBrain } = await import("@/lib/ai/brain");
    return { ok: true, data: { brain: await buildBrain() } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Failed" }; }
}

/** Saves a customer question and the assistant's (edited) answer as knowledge, so it answers the same way next time. */
export async function teachAction(question: string, answer: string): Promise<ActionResult> {
  try {
    await assertPermission("chatbot.update");
    const q = question.trim().slice(0, 120), a = answer.trim().slice(0, 4000);
    if (q.length < 3 || a.length < 3) return { ok: false, error: "Question and answer are needed." };
    await createAdminClient().from("chatbot_knowledge").insert({ title: q, content: a, is_active: true });
    revalidatePath("/admin/chatbot");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Failed" }; }
}
