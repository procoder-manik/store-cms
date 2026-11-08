"use client";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field as FieldWrap, Input, Select, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { MediaPicker } from "@/components/admin/media-library";
import type { Field } from "@/lib/sections/registry";
import { cn, formatBDT } from "@/lib/utils";
import { builderProductSearchAction, builderProductsByIdsAction } from "./actions";

type V = Record<string, unknown>;
export interface Ctx { categories: { id: string; name: string }[] }

function ImageInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {value ? <img src={value} alt="" className="h-12 w-16 rounded-[8px] object-cover" /> : <span className="h-12 w-16 rounded-[8px] bg-fill" />}
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}><ImagePlus className="h-4 w-4" />Choose</Button>
      {value && <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")}>Remove</Button>}
      <MediaPicker open={open} onClose={() => setOpen(false)} multiple={false} folder="builder" onSelect={(m) => m[0] && onChange(m[0].url)} />
    </div>
  );
}

function ProductsInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ id: string; title: string; price: number; image: string | null }[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => { builderProductsByIdsAction(value).then((r) => setNames(Object.fromEntries(r.map((x) => [x.id, x.title])))); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { const id = setTimeout(async () => setFound(await builderProductSearchAction(q)), 250); return () => clearTimeout(id); }, [q]);
  return (
    <div className="space-y-2">
      <ul className="space-y-1">{value.map((id, i) => (
        <li key={id} className="flex items-center gap-2 rounded-[10px] bg-fill px-2.5 py-1.5 text-[13px]">
          <span className="flex-1 truncate">{names[id] ?? id.slice(0, 8)}</span>
          <button type="button" aria-label="Up" disabled={i === 0} onClick={() => { const n = [...value]; [n[i - 1], n[i]] = [n[i]!, n[i - 1]!]; onChange(n); }}><ArrowUp className="h-3.5 w-3.5" /></button>
          <button type="button" aria-label="Remove" onClick={() => onChange(value.filter((x) => x !== id))}><X className="h-3.5 w-3.5" /></button>
        </li>))}</ul>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products to add" className="h-9" />
      {found.length > 0 && (
        <ul className="max-h-48 overflow-y-auto rounded-[12px] border border-line">{found.filter((f) => !value.includes(f.id)).map((f) => (
          <li key={f.id}><button type="button" onClick={() => { onChange([...value, f.id]); setNames((n) => ({ ...n, [f.id]: f.title })); }} className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[13px] hover:bg-fill">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {f.image ? <img src={f.image} alt="" className="h-7 w-7 rounded object-cover" /> : <span className="h-7 w-7 rounded bg-fill" />}
            <span className="flex-1 truncate">{f.title}</span><span className="text-fg-muted">{formatBDT(f.price)}</span><Plus className="h-3.5 w-3.5" />
          </button></li>))}</ul>
      )}
    </div>
  );
}

function ItemsInput({ field, value, onChange, ctx }: { field: Field; value: V[]; onChange: (v: V[]) => void; ctx: Ctx }) {
  const [open, setOpen] = useState<number | null>(value.length ? 0 : null);
  const max = field.max ?? 12;
  const move = (i: number, d: -1 | 1) => { const n = [...value]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j]!, n[i]!]; onChange(n); setOpen(j); };
  return (
    <div className="space-y-2">
      {value.map((item, i) => (
        <div key={i} className="rounded-[12px] border border-line">
          <div className="flex items-center gap-2 px-3 py-2">
            <button type="button" className="flex-1 truncate text-left text-[13px] font-medium" onClick={() => setOpen(open === i ? null : i)}>{i + 1}. {String(item.title || item.name || item.image || "Item").slice(0, 40)}</button>
            <button type="button" aria-label="Up" onClick={() => move(i, -1)}><ArrowUp className="h-3.5 w-3.5" /></button>
            <button type="button" aria-label="Down" onClick={() => move(i, 1)}><ArrowDown className="h-3.5 w-3.5" /></button>
            <button type="button" aria-label="Delete" onClick={() => onChange(value.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5 text-danger" /></button>
          </div>
          {open === i && <div className="space-y-3 border-t border-line p-3">{field.fields!.map((f) => <FieldInput key={f.key} field={f} value={item[f.key]} ctx={ctx} onChange={(v) => onChange(value.map((x, j) => (j === i ? { ...x, [f.key]: v } : x)))} />)}</div>}
        </div>
      ))}
      {value.length < max && <Button type="button" size="sm" variant="secondary" onClick={() => { onChange([...value, {}]); setOpen(value.length); }}><Plus className="h-4 w-4" />Add</Button>}
    </div>
  );
}

export function FieldInput({ field: f, value, onChange, ctx }: { field: Field; value: unknown; onChange: (v: unknown) => void; ctx: Ctx }) {
  const str = typeof value === "string" ? value : value == null ? "" : String(value);
  let input: React.ReactNode;
  switch (f.type) {
    case "textarea": input = <Textarea value={str} onChange={(e) => onChange(e.target.value)} className="min-h-20" />; break;
    case "code": input = <Textarea value={str} spellCheck={false} onChange={(e) => onChange(e.target.value)} className="min-h-[320px] font-mono text-[12px] leading-relaxed" />; break;
    case "number": input = <Input type="number" value={str} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} className="h-10" />; break;
    case "datetime": input = <Input type="datetime-local" value={str ? str.slice(0, 16) : ""} onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : "")} className="h-10" />; break;
    case "select": input = <Select value={str} onChange={(e) => onChange(e.target.value)} className="h-10">{!f.options?.some((o) => o.value === "") && <option value="">Default</option>}{f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>; break;
    case "switch": return <Switch checked={value !== false && value !== undefined ? Boolean(value) : false} onChange={onChange} label={f.label} />;
    case "image": input = <ImageInput value={str} onChange={onChange} />; break;
    case "category": input = <Select value={str} onChange={(e) => onChange(e.target.value)} className="h-10"><option value="">Choose</option>{ctx.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>; break;
    case "categories": {
      const v = (Array.isArray(value) ? value : []) as string[];
      input = <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">{ctx.categories.map((c) => { const on = v.includes(c.id); return (
        <button key={c.id} type="button" onClick={() => onChange(on ? v.filter((x) => x !== c.id) : [...v, c.id])} className={cn("rounded-full px-3 py-1 text-[12px]", on ? "bg-accent text-accent-contrast" : "bg-fill")}>{c.name}</button>); })}</div>;
      break;
    }
    case "products": input = <ProductsInput value={(Array.isArray(value) ? value : []) as string[]} onChange={onChange} />; break;
    case "items": input = <ItemsInput field={f} value={(Array.isArray(value) ? value : []) as V[]} onChange={onChange} ctx={ctx} />; break;
    default: input = <Input value={str} onChange={(e) => onChange(e.target.value)} className="h-10" />;
  }
  return <FieldWrap label={f.label} hint={f.hint}>{input}</FieldWrap>;
}
