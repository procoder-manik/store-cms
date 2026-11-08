"use client";
import { useEffect, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, CornerDownRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { MenuItem } from "@/lib/data/menus";
import { menuLinkOptionsAction, saveMenuAction } from "./actions";

function Row({ item, onChange, onDelete, onMove, options, nested }: { item: MenuItem; onChange: (i: MenuItem) => void; onDelete: () => void; onMove: (d: -1 | 1) => void; options: { label: string; url: string }[]; nested?: boolean }) {
  return (
    <div className={nested ? "ml-6 border-l-2 border-line pl-3" : ""}>
      <div className="grid gap-2 rounded-[12px] bg-fill/50 p-2.5 md:grid-cols-[1fr_1fr_1.2fr_auto]">
        <Input value={item.label} onChange={(e) => onChange({ ...item, label: e.target.value })} placeholder="Label" aria-label="Label" className="h-10" />
        <Input value={item.label_bn ?? ""} onChange={(e) => onChange({ ...item, label_bn: e.target.value })} placeholder="Label (Bangla)" aria-label="Bangla label" className="h-10" />
        <div className="flex gap-1.5">
          <Input value={item.url} onChange={(e) => onChange({ ...item, url: e.target.value })} placeholder="/shop or https://" aria-label="Link" className="h-10" list="menu-links" />
          <Select value="" aria-label="Pick a page" onChange={(e) => { const o = options[Number(e.target.value)]; if (o) onChange({ ...item, url: o.url, label: item.label || o.label.replace(/^(Page|Category|Landing): /, "") }); }} className="h-10 w-28 shrink-0">
            <option value="">Pick</option>{options.map((o, i) => <option key={o.url} value={i}>{o.label}</option>)}
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Up" onClick={() => onMove(-1)} className="p-1"><ArrowUp className="h-4 w-4" /></button>
          <button type="button" aria-label="Down" onClick={() => onMove(1)} className="p-1"><ArrowDown className="h-4 w-4" /></button>
          <button type="button" aria-label="Delete" onClick={onDelete} className="p-1 text-danger"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}

export function MenuEditor({ menuKey, title, hint, initial, canEdit }: { menuKey: string; title: string; hint: string; initial: MenuItem[]; canEdit: boolean }) {
  const toast = useToast();
  const [items, setItems] = useState<MenuItem[]>(initial);
  const [options, setOptions] = useState<{ label: string; url: string }[]>([]);
  const [pending, start] = useTransition();
  useEffect(() => { menuLinkOptionsAction().then(setOptions).catch(() => {}); }, []);
  const move = (arr: MenuItem[], i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= arr.length) return arr; const n = [...arr]; [n[i], n[j]] = [n[j]!, n[i]!]; return n; };
  const isHeader = menuKey === "header";
  return (
    <Card title={title} description={hint}>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="space-y-2">
            <Row item={it} options={options} onChange={(v) => setItems(items.map((x, j) => (j === i ? v : x)))} onDelete={() => setItems(items.filter((_, j) => j !== i))} onMove={(d) => setItems(move(items, i, d))} />
            {isHeader && (it.children ?? []).map((c, k) => (
              <Row key={k} nested item={c} options={options} onChange={(v) => setItems(items.map((x, j) => (j === i ? { ...x, children: (x.children ?? []).map((y, m) => (m === k ? v : y)) } : x)))}
                onDelete={() => setItems(items.map((x, j) => (j === i ? { ...x, children: (x.children ?? []).filter((_, m) => m !== k) } : x)))} onMove={(d) => setItems(items.map((x, j) => (j === i ? { ...x, children: move(x.children ?? [], k, d) } : x)))} />
            ))}
            {isHeader && canEdit && (it.children ?? []).length < 20 && <button type="button" className="ml-6 flex items-center gap-1 text-[12px] text-accent" onClick={() => setItems(items.map((x, j) => (j === i ? { ...x, children: [...(x.children ?? []), { label: "", url: "" }] } : x)))}><CornerDownRight className="h-3.5 w-3.5" />Add dropdown item</button>}
          </div>
        ))}
        {!items.length && <p className="text-[14px] text-fg-muted">Empty. The default links are used.</p>}
      </div>
      {canEdit && (
        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setItems([...items, { label: "", url: "" }])}><Plus className="h-4 w-4" />Add link</Button>
          <Button size="sm" disabled={pending} onClick={() => start(async () => { const clean = items.filter((i) => i.label.trim()).map((i) => ({ ...i, children: (i.children ?? []).filter((c) => c.label.trim()) })); const r = await saveMenuAction(menuKey, clean); toast(r.ok ? "Menu saved" : r.error, r.ok ? "success" : "error"); })}>Save menu</Button>
        </div>
      )}
    </Card>
  );
}
