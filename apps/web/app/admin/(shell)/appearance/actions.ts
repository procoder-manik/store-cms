"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertPermission } from "@/lib/auth/rbac";
import { saveSetting, getSettingValue } from "@/lib/settings/server";
import { logAudit } from "@/lib/audit";
import { BUTTONS, CARDS, FONTS, FOOTERS, HEADERS, NEUTRALS, PALETTES, RADII, THEMES, resolveAppearance, type Appearance } from "@/lib/theme/presets";
import { SECTIONS } from "@/lib/sections/registry";
import type { ActionResult } from "@/lib/actions/result";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().or(z.literal(""));
const schema = z.object({
  theme: z.string().refine((v) => THEMES.some((t) => t.id === v)),
  neutral: z.string().refine((v) => NEUTRALS.some((n) => n.id === v)),
  palette: z.string().refine((v) => PALETTES.some((p) => p.id === v)),
  accent: hex, accentDark: hex,
  fontBody: z.string().refine((v) => FONTS.some((f) => f.id === v)), fontDisplay: z.string().refine((v) => FONTS.some((f) => f.id === v)),
  radius: z.string().refine((v) => v in RADII), header: z.string().refine((v) => HEADERS.some((h) => h.id === v)),
  footer: z.string().refine((v) => FOOTERS.some((f) => f.id === v)), card: z.string().refine((v) => CARDS.some((c) => c.id === v)),
  button: z.string().refine((v) => BUTTONS.some((b) => b.id === v)),
  defaultMode: z.enum(["system", "light", "dark"]),
  colorSets: z.array(z.object({ name: z.string().trim().min(1).max(40), accent: z.string().regex(/^#[0-9a-fA-F]{6}$/), accentDark: z.string().regex(/^#[0-9a-fA-F]{6}$/) })).max(20).default([]),
});

function done() { revalidatePath("/", "layout"); revalidatePath("/admin", "layout"); }

export async function saveAppearanceAction(input: Appearance): Promise<ActionResult> {
  try {
    const staff = await assertPermission("settings.update");
    const d = schema.parse(input);
    await saveSetting("theme", d, undefined, staff.userId);
    await logAudit({ actorId: staff.userId, action: "appearance.save", entity: "settings", entityId: "theme", after: d });
    done();
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof z.ZodError ? "Some options are not valid." : e instanceof Error ? e.message : "Failed" }; }
}

/** Applies a whole theme (colors, fonts, header, footer, cards) and optionally its demo home page. */
export async function applyThemeAction(themeId: string, loadDemo: boolean): Promise<ActionResult> {
  try {
    const staff = await assertPermission("settings.update");
    const t = THEMES.find((x) => x.id === themeId);
    if (!t) return { ok: false, error: "Unknown theme" };
    const a = resolveAppearance({ theme: t.id });
    await saveSetting("theme", a as unknown as Record<string, unknown>, undefined, staff.userId);
    if (loadDemo) {
      await assertPermission("content.update");
      const admin = createAdminClient();
      await admin.from("home_sections").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await admin.from("home_sections").insert(t.demo.map((d, i) => ({ type: d.type, title: d.title ?? null, config: d.config, sort_order: i + 1, is_active: true })));
    }
    await logAudit({ actorId: staff.userId, action: "appearance.apply_theme", entity: "settings", entityId: t.id, after: { loadDemo } });
    done();
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Failed" }; }
}

export interface DesignFile { format: "lumen-design"; version: 1; appearance: Appearance; home: { type: string; title: string | null; config: Record<string, unknown>; is_active: boolean }[] }

export async function exportDesignAction(): Promise<ActionResult<DesignFile>> {
  try {
    await assertPermission("settings.view");
    const appearance = resolveAppearance(await getSettingValue<Partial<Appearance>>("theme"));
    const { data } = await createAdminClient().from("home_sections").select("type,title,config,is_active").order("sort_order");
    return { ok: true, data: { format: "lumen-design", version: 1, appearance, home: (data ?? []) as DesignFile["home"] } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Failed" }; }
}

/** Imports a design file: theme settings plus the home page layout. */
export async function importDesignAction(json: string): Promise<ActionResult> {
  try {
    const staff = await assertPermission("settings.update");
    await assertPermission("content.update");
    const parsed = JSON.parse(json) as DesignFile;
    if (parsed?.format !== "lumen-design") return { ok: false, error: "This is not a design file exported from this store." };
    const a = schema.parse(resolveAppearance(parsed.appearance));
    const types = new Set(SECTIONS.map((s) => s.type));
    const home = (Array.isArray(parsed.home) ? parsed.home : []).filter((h) => types.has(h.type) || h.type === "perks").slice(0, 40);
    await saveSetting("theme", a, undefined, staff.userId);
    if (home.length) {
      const admin = createAdminClient();
      await admin.from("home_sections").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await admin.from("home_sections").insert(home.map((h, i) => ({ type: h.type, title: h.title ?? null, config: h.config ?? {}, sort_order: i + 1, is_active: h.is_active !== false })));
    }
    await logAudit({ actorId: staff.userId, action: "appearance.import", entity: "settings", entityId: "theme" });
    done();
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof SyntaxError ? "The file is not valid JSON." : e instanceof Error ? e.message : "Failed" }; }
}
