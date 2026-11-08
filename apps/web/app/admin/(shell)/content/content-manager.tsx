"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { RichText } from "@/components/admin/rich-text";
import { MediaPicker } from "@/components/admin/media-library";
import { slugify } from "@/lib/utils";
import { deleteContentAction, saveContentAction } from "./actions";

type Row = Record<string, unknown> & { id: string };

export function ContentManager({ tab, items, categories, canEdit, canDelete }: { tab: "pages" | "blog" | "faq"; items: Row[]; categories: { id: string; name: string }[]; canEdit: boolean; canDelete: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  const [picker, setPicker] = useState(false);
  const [pending, start] = useTransition();
  const kind = tab === "pages" ? "page" : tab === "blog" ? "post" : "faq";
  const set = (k: string, v: unknown) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const blank = kind === "page" ? { title: "", slug: "", content_html: "", is_published: true, seo: {} }
    : kind === "post" ? { title: "", slug: "", excerpt: "", content_html: "", cover_url: "", category_id: null, status: "draft", published_at: null, seo: {} }
    : { question: "", answer: "", category: "", sort_order: items.length + 1, is_active: true };
  const seo = (form?.seo ?? {}) as { title?: string; description?: string };

  const save = () => form && start(async () => {
    const { created_at: _c, updated_at: _u, author_id: _a, ...data } = form as Record<string, unknown>;
    void _c; void _u; void _a;
    const r = await saveContentAction(kind, data);
    if (!r.ok) return toast(r.error, "error");
    toast("Saved"); setForm(null); router.refresh();
  });

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2">
        {canEdit && <Button onClick={() => setForm(blank)}><Plus className="h-4 w-4" />{kind === "page" ? "New page" : kind === "post" ? "New post" : "New question"}</Button>}
        {canEdit && kind === "post" && <Button variant="secondary" onClick={() => { const name = prompt("Category name"); if (name) start(async () => { const r = await saveContentAction("blog_category", { name }); toast(r.ok ? "Category added" : r.error, r.ok ? "success" : "error"); router.refresh(); }); }}>Add category</Button>}
      </div>
      <ul className="mt-5 overflow-hidden rounded-[20px] bg-surface shadow-card">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-3 border-b border-line px-5 py-3 text-[14px] last:border-0">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{String(it.title ?? it.question)}</p>
              <p className="truncate text-[12px] text-fg-muted">{kind === "page" ? `/pages/${it.slug}` : kind === "post" ? `/blog/${it.slug} · ${it.status}` : String(it.answer).slice(0, 90)}</p>
            </div>
            {canEdit && <Button size="sm" variant="ghost" onClick={() => setForm(it)}>Edit</Button>}
            {canDelete && <Button size="sm" variant="ghost" className="text-danger" disabled={pending} onClick={() => confirm("Delete?") && start(async () => { await deleteContentAction(kind, it.id); router.refresh(); })}>Delete</Button>}
          </li>
        ))}
        {!items.length && <li className="p-10 text-center text-fg-muted">Nothing yet.</li>}
      </ul>

      <Dialog open={!!form} onClose={() => setForm(null)} title={kind === "faq" ? "Question" : kind === "post" ? "Blog post" : "Page"} className="md:max-w-3xl">
        {form && (
          <div className="grid gap-3">
            {kind === "faq" ? (
              <>
                <Field label="Question" htmlFor="ct-q"><Input id="ct-q" value={String(form.question ?? "")} onChange={(e) => set("question", e.target.value)} /></Field>
                <Field label="Answer" htmlFor="ct-a"><Textarea id="ct-a" value={String(form.answer ?? "")} onChange={(e) => set("answer", e.target.value)} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Group" htmlFor="ct-c"><Input id="ct-c" value={String(form.category ?? "")} onChange={(e) => set("category", e.target.value)} /></Field>
                  <Field label="Order" htmlFor="ct-o"><Input id="ct-o" type="number" value={Number(form.sort_order ?? 0)} onChange={(e) => set("sort_order", Number(e.target.value))} /></Field>
                </div>
                <Switch checked={!!form.is_active} onChange={(v) => set("is_active", v)} label="Show on FAQ page" />
              </>
            ) : (
              <>
                <Field label="Title" htmlFor="ct-t"><Input id="ct-t" value={String(form.title ?? "")} onChange={(e) => { set("title", e.target.value); if (!form.id) set("slug", slugify(e.target.value)); }} /></Field>
                <Field label="URL" htmlFor="ct-s" hint={`${kind === "page" ? "/pages/" : "/blog/"}${String(form.slug ?? "")}`}><Input id="ct-s" value={String(form.slug ?? "")} onChange={(e) => set("slug", slugify(e.target.value))} /></Field>
                {kind === "post" && (
                  <>
                    <Field label="Short summary" htmlFor="ct-e"><Textarea id="ct-e" value={String(form.excerpt ?? "")} onChange={(e) => set("excerpt", e.target.value)} className="min-h-16" /></Field>
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {form.cover_url ? <img src={String(form.cover_url)} alt="" className="h-14 w-24 rounded-[10px] object-cover" /> : <span className="h-14 w-24 rounded-[10px] bg-fill" />}
                      <Button size="sm" variant="secondary" type="button" onClick={() => setPicker(true)}><ImagePlus className="h-4 w-4" />Cover image</Button>
                      <Select value={String(form.category_id ?? "")} onChange={(e) => set("category_id", e.target.value || null)} className="h-10 w-48"><option value="">No category</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
                    </div>
                  </>
                )}
                <Field label="Content"><RichText value={String(form.content_html ?? "")} onChange={(h) => set("content_html", h)} /></Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="SEO title" htmlFor="ct-st"><Input id="ct-st" value={seo.title ?? ""} onChange={(e) => set("seo", { ...seo, title: e.target.value })} /></Field>
                  <Field label="SEO description" htmlFor="ct-sd"><Input id="ct-sd" value={seo.description ?? ""} onChange={(e) => set("seo", { ...seo, description: e.target.value })} /></Field>
                </div>
                {kind === "page" ? <Switch checked={!!form.is_published} onChange={(v) => set("is_published", v)} label="Published" />
                  : <Switch checked={form.status === "published"} onChange={(v) => set("status", v ? "published" : "draft")} label="Published" />}
              </>
            )}
            <Button disabled={pending} onClick={save}>Save</Button>
          </div>
        )}
      </Dialog>
      <MediaPicker open={picker} onClose={() => setPicker(false)} kind="image" multiple={false} folder="blog" onSelect={(m) => m[0] && set("cover_url", m[0].url)} />
    </>
  );
}
