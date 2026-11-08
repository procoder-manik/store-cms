"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Download, ExternalLink, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { Thumb, CARD_THUMBS, FOOTER_THUMBS, HEADER_THUMBS } from "@/components/admin/builder/thumb";
import { BUTTONS, CARDS, FONTS, FOOTERS, HEADERS, NEUTRALS, PALETTES, RADII, THEMES, resolveAppearance, type Appearance, type RadiusId } from "@/lib/theme/presets";
import { cn } from "@/lib/utils";
import { applyThemeAction, exportDesignAction, importDesignAction, saveAppearanceAction } from "./actions";

/** Mini mock of a storefront in a theme's colors. Rendered with inline styles so each card shows its own theme. */
function ThemePreview({ a }: { a: Appearance }) {
  const n = NEUTRALS.find((x) => x.id === a.neutral)!.light;
  const p = PALETTES.find((x) => x.id === a.palette)!;
  const accent = a.accent || p.accent;
  const r = RADII[a.radius];
  const font = FONTS.find((f) => f.id === a.fontDisplay)!.css;
  return (
    <div className="overflow-hidden rounded-[12px] border border-line" style={{ background: n.background, color: n.text }}>
      <div className="flex items-center justify-between px-3 py-2" style={{ background: a.header === "bold" ? accent : n.surface, color: a.header === "bold" ? "#fff" : n.text }}>
        <span style={{ fontFamily: font, fontWeight: 600, fontSize: 12 }}>Store</span>
        <span className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-5 rounded-full" style={{ background: a.header === "bold" ? "#ffffff88" : n.text3 }} />)}</span>
      </div>
      <div className="p-3">
        <p style={{ fontFamily: font, fontWeight: 600, fontSize: 18, lineHeight: 1.1 }}>New season</p>
        <span className="mt-2 inline-block px-3 py-1 text-[10px] font-medium" style={{ background: accent, color: "#fff", borderRadius: r.btn }}>Shop now</span>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {[0, 1, 2].map((i) => <div key={i} className="aspect-square" style={{ background: i === 1 ? `${accent}33` : n.surface, borderRadius: r.card, border: `1px solid ${n.border}` }} />)}
        </div>
      </div>
    </div>
  );
}

/** Inline preview of each button style (independent of the store's current style). */
function previewStyle(id: string): React.CSSProperties {
  const base: React.CSSProperties = { background: "var(--accent)", color: "var(--accent-contrast)" };
  switch (id) {
    case "gradient": return { ...base, backgroundImage: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 55%, #ff4fd8))" };
    case "outline": return { background: "transparent", color: "var(--accent)", boxShadow: "inset 0 0 0 2px var(--accent)" };
    case "soft": return { background: "var(--accent-soft)", color: "var(--accent)" };
    case "raised": return { ...base, boxShadow: "0 4px 0 color-mix(in srgb, var(--accent) 65%, #000), 0 12px 24px -10px var(--accent)", transform: "translateY(-2px)" };
    case "glow": return { ...base, boxShadow: "0 10px 30px -6px color-mix(in srgb, var(--accent) 70%, transparent)" };
    case "glass": return { background: "color-mix(in srgb, var(--accent) 75%, transparent)", color: "var(--accent-contrast)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)", backdropFilter: "blur(12px)" };
    default: return base;
  }
}

function Option({ on, onClick, children, label }: { on: boolean; onClick: () => void; children: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={cn("rounded-[14px] border-2 p-2 text-left transition", on ? "border-accent" : "border-transparent hover:border-line")}>
      {children}
      <span className="mt-1.5 flex items-center justify-between px-0.5 text-[13px] font-medium">{label}{on && <Check className="h-4 w-4 text-accent" />}</span>
    </button>
  );
}

export function AppearanceEditor({ current, canEdit }: { current: Appearance; canEdit: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [a, setA] = useState<Appearance>(current);
  const [demo, setDemo] = useState(true);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Appearance>(k: K, v: Appearance[K]) => setA((s) => ({ ...s, [k]: v }));
  const dirty = JSON.stringify(a) !== JSON.stringify(current);

  const save = () => start(async () => {
    const r = await saveAppearanceAction(a);
    if (!r.ok) return toast(r.error, "error");
    toast("Appearance saved"); router.refresh();
  });
  const apply = (id: string) => start(async () => {
    if (demo && !confirm("Load this theme's demo home page? Your current home page sections will be replaced.")) return;
    const r = await applyThemeAction(id, demo);
    if (!r.ok) return toast(r.error, "error");
    setA(resolveAppearance({ theme: id }));
    toast(demo ? "Theme and demo home page applied" : "Theme applied"); router.refresh();
  });
  const exportFile = () => start(async () => {
    const r = await exportDesignAction();
    if (!r.ok) return toast(r.error, "error");
    const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: url, download: `design-${a.theme}-${new Date().toISOString().slice(0, 10)}.json` }).click();
    URL.revokeObjectURL(url);
  });
  const importFile = (file: File) => start(async () => {
    if (!confirm("Import this design? Theme settings and the home page layout will be replaced.")) return;
    const r = await importDesignAction(await file.text());
    if (!r.ok) return toast(r.error, "error");
    toast("Design imported"); router.refresh(); location.reload();
  });

  return (
    <div className="mt-6 space-y-5 pb-24">
      <Card title="Themes" description="A theme sets colors, fonts, header, footer, product cards and a ready-made home page. Every hero and section design works with every theme."
        actions={<a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[14px] text-accent">View store <ExternalLink className="h-3.5 w-3.5" /></a>}>
        <div className="mb-4"><Switch checked={demo} onChange={setDemo} label="Also load the theme's demo home page" /></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {THEMES.map((t) => {
            const preview = resolveAppearance({ theme: t.id });
            const active = current.theme === t.id;
            return (
              <div key={t.id} className={cn("rounded-[18px] border-2 bg-surface p-3", active ? "border-accent" : "border-line")}>
                <ThemePreview a={preview} />
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div><p className="font-semibold">{t.name}</p><p className="text-[12px] text-fg-muted">{t.tag}</p></div>
                  {active && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">Active</span>}
                </div>
                <p className="mt-1 text-[13px] text-fg-muted">{t.description}</p>
                {canEdit && <Button size="sm" variant={active ? "secondary" : "primary"} className="mt-3 w-full" disabled={pending} onClick={() => apply(t.id)}>{active ? "Re-apply" : "Apply theme"}</Button>}
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Brand colors" description="Pick a color template or set your own brand color.">
        <div className="flex flex-wrap gap-2">
          {PALETTES.map((p) => {
            const on = a.palette === p.id && !a.accent;
            return (
              <button key={p.id} type="button" onClick={() => setA((s) => ({ ...s, palette: p.id, accent: "", accentDark: "" }))} aria-pressed={on}
                className={cn("flex items-center gap-2 rounded-full border-2 py-1.5 pl-1.5 pr-3 text-[13px]", on ? "border-accent" : "border-line")}>
                <span className="flex"><span className="h-6 w-6 rounded-full" style={{ background: p.accent }} /><span className="-ml-2 h-6 w-6 rounded-full ring-2 ring-[var(--surface)]" style={{ background: p.accentDark }} /></span>{p.label}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-[14px]">
          <label className="flex items-center gap-2">Custom brand color <input type="color" value={a.accent || PALETTES.find((p) => p.id === a.palette)!.accent} onChange={(e) => set("accent", e.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-transparent" /></label>
          <label className="flex items-center gap-2">Dark mode color <input type="color" value={a.accentDark || PALETTES.find((p) => p.id === a.palette)!.accentDark} onChange={(e) => set("accentDark", e.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-transparent" /></label>
          {a.accent && <button type="button" className="text-accent" onClick={() => setA((s) => ({ ...s, accent: "", accentDark: "" }))}>Use template color</button>}
          {a.accent && <button type="button" className="text-accent" onClick={() => { const name = prompt("Name this color set"); if (name) setA((s) => ({ ...s, colorSets: [...(s.colorSets ?? []), { name, accent: s.accent!, accentDark: s.accentDark || s.accent! }].slice(-20) })); }}>Save as color set</button>}
        </div>
        {(a.colorSets ?? []).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">{a.colorSets!.map((cs, i) => (
            <span key={i} className={cn("flex items-center gap-2 rounded-full border-2 py-1 pl-1 pr-2 text-[13px]", a.accent === cs.accent ? "border-accent" : "border-line")}>
              <button type="button" className="flex items-center gap-2" onClick={() => setA((s) => ({ ...s, accent: cs.accent, accentDark: cs.accentDark }))}>
                <span className="h-6 w-6 rounded-full" style={{ background: cs.accent }} />{cs.name}
              </button>
              <button type="button" aria-label="Delete color set" className="text-fg-subtle" onClick={() => setA((s) => ({ ...s, colorSets: (s.colorSets ?? []).filter((_, j) => j !== i) }))}>×</button>
            </span>))}</div>
        )}
        <p className="mt-5 text-[13px] font-medium text-fg-muted">Background tone</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {NEUTRALS.map((n) => (
            <button key={n.id} type="button" onClick={() => set("neutral", n.id)} aria-pressed={a.neutral === n.id}
              className={cn("flex items-center gap-2 rounded-[12px] border-2 px-2 py-1.5 text-[13px]", a.neutral === n.id ? "border-accent" : "border-line")}>
              <span className="flex overflow-hidden rounded-md border border-line"><span className="h-6 w-5" style={{ background: n.light.background }} /><span className="h-6 w-5" style={{ background: n.light.surface }} /><span className="h-6 w-5" style={{ background: n.dark.background }} /></span>{n.label}
            </button>
          ))}
        </div>
      </Card>

      <Card title="Typography and shape">
        <div className="grid gap-5 md:grid-cols-3">
          {(["fontDisplay", "fontBody"] as const).map((k) => (
            <div key={k}>
              <p className="mb-2 text-[13px] font-medium text-fg-muted">{k === "fontDisplay" ? "Headings" : "Body text"}</p>
              <div className="space-y-1.5">{FONTS.map((f) => (
                <button key={f.id} type="button" onClick={() => set(k, f.id)} className={cn("flex w-full items-center justify-between rounded-[10px] border px-3 py-2 text-left", a[k] === f.id ? "border-accent bg-accent-soft" : "border-line")}>
                  <span style={{ fontFamily: f.css }} className={k === "fontDisplay" ? "text-[17px] font-semibold" : "text-[14px]"}>{f.label}</span>{a[k] === f.id && <Check className="h-4 w-4 text-accent" />}
                </button>))}</div>
            </div>
          ))}
          <div>
            <p className="mb-2 text-[13px] font-medium text-fg-muted">Corners</p>
            <div className="space-y-1.5">{(Object.keys(RADII) as RadiusId[]).map((r) => (
              <button key={r} type="button" onClick={() => set("radius", r)} className={cn("flex w-full items-center gap-3 rounded-[10px] border px-3 py-2", a.radius === r ? "border-accent bg-accent-soft" : "border-line")}>
                <span className="h-7 w-10 border-2 border-fg-muted" style={{ borderRadius: RADII[r].card }} />{RADII[r].label}
              </button>))}</div>
            <p className="mb-2 mt-5 text-[13px] font-medium text-fg-muted">Default light or dark</p>
            <div className="flex gap-1 rounded-full bg-fill p-1">{(["system", "light", "dark"] as const).map((m) => (
              <button key={m} type="button" onClick={() => set("defaultMode", m)} className={cn("h-8 flex-1 rounded-full text-[13px] capitalize", a.defaultMode === m ? "bg-surface font-medium shadow-card" : "text-fg-muted")}>{m}</button>))}</div>
          </div>
        </div>
      </Card>

      <Card title="Buttons" description="Style of the main buttons across the store. Corners follow the corner setting above.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">{BUTTONS.map((b) => (
          <Option key={b.id} on={a.button === b.id} onClick={() => set("button", b.id)} label={b.label}>
            <span className="flex h-16 items-center justify-center rounded-[10px] bg-fill"><span className="inline-flex h-9 items-center rounded-[var(--radius-btn)] px-4 text-[13px] font-medium" style={previewStyle(b.id)}>Buy now</span></span>
          </Option>
        ))}</div>
      </Card>

      <Card title="Header">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{HEADERS.map((h) => <Option key={h.id} on={a.header === h.id} onClick={() => set("header", h.id)} label={h.label}><Thumb boxes={HEADER_THUMBS[h.id]!} /><span className="mt-1 block px-0.5 text-[12px] text-fg-muted">{h.hint}</span></Option>)}</div>
      </Card>
      <Card title="Footer">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{FOOTERS.map((f) => <Option key={f.id} on={a.footer === f.id} onClick={() => set("footer", f.id)} label={f.label}><Thumb boxes={FOOTER_THUMBS[f.id]!} /><span className="mt-1 block px-0.5 text-[12px] text-fg-muted">{f.hint}</span></Option>)}</div>
      </Card>
      <Card title="Product cards" description="Default style everywhere. Any product section can override it in the Page builder.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{CARDS.map((c) => <Option key={c.id} on={a.card === c.id} onClick={() => set("card", c.id)} label={c.label}><Thumb boxes={CARD_THUMBS[c.id]!} /><span className="mt-1 block px-0.5 text-[12px] text-fg-muted">{c.hint}</span></Option>)}</div>
      </Card>

      <Card title="Design file" description="Save your whole design (theme settings and home page) as one file, or load a design file into this store. Use it to copy a design between stores.">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={pending} onClick={exportFile}><Download className="h-4 w-4" />Export design</Button>
          {canEdit && <Button variant="secondary" disabled={pending} onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" />Import design</Button>}
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ""; }} />
        </div>
      </Card>

      {canEdit && dirty && (
        <div className="glass fixed inset-x-0 bottom-0 z-30 border-x-0 border-b-0 lg:left-64">
          <div className="mx-auto flex max-w-6xl items-center justify-end gap-3 px-5 py-3 md:px-8">
            <span className="mr-auto text-[13px] text-fg-muted">Unsaved changes</span>
            <Button variant="ghost" onClick={() => setA(current)}>Discard</Button>
            <Button onClick={save} disabled={pending}>Save appearance</Button>
          </div>
        </div>
      )}
    </div>
  );
}
