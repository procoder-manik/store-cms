"use client";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

export interface FormField { key: string; label: string; label_bn?: string; type: string; required?: boolean; options?: string; locked?: boolean }
const TYPES = [["text", "Short text"], ["email", "Email"], ["tel", "Phone"], ["textarea", "Long text"], ["select", "Dropdown"], ["checkbox", "Checkbox"]];
const keyOf = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 30) || `field_${Date.now().toString(36)}`;

/** Edit a list of form fields: label (EN/BN), type, required, dropdown options, order. */
export function FieldListEditor({ value, onChange, types = TYPES.map((t) => t[0]!), max = 15 }: { value: FormField[]; onChange: (v: FormField[]) => void; types?: string[]; max?: number }) {
  const up = (i: number, patch: Partial<FormField>) => onChange(value.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const move = (i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= value.length) return; const n = [...value]; [n[i], n[j]] = [n[j]!, n[i]!]; onChange(n); };
  return (
    <div className="space-y-2">
      {value.map((f, i) => (
        <div key={i} className="grid gap-2 rounded-[14px] border border-line p-3 md:grid-cols-[1fr_1fr_150px_auto]">
          <Input value={f.label} placeholder="Label (English)" aria-label="Label" className="h-10" onChange={(e) => up(i, { label: e.target.value, ...(f.locked ? {} : { key: keyOf(e.target.value) }) })} />
          <Input value={f.label_bn ?? ""} placeholder="Label (Bangla, optional)" aria-label="Bangla label" className="h-10" onChange={(e) => up(i, { label_bn: e.target.value })} />
          <Select value={f.type} aria-label="Type" className="h-10" disabled={f.locked} onChange={(e) => up(i, { type: e.target.value })}>
            {TYPES.filter(([t]) => types.includes(t!)).map(([t, l]) => <option key={t} value={t}>{l}</option>)}
          </Select>
          <div className="flex items-center gap-1">
            <label className="mr-1 flex items-center gap-1.5 text-[13px]"><input type="checkbox" checked={!!f.required} onChange={(e) => up(i, { required: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" />Required</label>
            <button type="button" aria-label="Up" onClick={() => move(i, -1)} className="p-1"><ArrowUp className="h-4 w-4" /></button>
            <button type="button" aria-label="Down" onClick={() => move(i, 1)} className="p-1"><ArrowDown className="h-4 w-4" /></button>
            {!f.locked && <button type="button" aria-label="Delete" onClick={() => onChange(value.filter((_, j) => j !== i))} className="p-1 text-danger"><Trash2 className="h-4 w-4" /></button>}
          </div>
          {f.type === "select" && <Input value={f.options ?? ""} placeholder="Options, separated by commas: Small, Medium, Large" className="h-10 md:col-span-4" onChange={(e) => up(i, { options: e.target.value })} />}
        </div>
      ))}
      {value.length < max && <Button type="button" size="sm" variant="secondary" onClick={() => onChange([...value, { key: `field_${value.length + 1}`, label: "", type: types[0] ?? "text" }])}><Plus className="h-4 w-4" />Add field</Button>}
    </div>
  );
}
