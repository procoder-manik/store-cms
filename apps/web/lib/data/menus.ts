import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { configured } from "@/lib/data/catalog";

export interface MenuItem { label: string; label_bn?: string; url: string; new_tab?: boolean; children?: MenuItem[] }
export const MENU_KEYS = [
  { key: "header", label: "Header menu", hint: "Main navigation. Items can have a dropdown." },
  { key: "footer_help", label: "Footer: Help column", hint: "Links in the first footer column." },
  { key: "footer_company", label: "Footer: Company column", hint: "Links in the second footer column." },
] as const;

/** Menu saved in Admin > Design > Menus. Empty means the theme's default links are used. */
export const getMenu = cache(async (key: string): Promise<MenuItem[]> => {
  if (!configured()) return [];
  const { data } = await (await createClient()).from("menus").select("items").eq("key", key).maybeSingle();
  // Only items in the current format count. The first install seeded older entries with "href"; those mean "use the theme defaults".
  const clean = (list: unknown): MenuItem[] => (Array.isArray(list) ? list : [])
    .filter((i): i is MenuItem => !!i && typeof (i as MenuItem).label === "string" && typeof (i as MenuItem).url === "string")
    .map((i) => ({ ...i, children: clean(i.children) }));
  return clean(data?.items);
});
