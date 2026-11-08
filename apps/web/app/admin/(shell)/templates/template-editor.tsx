"use client";
import { useState, useTransition } from "react";
import { Laptop, Monitor, RefreshCw, Smartphone, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Field, Input, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { Thumb } from "@/components/admin/builder/thumb";
import { saveSettingsAction } from "@/components/admin/settings/actions";
import { CARDS } from "@/lib/theme/presets";
import type { Templates } from "@/lib/theme/templates";
import type { Box } from "@/lib/sections/registry";
import { cn } from "@/lib/utils";

type Key = keyof Templates;
const TABS: [Key, string][] = [["product", "Product page"], ["shop", "Shop and categories"], ["blog", "Blog archive"], ["post", "Single post"]];
const DEVICES = [{ id: "desktop", icon: Monitor, w: "100%" }, { id: "laptop", icon: Laptop, w: "1280px" }, { id: "tablet", icon: Tablet, w: "820px" }, { id: "phone", icon: Smartphone, w: "390px" }] as const;

const T: Record<string, Box[]> = {
  "thumbs-bottom": [[8, 6, 50, 44, "i"], [8, 54, 11, 11, "i"], [22, 54, 11, 11, "i"], [36, 54, 11, 11, "i"], [66, 10, 46, 6, "t"], [66, 22, 30, 4, "s"], [66, 40, 40, 9, "b"]],
  "thumbs-left": [[8, 6, 9, 9, "i"], [8, 18, 9, 9, "i"], [8, 30, 9, 9, "i"], [21, 6, 40, 52, "i"], [68, 10, 44, 6, "t"], [68, 22, 30, 4, "s"], [68, 40, 40, 9, "b"]],
  grid: [[6, 6, 34, 28, "i"], [43, 6, 34, 28, "i"], [80, 6, 34, 28, "i"], [6, 38, 34, 28, "i"], [43, 38, 34, 28, "i"], [80, 38, 34, 28, "i"]],
  list: [[6, 6, 36, 18, "i"], [48, 8, 50, 5, "t"], [48, 16, 40, 3, "s"], [6, 28, 36, 18, "i"], [48, 30, 50, 5, "t"], [48, 38, 40, 3, "s"], [6, 50, 36, 18, "i"], [48, 52, 50, 5, "t"]],
  magazine: [[6, 6, 70, 36, "d"], [80, 6, 34, 17, "d"], [80, 25, 34, 17, "d"], [6, 46, 34, 22, "d"], [43, 46, 34, 22, "d"], [80, 46, 34, 22, "d"]],
};

function Choice<V extends string | number>({ value, options, onChange }: { value: V; options: { v: V; label: string; thumb?: string }[]; onChange: (v: V) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {options.map((o) => (
        <button key={String(o.v)} type="button" aria-pressed={value === o.v} onClick={() => onChange(o.v)} className={cn("rounded-[12px] border-2 p-1.5 text-left", value === o.v ? "border-accent" : "border-transparent hover:border-line")}>
          {o.thumb && <Thumb boxes={T[o.thumb]!} />}<span className="mt-1 block px-0.5 text-[12px] font-medium">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function TemplateEditor({ initial, canEdit, previews }: { initial: Templates; canEdit: boolean; previews: Record<Key, string> }) {
  const toast = useToast();
  const [tab, setTab] = useState<Key>("product");
  const [t, setT] = useState<Templates>(initial);
  const [device, setDevice] = useState<(typeof DEVICES)[number]["id"]>("desktop");
  const [frame, setFrame] = useState(0);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const changed = JSON.stringify(t) !== saved;
  const set = <K extends Key>(k: K, patch: Partial<Templates[K]>) => setT((s) => ({ ...s, [k]: { ...s[k], ...patch } }));
  const sw = <K extends Key>(k: K, field: keyof Templates[K], label: string) => <Switch key={String(field)} checked={!!t[k][field]} onChange={(v) => set(k, { [field]: v } as Partial<Templates[K]>)} label={label} />;
  const save = () => start(async () => {
    const r = await saveSettingsAction("templates", t as unknown as Record<string, unknown>);
    if (!r.ok) return toast(r.error, "error");
    setSaved(JSON.stringify(t)); setFrame((f) => f + 1); toast("Templates saved");
  });

  return (
    <div className="mt-5 pb-24">
      <nav className="no-scrollbar flex gap-1 overflow-x-auto" aria-label="Templates">{TABS.map(([k, l]) => <button key={k} onClick={() => { setTab(k); setFrame((f) => f + 1); }} className={cn("shrink-0 rounded-full px-4 py-1.5 text-[14px]", tab === k ? "bg-fg text-background" : "text-fg-muted hover:bg-fill")}>{l}</button>)}</nav>
      <div className="mt-5 grid gap-5 xl:grid-cols-[400px_minmax(0,1fr)]">
        <div className="space-y-4">
          {tab === "product" && (
            <>
              <Card title="Photos"><Choice value={t.product.gallery} onChange={(v) => set("product", { gallery: v })} options={[{ v: "thumbs-bottom", label: "Thumbnails below", thumb: "thumbs-bottom" }, { v: "thumbs-left", label: "Thumbnails on the side", thumb: "thumbs-left" }]} /></Card>
              <Card title="Description, specifications and reviews"><Choice value={t.product.info} onChange={(v) => set("product", { info: v })} options={[{ v: "stacked", label: "One after another" }, { v: "tabs", label: "Tabs" }, { v: "accordion", label: "Accordion" }]} /></Card>
              <Card title="Show"><div className="space-y-3">{sw("product", "breadcrumb", "Breadcrumb")}{sw("product", "trust", "Trust badges (delivery, returns, secure payment)")}{sw("product", "share", "Share buttons")}{sw("product", "specs", "Specifications")}{sw("product", "reviews", "Reviews and questions")}{sw("product", "related", "Related products")}{sw("product", "recent", "Recently viewed")}{sw("product", "sticky_bar", "Buy bar stuck to the bottom on phones")}</div></Card>
            </>
          )}
          {tab === "shop" && (
            <>
              <Card title="Layout">
                <div className="space-y-4">
                  <Field label="Products per row on large screens"><Choice value={t.shop.columns} onChange={(v) => set("shop", { columns: v })} options={[2, 3, 4, 5].map((n) => ({ v: n as 2, label: `${n} columns` }))} /></Field>
                  <Field label="Filters"><Choice value={t.shop.filters} onChange={(v) => set("shop", { filters: v })} options={[{ v: "sidebar", label: "Sidebar" }, { v: "none", label: "Hidden" }]} /></Field>
                  <Field label="Products per page"><Choice value={t.shop.per_page} onChange={(v) => set("shop", { per_page: v })} options={[12, 24, 36, 48].map((n) => ({ v: n as 24, label: String(n) }))} /></Field>
                  <Field label="Card style"><Choice value={t.shop.card} onChange={(v) => set("shop", { card: v as Templates["shop"]["card"] })} options={[{ v: "", label: "Theme default" }, ...CARDS.map((c) => ({ v: c.id as string, label: c.label }))]} /></Field>
                </div>
              </Card>
              <Card>{sw("shop", "show_count", "Show the number of products when filters are hidden")}</Card>
            </>
          )}
          {tab === "blog" && (
            <>
              <Card title="Layout"><Choice value={t.blog.layout} onChange={(v) => set("blog", { layout: v })} options={[{ v: "grid", label: "Grid", thumb: "grid" }, { v: "list", label: "List", thumb: "list" }, { v: "magazine", label: "Magazine", thumb: "magazine" }]} />
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Field label="Columns"><Choice value={t.blog.columns} onChange={(v) => set("blog", { columns: v })} options={[{ v: 2, label: "2" }, { v: 3, label: "3" }]} /></Field>
                  <Field label="Posts per page"><Choice value={t.blog.per_page} onChange={(v) => set("blog", { per_page: v })} options={[6, 9, 12, 18].map((n) => ({ v: n as 9, label: String(n) }))} /></Field>
                </div></Card>
              <Card title="Show"><div className="space-y-3">{sw("blog", "featured", "Big featured first post")}{sw("blog", "filters", "Category buttons")}{sw("blog", "sidebar", "Sidebar with topics and latest posts")}{sw("blog", "excerpt", "Summary text")}{sw("blog", "meta", "Date and category")}</div></Card>
              <Card title="Intro"><div className="space-y-3"><Field label="Title (empty = type name)" htmlFor="tb-t"><Input id="tb-t" value={t.blog.intro_title} onChange={(e) => set("blog", { intro_title: e.target.value })} /></Field><Field label="Short text" htmlFor="tb-x"><Textarea id="tb-x" value={t.blog.intro_text} onChange={(e) => set("blog", { intro_text: e.target.value })} className="min-h-16" /></Field></div></Card>
            </>
          )}
          {tab === "post" && (
            <Card title="Show" description="The hero style (classic, magazine, minimal) is set per post type in Posts, then Post types.">
              <div className="space-y-3">{sw("post", "toc", "Table of contents that follows you")}{sw("post", "progress", "Reading progress bar")}{sw("post", "author", "Author box")}{sw("post", "share", "Share buttons")}{sw("post", "tags", "Tags")}{sw("post", "products", "Products mentioned in the post")}{sw("post", "prev_next", "Previous and next post")}{sw("post", "related", "Related posts")}</div>
            </Card>
          )}
        </div>
        <div className="rounded-[20px] bg-surface p-3 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex gap-1 rounded-full bg-fill p-1">{DEVICES.map((d) => <button key={d.id} onClick={() => setDevice(d.id)} aria-label={d.id} className={cn("flex h-8 w-9 items-center justify-center rounded-full", device === d.id ? "bg-surface shadow-card" : "text-fg-muted")}><d.icon className="h-4 w-4" /></button>)}</div>
            <button onClick={() => setFrame((f) => f + 1)} aria-label="Reload preview" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-fill"><RefreshCw className="h-4 w-4" /></button>
            <span className="ml-auto text-[12px] text-fg-muted">{changed ? "Save to update the preview" : "Live preview"}</span>
          </div>
          <div className="flex justify-center overflow-hidden rounded-[14px] bg-fill">
            <iframe key={`${tab}-${frame}`} src={previews[tab]} title="Preview" className="h-[75vh] max-w-full border-0 bg-background" style={{ width: DEVICES.find((d) => d.id === device)!.w }} />
          </div>
        </div>
      </div>
      {canEdit && changed && (
        <div className="glass fixed inset-x-0 bottom-0 z-30 border-x-0 border-b-0 lg:left-64"><div className="mx-auto flex max-w-[1600px] items-center justify-end gap-3 px-5 py-3 md:px-8">
          <span className="mr-auto text-[13px] text-fg-muted">Unsaved changes</span><Button variant="ghost" onClick={() => setT(JSON.parse(saved))}>Discard</Button><Button onClick={save} disabled={pending}>{pending ? "Saving" : "Save and preview"}</Button>
        </div></div>
      )}
    </div>
  );
}
