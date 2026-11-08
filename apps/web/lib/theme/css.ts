import { FONTS, NEUTRALS, PALETTES, RADII, type Appearance, type Mode } from "./presets";

const hex = (v: string | undefined, fallback: string) => (v && /^#[0-9a-f]{6}$/i.test(v) ? v : fallback);

/** Lighten or darken a hex color by a percentage, for hover states. */
function shade(color: string, pct: number) {
  const n = parseInt(color.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (pct > 0 ? (255 - c) : c) * pct)));
  return `#${[n >> 16, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, "0")).join("")}`;
}
/** Readable text color on top of a background color. */
function contrastOn(color: string) {
  const n = parseInt(color.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255];
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#0b0b0b" : "#ffffff";
}

function modeVars(m: Mode) {
  return `--background:${m.background};--surface:${m.surface};--surface-2:${m.surface2};--surface-glass:${m.glass};--text-primary:${m.text};--text-secondary:${m.text2};--text-tertiary:${m.text3};--border:${m.border};--fill:${m.fill};`;
}

/** CSS custom properties for the active appearance. Injected once in the root layout. */
export function themeCss(a: Appearance) {
  const n = NEUTRALS.find((x) => x.id === a.neutral) ?? NEUTRALS[0]!;
  const p = PALETTES.find((x) => x.id === a.palette) ?? PALETTES[0]!;
  const accent = hex(a.accent, p.accent);
  const accentDark = hex(a.accentDark, a.accent ? shade(hex(a.accent, p.accent), 0.25) : p.accentDark);
  const r = RADII[a.radius] ?? RADII.round;
  const body = FONTS.find((f) => f.id === a.fontBody)?.css ?? "var(--font-inter)";
  const display = FONTS.find((f) => f.id === a.fontDisplay)?.css ?? body;
  return `:root{${modeVars(n.light)}--accent:${accent};--accent-hover:${shade(accent, -0.1)};--accent-contrast:${p.contrast && !a.accent ? p.contrast : contrastOn(accent)};--accent-soft:color-mix(in srgb, ${accent} 12%, transparent);--radius-card:${r.card};--radius-sheet:${r.sheet};--radius-btn:${r.btn};--radius-input:${r.input};--font-body:${body};--font-display:${display};}`
    + `.dark{${modeVars(n.dark)}--accent:${accentDark};--accent-hover:${shade(accentDark, 0.12)};--accent-contrast:${p.contrastDark && !a.accent ? p.contrastDark : contrastOn(accentDark)};--accent-soft:color-mix(in srgb, ${accentDark} 16%, transparent);}`;
}
