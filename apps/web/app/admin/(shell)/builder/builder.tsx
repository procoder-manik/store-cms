"use client";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Laptop, Monitor, Plus, RefreshCw, Smartphone, Tablet, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { Thumb } from "@/components/admin/builder/thumb";
import { SECTIONS, sectionDef, type SectionRow } from "@/lib/sections/registry";
import { cn } from "@/lib/utils";
import { saveSectionsAction } from "./actions";
import { FieldInput, type Ctx } from "./fields";

const uid = () => `s-${Math.random().toString(36).slice(2, 10)}`;
const DEVICES = [{ id: "desktop", icon: Monitor, w: "100%" }, { id: "laptop", icon: Laptop, w: "1280px" }, { id: "tablet", icon: Tablet, w: "820px" }, { id: "phone", icon: Smartphone, w: "390px" }] as const;

export function Builder({ target, initial, previewPath, categories, canEdit }: { target: string; initial: SectionRow[]; previewPath: string; categories: Ctx["categories"]; canEdit: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState<SectionRow[]>(initial.map((r) => ({ ...r, id: r.id || uid(), config: r.config ?? {} })));
  const [sel, setSel] = useState<number | null>(initial.length ? 0 : null);
  const [adding, setAdding] = useState(false);
  const [device, setDevice] = useState<(typeof DEVICES)[number]["id"]>("desktop");
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [frameKey, setFrameKey] = useState(0);
  const [pending, start] = useTransition();
  const saved = useRef(JSON.stringify(initial));
  const dirty = JSON.stringify(rows) !== saved.current;
  const ctx = useMemo(() => ({ categories }), [categories]);

  const current = sel !== null ? rows[sel] : null;
  const def = current ? sectionDef(current.type) : null;
  const variant = String(current?.config.variant ?? def?.defaults.variant ?? "");
  const update = (patch: Partial<SectionRow>) => setRows((rs) => rs.map((r, i) => (i === sel ? { ...r, ...patch } : r)));
  const setConfig = (k: string, v: unknown) => current && update({ config: { ...current.config, [k]: v } });
  const move = (i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= rows.length) return; setRows((rs) => { const n = [...rs]; [n[i], n[j]] = [n[j]!, n[i]!]; return n; }); setSel(j); };
  const addSection = (type: string, v: string) => {
    const d = sectionDef(type)!;
    const row: SectionRow = { id: uid(), type, title: ["hero", "features", "banner", "image_text"].includes(type) ? null : d.label, config: { ...d.defaults, variant: v }, is_active: true };
    const at = sel === null ? rows.length : sel + 1;
    setRows((rs) => [...rs.slice(0, at), row, ...rs.slice(at)]);
    setSel(at); setAdding(false); setTab("edit");
  };
  const save = () => start(async () => {
    const r = await saveSectionsAction(target, rows);
    if (!r.ok) return toast(r.error, "error");
    saved.current = JSON.stringify(rows);
    toast("Saved. The preview is refreshing."); setFrameKey((k) => k + 1); router.refresh();
  });

  const editor = (
    <div className="space-y-4">
      <div className="rounded-[20px] bg-surface p-3 shadow-card">
        <div className="flex items-center justify-between px-2 pb-2"><p className="text-[14px] font-semibold">Sections</p>{canEdit && <Button size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Add section</Button>}</div>
        <ul className="space-y-1">
          {rows.map((r, i) => {
            const d = sectionDef(r.type);
            return (
              <li key={r.id} className={cn("flex items-center gap-2 rounded-[12px] px-2 py-1.5", sel === i ? "bg-accent-soft" : "hover:bg-fill", !r.is_active && "opacity-50")}>
                <button className="min-w-0 flex-1 text-left" onClick={() => { setSel(i); setTab("edit"); }}>
                  <span className="block truncate text-[14px] font-medium">{r.title || d?.label || r.type}</span>
                  <span className="block truncate text-[12px] text-fg-muted">{d?.label} · {d?.variants.find((v) => v.id === r.config.variant)?.label ?? "Default"}</span>
                </button>
                {canEdit && <>
                  <button aria-label="Move up" onClick={() => move(i, -1)} className="p-1"><ArrowUp className="h-4 w-4" /></button>
                  <button aria-label="Move down" onClick={() => move(i, 1)} className="p-1"><ArrowDown className="h-4 w-4" /></button>
                  <button aria-label={r.is_active ? "Hide" : "Show"} onClick={() => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, is_active: !x.is_active } : x)))} className="p-1">{r.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                  <button aria-label="Duplicate" onClick={() => { setRows((rs) => [...rs.slice(0, i + 1), { ...r, id: uid(), config: structuredClone(r.config) }, ...rs.slice(i + 1)]); setSel(i + 1); }} className="p-1"><Copy className="h-4 w-4" /></button>
                  <button aria-label="Delete" onClick={() => { if (confirm("Delete this section?")) { setRows((rs) => rs.filter((_, j) => j !== i)); setSel(null); } }} className="p-1 text-danger"><Trash2 className="h-4 w-4" /></button>
                </>}
              </li>
            );
          })}
          {!rows.length && <li className="px-2 py-6 text-center text-[14px] text-fg-muted">No sections yet. Add your first one.</li>}
        </ul>
      </div>

      {current && def && (
        <div className="rounded-[20px] bg-surface p-4 shadow-card">
          <p className="text-[15px] font-semibold">{def.label}</p>
          <p className="text-[12px] text-fg-muted">{def.description}</p>
          {def.variants.length > 1 && (
            <div className="mt-4">
              <p className="mb-2 text-[13px] font-medium text-fg-muted">Design</p>
              <div className="grid grid-cols-2 gap-2">{def.variants.map((v) => (
                <button key={v.id} type="button" onClick={() => setConfig("variant", v.id)} className={cn("rounded-[12px] border-2 p-1.5 text-left", variant === v.id ? "border-accent" : "border-transparent hover:border-line")}>
                  <Thumb boxes={v.thumb} /><span className="mt-1 block px-0.5 text-[12px] font-medium">{v.label}</span>
                </button>))}</div>
            </div>
          )}
          <div className="mt-4 space-y-3">
            <label className="block"><span className="mb-1.5 block text-[13px] font-medium text-fg-muted">Section title</span><Input value={current.title ?? ""} onChange={(e) => update({ title: e.target.value || null })} className="h-10" placeholder="Leave empty for no title" /></label>
            {def.fields.filter((f) => !f.variants || f.variants.includes(variant)).map((f) => <FieldInput key={f.key} field={f} value={current.config[f.key]} ctx={ctx} onChange={(v) => setConfig(f.key, v)} />)}
          </div>
        </div>
      )}
    </div>
  );

  const preview = (
    <div className="rounded-[20px] bg-surface p-3 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex gap-1 rounded-full bg-fill p-1">{DEVICES.map((d) => (
          <button key={d.id} onClick={() => setDevice(d.id)} aria-label={d.id} className={cn("flex h-8 w-9 items-center justify-center rounded-full", device === d.id ? "bg-surface shadow-card" : "text-fg-muted")}><d.icon className="h-4 w-4" /></button>))}</div>
        <button onClick={() => setFrameKey((k) => k + 1)} aria-label="Reload preview" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-fill"><RefreshCw className="h-4 w-4" /></button>
        <span className="ml-auto text-[12px] text-fg-muted">{dirty ? "Save to see changes in the preview" : "Live preview"}</span>
      </div>
      <div className="flex justify-center overflow-hidden rounded-[14px] bg-fill">
        <iframe key={frameKey} src={previewPath} title="Preview" className="h-[75vh] max-w-full border-0 bg-background transition-all" style={{ width: DEVICES.find((d) => d.id === device)!.w }} />
      </div>
    </div>
  );

  return (
    <div className="mt-5 pb-24">
      <div className="mb-4 flex gap-1 rounded-full bg-fill p-1 xl:hidden">{(["edit", "preview"] as const).map((t) => (
        <button key={t} onClick={() => setTab(t)} className={cn("h-9 flex-1 rounded-full text-[14px] capitalize", tab === t ? "bg-surface font-medium shadow-card" : "text-fg-muted")}>{t}</button>))}</div>
      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className={cn(tab !== "edit" && "hidden xl:block")}>{editor}</div>
        <div className={cn(tab !== "preview" && "hidden xl:block")}>{preview}</div>
      </div>

      <Dialog open={adding} onClose={() => setAdding(false)} title="Add a section" className="md:max-w-5xl">
        <div className="space-y-6">
          {(["Hero", "Products", "Promotion", "Content", "Social proof"] as const).map((g) => (
            <div key={g}>
              <p className="mb-2 text-[13px] font-semibold text-fg-muted">{g}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {SECTIONS.filter((s) => s.group === g).flatMap((s) => s.variants.map((v) => (
                  <button key={`${s.type}-${v.id}`} type="button" onClick={() => addSection(s.type, v.id)} className="rounded-[14px] border border-line p-2 text-left transition hover:border-accent hover:shadow-card">
                    <Thumb boxes={v.thumb} />
                    <span className="mt-1.5 block text-[13px] font-medium">{s.label}</span>
                    <span className="block text-[12px] text-fg-muted">{v.label}</span>
                  </button>
                )))}
              </div>
            </div>
          ))}
        </div>
      </Dialog>

      {canEdit && dirty && (
        <div className="glass fixed inset-x-0 bottom-0 z-30 border-x-0 border-b-0 lg:left-64">
          <div className="mx-auto flex max-w-[1600px] items-center justify-end gap-3 px-5 py-3 md:px-8">
            <span className="mr-auto text-[13px] text-fg-muted">Unsaved changes</span>
            <Button variant="ghost" onClick={() => { setRows(JSON.parse(saved.current)); setSel(null); }}>Discard</Button>
            <Button onClick={save} disabled={pending}>{pending ? "Saving" : "Save and preview"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
