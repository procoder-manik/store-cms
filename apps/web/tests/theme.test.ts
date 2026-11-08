import { describe, expect, it } from "vitest";
import { THEMES, PALETTES, NEUTRALS, resolveAppearance } from "@/lib/theme/presets";
import { themeCss } from "@/lib/theme/css";
import { SECTIONS, sectionDef } from "@/lib/sections/registry";

describe("themes", () => {
  it("every theme resolves to valid tokens", () => {
    for (const t of THEMES) {
      const css = themeCss(resolveAppearance({ theme: t.id }));
      expect(css).toContain("--accent:#");
      expect(css).toContain(".dark{");
      expect(css).not.toContain("undefined");
    }
  });
  it("every demo section and design exists in the section library", () => {
    for (const t of THEMES) for (const d of t.demo) {
      const def = sectionDef(d.type);
      expect(def, `${t.id}: ${d.type}`).toBeTruthy();
      const v = String(d.config.variant ?? def!.defaults.variant);
      expect(def!.variants.some((x) => x.id === v), `${t.id}: ${d.type}/${v}`).toBe(true);
    }
  });
  it("custom brand color overrides the palette and stays readable", () => {
    const css = themeCss(resolveAppearance({ theme: "lumen", accent: "#ffcc00" }));
    expect(css).toContain("--accent:#ffcc00");
    expect(css).toContain("--accent-contrast:#0b0b0b");
  });
  it("unknown values fall back safely", () => {
    const a = resolveAppearance({ theme: "nope", neutral: "x", palette: "y" } as never);
    expect(a.theme).toBe("lumen");
    expect(NEUTRALS.some((n) => n.id === a.neutral)).toBe(true);
    expect(PALETTES.some((p) => p.id === a.palette)).toBe(true);
  });
  it("section library has unique types and thumbnails", () => {
    expect(new Set(SECTIONS.map((s) => s.type)).size).toBe(SECTIONS.length);
    const variants = SECTIONS.reduce((n, s) => n + s.variants.length, 0);
    expect(variants).toBeGreaterThanOrEqual(35);
    for (const s of SECTIONS) for (const v of s.variants) expect(v.thumb.length).toBeGreaterThan(0);
  });
});
