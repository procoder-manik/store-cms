import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { AddressBook, type Address } from "./address-book";

export const dynamic = "force-dynamic";

export default async function AddressesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("misc");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data } = await supabase.from("addresses").select("*").eq("user_id", auth.user!.id).order("is_default", { ascending: false }).order("created_at");
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="headline text-[32px]">{t("addresses")}</h1>
      <AddressBook addresses={(data ?? []) as Address[]} />
    </div>
  );
}
