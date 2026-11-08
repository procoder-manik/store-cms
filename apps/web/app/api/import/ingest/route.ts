import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sha256 } from "@/lib/security/crypto";
import { rateLimit } from "@/lib/security/ratelimit";
import { importedSchema } from "@/lib/importers/schema";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Authorization, Content-Type" };

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

/** Receives a product captured by the browser extension and stores it as an import job for review. */
export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (token.length < 20) return NextResponse.json({ error: "Missing import token" }, { status: 401, headers: cors });
  const admin = createAdminClient();
  const { data: t } = await admin.from("import_tokens").select("id,created_by,revoked_at").eq("token_hash", sha256(token)).maybeSingle();
  if (!t || t.revoked_at) return NextResponse.json({ error: "Invalid or revoked import token" }, { status: 401, headers: cors });
  if (!(await rateLimit(`ingest:${t.id}`, 60, 600)).ok) return NextResponse.json({ error: "Too many imports. Wait a few minutes." }, { status: 429, headers: cors });

  const body = await req.json().catch(() => null);
  const parsed = importedSchema.safeParse(body?.product ?? body);
  if (!parsed.success) {
    return NextResponse.json({ error: `Could not read this product: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}` }, { status: 422, headers: cors });
  }
  const p = parsed.data;
  const { data: job, error } = await admin.from("import_jobs").insert({
    source_platform: p.source, url: p.sourceUrl, status: "previewed", raw: body?.raw ?? null, normalized: p, actor_id: t.created_by,
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: cors });
  await admin.from("import_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", t.id);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return NextResponse.json({ ok: true, jobId: job.id, reviewUrl: `${site}/admin/imports/${job.id}` }, { headers: cors });
}
