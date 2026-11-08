"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { bdPhone } from "@/lib/validators/auth";
import { ALL_DISTRICTS, divisionOf } from "@/lib/data/bd-locations";
import type { ActionResult } from "@/lib/actions/result";

const schema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().max(30).optional().default(""),
  name: z.string().trim().min(2).max(80),
  phone: bdPhone,
  district: z.string().refine((d) => ALL_DISTRICTS.includes(d)),
  upazila: z.string().trim().max(60).optional().default(""),
  address_line: z.string().trim().min(5).max(300),
  is_default: z.boolean().default(false),
});

async function uid() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, id: data.user?.id ?? null };
}

export async function saveAddressAction(input: z.input<typeof schema>): Promise<ActionResult> {
  const { supabase, id } = await uid();
  if (!id) return { ok: false, error: "login" };
  const d = schema.safeParse(input);
  if (!d.success) return { ok: false, error: "form" };
  const { id: addrId, ...row } = d.data;
  const values = { ...row, label: row.label || null, upazila: row.upazila || null, division: divisionOf(row.district), user_id: id };
  if (values.is_default) await supabase.from("addresses").update({ is_default: false }).eq("user_id", id);
  const { error } = addrId
    ? await supabase.from("addresses").update(values).eq("id", addrId).eq("user_id", id)
    : await supabase.from("addresses").insert(values);
  if (error) return { ok: false, error: "generic" };
  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function deleteAddressAction(addrId: string): Promise<ActionResult> {
  const { supabase, id } = await uid();
  if (!id) return { ok: false, error: "login" };
  await supabase.from("addresses").delete().eq("id", addrId).eq("user_id", id);
  revalidatePath("/account/addresses");
  return { ok: true };
}
