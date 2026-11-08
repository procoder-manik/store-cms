"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, LayoutTemplate } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { Card, Field, Input, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { RichText } from "@/components/admin/rich-text";
import { slugify } from "@/lib/utils";
import { SeoPanel } from "@/components/admin/seo/seo-panel";
import { CodePanel, type CodeValue } from "@/components/admin/code/code-panel";
import type { SeoData } from "@/lib/seo/model";
import { savePageAction, type PageInput } from "./actions";
import { builderProductSearchAction } from "../builder/actions";

export function PageEditor({ initial, productTitle, code, canCode }: { initial: PageInput; productTitle?: string | null; code?: CodeValue | null; canCode?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [p, setP] = useState<PageInput>(initial);
  const [prodName, setProdName] = useState(productTitle ?? "");
  const [found, setFound] = useState<{ id: string; title: string }[]>([]);
  const [pending, start] = useTransition();
  const landing = p.kind === "landing";
  const set = <K extends keyof PageInput>(k: K, v: PageInput[K]) => setP((s) => ({ ...s, [k]: v }));
  const base = landing ? "/admin/landing" : "/admin/pages";
  const save = (then?: "builder") => start(async () => {
    const r = await savePageAction(p);
    if (!r.ok) return toast(r.error, "error");
    toast("Saved");
    if (then === "builder") return router.push(`/admin/builder?page=${r.data!.id}`);
    if (!p.id) router.replace(`${base}/${r.data!.id}`); else router.refresh();
    setP((s) => ({ ...s, id: r.data!.id }));
  });
  return (
    <div className="mx-auto max-w-6xl pb-24">
      <Link href={base} className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-fill" aria-label="Back"><ArrowLeft className="h-4 w-4" /></Link>
      <h1 className="headline text-[26px]">{p.id ? p.title : landing ? "New landing page" : "New page"}</h1>
      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Card>
            <div className="space-y-4">
              <Field label="Title" htmlFor="pg-t"><Input id="pg-t" value={p.title} onChange={(e) => { set("title", e.target.value); if (!p.id) set("slug", slugify(e.target.value)); }} /></Field>
              <Field label="Address" htmlFor="pg-s" hint={`${landing ? "/lp/" : "/pages/"}${p.slug}`}><Input id="pg-s" value={p.slug} onChange={(e) => set("slug", slugify(e.target.value))} /></Field>
              {!landing && <Field label="Content (optional when you design with sections)"><RichText value={p.content_html ?? ""} onChange={(h) => set("content_html", h)} /></Field>}
            </div>
          </Card>
          <Card title="Design with sections" description="Hero, product grids, banners, FAQ, testimonials, HTML code and more, with a live preview.">
            <Button onClick={() => save("builder")} disabled={pending}><LayoutTemplate className="h-4 w-4" />Save and open Page builder</Button>
          </Card>
          {landing && (
            <Card title="Custom CSS" description="Styles only for this page.">
              <Textarea value={p.custom_css ?? ""} onChange={(e) => set("custom_css", e.target.value)} spellCheck={false} className="min-h-40 font-mono text-[12px]" placeholder=".my-cta { background: #111; }" />
            </Card>
          )}
          <CodePanel entity={landing ? "landing" : "page"} id={p.id ?? null} initial={code ?? null} canEdit={!!canCode} scope="this page" />
          <SeoPanel value={(p.seo ?? {}) as SeoData} onChange={(v) => set("seo", v as never)} fallback={{ title: p.title, slug: p.slug, path: `${landing ? "/lp/" : "/pages/"}${p.slug}`, text: p.content_html ?? "" }} />
        </div>
        <div className="space-y-5">
          <Card title="Publish">
            <Switch checked={p.is_published} onChange={(v) => set("is_published", v)} label="Published" />
            {p.id && <a href={landing ? `/lp/${p.slug}` : `/pages/${p.slug}`} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm", "mt-4")}>View <ExternalLink className="h-3.5 w-3.5" /></a>}
          </Card>
          {landing && (
            <Card title="Landing page options">
              <Switch checked={!!p.hide_chrome} onChange={(v) => set("hide_chrome", v)} label="Hide header and footer" />
              <div className="mt-4">
                <p className="mb-1.5 text-[13px] font-medium text-fg-muted">Product (for the buy button and tracking)</p>
                {prodName && <p className="mb-2 flex items-center justify-between rounded-[10px] bg-fill px-3 py-2 text-[13px]">{prodName}<button type="button" className="text-danger" onClick={() => { set("product_id", null); setProdName(""); }}>Remove</button></p>}
                <Input placeholder="Search products" className="h-9" onChange={async (e) => setFound(e.target.value.length > 1 ? await builderProductSearchAction(e.target.value) : [])} />
                {found.length > 0 && <ul className="mt-1 max-h-48 overflow-y-auto rounded-[12px] border border-line">{found.map((f) => <li key={f.id}><button type="button" className="w-full px-3 py-2 text-left text-[13px] hover:bg-fill" onClick={() => { set("product_id", f.id); setProdName(f.title); setFound([]); }}>{f.title}</button></li>)}</ul>}
              </div>
            </Card>
          )}
        </div>
      </div>
      <div className="glass fixed inset-x-0 bottom-0 z-30 border-x-0 border-b-0 lg:left-64">
        <div className="mx-auto flex max-w-6xl justify-end gap-3 px-5 py-3 md:px-8"><Button onClick={() => save()} disabled={pending}>{pending ? "Saving" : "Save"}</Button></div>
      </div>
    </div>
  );
}
