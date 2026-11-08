"use client";
import { SeoPanel } from "@/components/admin/seo/seo-panel";
import { CodePanel, type CodeValue } from "@/components/admin/code/code-panel";
import type { SeoData } from "@/lib/seo/model";
import { useState, useTransition } from "react";
import { ImagePlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { MediaPicker } from "@/components/admin/media-library";
import { slugify } from "@/lib/utils";
import { deleteCategoryAction, saveCategoryAction, type CategoryInput } from "./actions";

export interface CategoryRow {
  id: string; parent_id: string | null; name: string; name_bn: string | null; slug: string; description: string | null;
  image_url: string | null; icon: string | null; sort_order: number; is_active: boolean;
  seo: SeoData;
  product_count: number;
}

const empty = (): CategoryInput => ({ name: "", name_bn: "", slug: "", parent_id: null, description: "", image_url: "", icon: "", sort_order: 0, is_active: true, seo: {} });

export function CategoryManager({ rows, canCreate, canUpdate, canDelete, canCode, codes }: { rows: CategoryRow[]; canCreate: boolean; canUpdate: boolean; canDelete: boolean; canCode?: boolean; codes?: Record<string, CodeValue> }) {
  const toast = useToast();
  const [form, setForm] = useState<CategoryInput | null>(null);
  const [picker, setPicker] = useState(false);
  const [pending, start] = useTransition();
  const roots = rows.filter((r) => !r.parent_id);
  const childrenOf = (id: string) => rows.filter((r) => r.parent_id === id);
  const set = <K extends keyof CategoryInput>(k: K, v: CategoryInput[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const edit = (r: CategoryRow) => setForm({
    id: r.id, name: r.name, name_bn: r.name_bn ?? "", slug: r.slug, parent_id: r.parent_id, description: r.description ?? "",
    image_url: r.image_url ?? "", icon: r.icon ?? "", sort_order: r.sort_order, is_active: r.is_active, seo: r.seo ?? {},
  });

  const save = () => form && start(async () => {
    const r = await saveCategoryAction(form);
    if (!r.ok) return toast(r.error, "error");
    toast("Category saved");
    setForm(null);
  });

  const Row = ({ r, depth }: { r: CategoryRow; depth: number }) => (
    <>
      <li className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-0" style={{ paddingLeft: 20 + depth * 24 }}>
        {r.image_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={r.image_url} alt="" className="h-9 w-9 rounded-[10px] object-cover" />
          : <span className="h-9 w-9 rounded-[10px] bg-fill" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium">{r.name}{!r.is_active && <span className="ml-2 text-[12px] text-fg-subtle">Hidden</span>}</p>
          <p className="text-[12px] text-fg-muted">/{r.slug} · {r.product_count} products</p>
        </div>
        {canUpdate && <Button size="sm" variant="ghost" onClick={() => edit(r)}>Edit</Button>}
        {canDelete && (
          <Button size="sm" variant="ghost" className="text-danger" disabled={pending}
            onClick={() => confirm(`Delete "${r.name}"? Products stay but lose this category.`) && start(async () => {
              const res = await deleteCategoryAction(r.id);
              toast(res.ok ? "Deleted" : res.error, res.ok ? "success" : "error");
            })}>Delete</Button>
        )}
      </li>
      {childrenOf(r.id).map((c) => <Row key={c.id} r={c} depth={depth + 1} />)}
    </>
  );

  return (
    <>
      {canCreate && <Button className="mt-6" onClick={() => setForm(empty())}><Plus className="h-4 w-4" />New category</Button>}
      <ul className="mt-6 overflow-hidden rounded-[20px] bg-surface shadow-card">
        {roots.map((r) => <Row key={r.id} r={r} depth={0} />)}
        {!rows.length && <li className="p-10 text-center text-fg-muted">No categories yet.</li>}
      </ul>

      <Dialog open={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit category" : "New category"} className="md:max-w-2xl">
        {form && (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name (English)" htmlFor="c-name">
              <Input id="c-name" value={form.name} onChange={(e) => { set("name", e.target.value); if (!form.id) set("slug", slugify(e.target.value)); }} />
            </Field>
            <Field label="Name (Bangla)" htmlFor="c-bn"><Input id="c-bn" value={form.name_bn} onChange={(e) => set("name_bn", e.target.value)} /></Field>
            <Field label="URL slug" htmlFor="c-slug" hint={`/category/${form.slug || "..."}`}>
              <Input id="c-slug" value={form.slug} onChange={(e) => set("slug", slugify(e.target.value))} />
            </Field>
            <Field label="Parent category" htmlFor="c-parent">
              <Select id="c-parent" value={form.parent_id ?? ""} onChange={(e) => set("parent_id", e.target.value || null)}>
                <option value="">None (top level)</option>
                {rows.filter((r) => r.id !== form.id).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            </Field>
            <Field label="Description" htmlFor="c-desc" className="md:col-span-2">
              <Textarea id="c-desc" value={form.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
            <Field label="Image">
              <div className="flex items-center gap-3">
                {form.image_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={form.image_url} alt="" className="h-14 w-14 rounded-[12px] object-cover" />
                  : <span className="h-14 w-14 rounded-[12px] bg-fill" />}
                <Button size="sm" variant="secondary" type="button" onClick={() => setPicker(true)}><ImagePlus className="h-4 w-4" />Choose</Button>
                {form.image_url && <Button size="sm" variant="ghost" type="button" onClick={() => set("image_url", "")}>Remove</Button>}
              </div>
            </Field>
            <Field label="Sort order" htmlFor="c-sort"><Input id="c-sort" type="number" value={form.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} /></Field>
            <div className="md:col-span-2"><CodePanel entity="category" id={form.id ?? null} initial={form.id ? codes?.[form.id] ?? null : null} canEdit={!!canCode} scope="this category page" /></div>
            <div className="md:col-span-2"><SeoPanel value={(form.seo ?? {}) as SeoData} onChange={(v) => set("seo", v as never)} fallback={{ title: form.name, description: form.description ?? "", slug: form.slug, path: `/category/${form.slug}` }} /></div>
            <div className="md:col-span-2"><Switch checked={!!form.is_active} onChange={(v) => set("is_active", v)} label="Visible in store" /></div>
            <div className="flex gap-2 md:col-span-2">
              <Button onClick={save} disabled={pending || !form.name}>Save category</Button>
              <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Dialog>
      <MediaPicker open={picker} onClose={() => setPicker(false)} kind="image" multiple={false} folder="categories"
        onSelect={(m) => m[0] && set("image_url", m[0].url)} />
    </>
  );
}
