"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, ImagePlus } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { Card, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { RichText } from "@/components/admin/rich-text";
import { MediaPicker } from "@/components/admin/media-library";
import type { PostType } from "@/lib/content/post-types";
import { slugify } from "@/lib/utils";
import { SeoPanel } from "@/components/admin/seo/seo-panel";
import { CodePanel, type CodeValue } from "@/components/admin/code/code-panel";
import type { SeoData } from "@/lib/seo/model";
import { FieldInput } from "../../builder/fields";
import { savePostAction, type PostInput } from "../actions";

export function PostEditor({ initial, types, categories, code, canCode }: { initial: PostInput; types: PostType[]; categories: { id: string; name: string }[]; code?: CodeValue | null; canCode?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [p, setP] = useState<PostInput>(initial);
  const [tagText, setTagText] = useState((initial.tags ?? []).join(", "));
  const [picker, setPicker] = useState(false);
  const [pending, start] = useTransition();
  const set = <K extends keyof PostInput>(k: K, v: PostInput[K]) => setP((s) => ({ ...s, [k]: v }));
  const type = types.find((t) => t.id === p.post_type) ?? types[0]!;
  const save = (status?: "draft" | "published") => start(async () => {
    const r = await savePostAction({ ...p, status: status ?? p.status, tags: tagText.split(",").map((x) => x.trim()).filter(Boolean) });
    if (!r.ok) return toast(r.error, "error");
    toast(status === "published" ? "Published" : "Saved");
    if (status) set("status", status);
    if (!p.id) router.replace(`/admin/posts/${r.data!.id}`); else router.refresh();
    set("id", r.data!.id);
  });
  return (
    <div className="mx-auto max-w-6xl pb-24">
      <Link href={`/admin/posts?type=${p.post_type}`} className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-fill" aria-label="Back"><ArrowLeft className="h-4 w-4" /></Link>
      <h1 className="headline text-[26px]">{p.id ? p.title : `New ${type.label.toLowerCase()}`}</h1>
      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Card>
            <div className="space-y-4">
              <Field label="Title" htmlFor="po-t"><Input id="po-t" value={p.title} onChange={(e) => { set("title", e.target.value); if (!p.id) set("slug", slugify(e.target.value)); }} className="h-12 text-[18px] font-medium" /></Field>
              <Field label="Address" htmlFor="po-s" hint={`/${type.path}/${p.slug}`}><Input id="po-s" value={p.slug} onChange={(e) => set("slug", slugify(e.target.value))} /></Field>
              <Field label="Summary" htmlFor="po-e" hint="Shown in lists and on social media."><Textarea id="po-e" value={p.excerpt ?? ""} onChange={(e) => set("excerpt", e.target.value)} className="min-h-16" /></Field>
              <Field label="Content" hint="Use Heading 2 and 3 to build the table of contents automatically."><RichText value={p.content_html ?? ""} onChange={(h) => set("content_html", h)} /></Field>
            </div>
          </Card>
          <Card title="Products in this post" description="Shown as a product row under the article.">
            <FieldInput field={{ key: "related_product_ids", label: "Products", type: "products" }} value={p.related_product_ids} ctx={{ categories: [] }} onChange={(v) => set("related_product_ids", v as string[])} />
          </Card>
          <CodePanel entity="post" id={p.id ?? null} initial={code ?? null} canEdit={!!canCode} scope="this post" />
          <SeoPanel value={(p.seo ?? {}) as SeoData} onChange={(v) => set("seo", v as never)} fallback={{ title: p.title, description: p.excerpt ?? "", slug: p.slug, path: `/${type.path}/${p.slug}`, text: p.content_html ?? "", image: p.cover_url || undefined }} />
        </div>
        <div className="space-y-5">
          <Card title="Publish">
            <p className="text-[13px] text-fg-muted">Status: <span className={p.status === "published" ? "text-success" : ""}>{p.status}</span></p>
            <Field label="Publish date (optional, can be in the future)" htmlFor="po-d" className="mt-3"><Input id="po-d" type="datetime-local" value={p.published_at ? new Date(p.published_at).toISOString().slice(0, 16) : ""} onChange={(e) => set("published_at", e.target.value || null)} /></Field>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button disabled={pending} onClick={() => save("published")}>{p.status === "published" ? "Update" : "Publish"}</Button>
              <Button variant="secondary" disabled={pending} onClick={() => save("draft")}>{p.status === "published" ? "Unpublish" : "Save draft"}</Button>
            </div>
            {p.id && p.status === "published" && <a href={`/${type.path}/${p.slug}`} target="_blank" rel="noreferrer" className={buttonClass("ghost", "sm", "mt-3")}>View <ExternalLink className="h-3.5 w-3.5" /></a>}
          </Card>
          <Card title="Featured image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.cover_url ? <img src={p.cover_url} alt="" className="aspect-[16/9] w-full rounded-[12px] object-cover" /> : <div className="aspect-[16/9] rounded-[12px] bg-fill" />}
            <div className="mt-2 flex gap-2"><Button size="sm" variant="secondary" onClick={() => setPicker(true)}><ImagePlus className="h-4 w-4" />Choose</Button>{p.cover_url && <Button size="sm" variant="ghost" onClick={() => set("cover_url", "")}>Remove</Button>}</div>
            <MediaPicker open={picker} onClose={() => setPicker(false)} multiple={false} folder="posts" onSelect={(m) => m[0] && set("cover_url", m[0].url)} />
          </Card>
          <Card title="Organize">
            <div className="space-y-3">
              <Field label="Type" htmlFor="po-ty"><Select id="po-ty" value={p.post_type} onChange={(e) => { set("post_type", e.target.value); set("category_id", null); }}>{types.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</Select></Field>
              <Field label="Category" htmlFor="po-c"><Select id="po-c" value={p.category_id ?? ""} onChange={(e) => set("category_id", e.target.value || null)}><option value="">No category</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
              <Field label="Tags (comma separated)" htmlFor="po-tg"><Input id="po-tg" value={tagText} onChange={(e) => setTagText(e.target.value)} /></Field>
              <Switch checked={p.show_toc !== false} onChange={(v) => set("show_toc", v)} label="Show table of contents" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
