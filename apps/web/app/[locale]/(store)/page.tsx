import { setRequestLocale } from "next-intl/server";
import { getHomeSections } from "@/lib/data/catalog";
import { getAppearance } from "@/lib/theme/server";
import { THEMES } from "@/lib/theme/presets";
import { Sections } from "@/components/sections/render";
import type { SectionRow } from "@/lib/sections/registry";
import { EntityCode } from "@/lib/code/inject";

export const revalidate = 60;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const stored = (await getHomeSections()) as unknown as SectionRow[];
  // No sections saved yet: show the active theme's demo layout
  const appearance = await getAppearance();
  const rows: SectionRow[] = stored.length ? stored
    : (THEMES.find((t) => t.id === appearance.theme) ?? THEMES[0]!).demo.map((d, i) => ({ id: `demo-${i}`, type: d.type, title: d.title ?? null, config: d.config, is_active: true }));
  return (
    <>
      <EntityCode entity="home" id="home" slot="head" />
      <EntityCode entity="home" id="home" slot="body_start" />
      <Sections rows={rows} />
      <EntityCode entity="home" id="home" slot="footer" />
    </>
  );
}
