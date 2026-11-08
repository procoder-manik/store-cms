"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonClass } from "@/components/ui/button";
import { SearchBox } from "@/components/store/search-box";
import { createClient } from "@/lib/supabase/client";

export function NotFoundView() {
  const t = useTranslations("notFound");
  const pathname = usePathname();
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !pathname) return;
    createClient().rpc("log_not_found", { p_path: pathname }).then(() => {}, () => {});
  }, [pathname]);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 text-center">
      <p className="text-[80px] font-semibold leading-none tracking-tighter text-fg-subtle">404</p>
      <h1 className="headline mt-4 text-[30px]">{t("title")}</h1>
      <p className="mt-2 max-w-md text-fg-muted">{t("body")}</p>
      <div className="mt-6 w-full max-w-sm"><SearchBox /></div>
      <Link href="/" className={buttonClass("primary", "lg", "mt-6")}>{t("home")}</Link>
    </main>
  );
}
