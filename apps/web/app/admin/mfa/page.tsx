import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MfaFlow } from "./mfa-flow";

export const dynamic = "force-dynamic";

export default async function MfaPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/admin/login");
  return (
    <main className="flex min-h-dvh items-center justify-center p-5">
      <div aria-hidden className="pointer-events-none fixed left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />
      <MfaFlow />
    </main>
  );
}
