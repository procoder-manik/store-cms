import type { ReactNode } from "react";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    const locale = await getLocale();
    redirect({ href: "/login?next=/account", locale });
  }
  return <div className="container-x py-10 md:py-14">{children}</div>;
}
