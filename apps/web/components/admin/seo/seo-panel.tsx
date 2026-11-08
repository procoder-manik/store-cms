"use client";
import { useMemo, useState } from "react";
import { Check, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { MediaPicker } from "@/components/admin/media-library";
import { SCHEMA_TYPES, buildSchema, seoChecks, type SchemaItem, type SchemaType, type SeoData } from "@/lib/seo/model";
import { cn } from "@/lib/utils";

type D = Record<string, unknown>;
const uid = () => Math.random().toString(36).slice(2, 10);
const str = (v: unknown) => (typeof v === "string" ? v : "");

function List({ items, onChange, fields, addLabel, max = 12 }: { items: D[]; onChange: (v: D[]) => void; fields: { key: string; label: string; area?: boolean }[]; addLabel: string; max?: number }) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="space-y-2 rounded-[12px] border border-line p-3">
          {fields.map((f) => f.area
            ? <Textarea key={f.key} value={str(it[f.key])} placeholder={f.label} aria-label={f.label} className="min-h-16" onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, [f.key]: e.target.value } : x)))} />
            : <Input key={f.key} value={str(it[f.key])} placeholder={f.label} aria-label={f.label} className="h-10" onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, [f.key]: e.target.value } : x)))} />)}
          <button type="button" className="flex items-center gap-1 text-[12px] text-danger" onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" />Remove</button>
        </div>
      ))}
      {items.length < max && <Button type="button" size="sm" variant="secondary" onClick={() => onChange([...items, {}])}><Plus className="h-4 w-4" />{addLabel}</Button>}
    </div>
  );
}

function SchemaForm({ item, onChange }: { item: SchemaItem; onChange: (d: D) => void }) {
  const d = item.data ?? {};
  const set = (k: string, v: unknown) => onChange({ ...d, [k]: v });
  const text = (k: string, label: string, hint?: string) => <Field label={label} hint={hint} key={k}><Input value={str(d[k])} onChange={(e) => set(k, e.target.value)} className="h-10" /></Field>;
  switch (item.type) {
    case "FAQPage": return <List items={(d.items as D[]) ?? []} onChange={(v) => set("items", v)} addLabel="Add question" fields={[{ key: "q", label: "Question" }, { key: "a", label: "Answer", area: true }]} max={20} />;
    case "HowTo": return (
      <div className="space-y-3">{text("name", "Title")}{text("description", "Short description")}{text("totalTime", "Total time", "Example: PT30M for 30 minutes")}
        <List items={(d.steps as D[]) ?? []} onChange={(v) => set("steps", v)} addLabel="Add step" fields={[{ key: "name", label: "Step name" }, { key: "text", label: "What to do", area: true }]} max={20} /></div>);
    case "Article": return <div className="grid gap-3 sm:grid-cols-2">{text("headline", "Headline")}{text("author", "Author")}{text("image", "Image URL")}{text("description", "Description")}<Field label="Type"><Select value={str(d.kind) || "Article"} onChange={(e) => set("kind", e.target.value)} className="h-10"><option>Article</option><option>NewsArticle</option></Select></Field></div>;
    case "LocalBusiness": return (
      <div className="grid gap-3 sm:grid-cols-2">{text("name", "Business name")}{text("phone", "Phone")}{text("email", "Email")}{text("image", "Photo URL")}{text("street", "Street address")}{text("city", "City")}{text("region", "Division")}{text("postal", "Postal code")}{text("priceRange", "Price range", "Example: ৳৳")}
        <Field label="Opening hours (one per line)" hint="Example: Mo-Sa 10:00-20:00"><Textarea value={str(d.hours)} onChange={(e) => set("hours", e.target.value)} className="min-h-20" /></Field></div>);
    case "VideoObject": return <div className="grid gap-3 sm:grid-cols-2">{text("name", "Video title")}{text("contentUrl", "Video file URL (.mp4)")}{text("embedUrl", "Embed URL (YouTube)")}{text("thumbnail", "Thumbnail URL")}{text("description", "Description")}{text("uploadDate", "Upload date", "2026-01-31")}{text("duration", "Duration", "PT2M30S for 2 min 30 s")}</div>;
    case "Event": return <div className="grid gap-3 sm:grid-cols-2">{text("name", "Event name")}{text("startDate", "Starts", "2026-12-16T10:00")}{text("endDate", "Ends")}{text("location", "Location")}{text("address", "Address")}{text("image", "Image URL")}{text("description", "Description")}<Field label="Online event"><Select value={str(d.online)} onChange={(e) => set("online", e.target.value)} className="h-10"><option value="">No</option><option value="yes">Yes</option></Select></Field></div>;
    case "Service": return <div className="grid gap-3 sm:grid-cols-2">{text("name", "Service name")}{text("serviceType", "Type")}{text("provider", "Provider")}{text("areaServed", "Area served")}{text("description", "Description")}</div>;
    case "Custom": return <Textarea value={str(d.json)} spellCheck={false} onChange={(e) => set("json", e.target.value)} className="min-h-48 font-mono text-[12px]" placeholder={'{\n  "@type": "Product",\n  "name": "Example"\n}'} />;
  }
}

/**
 * One SEO panel for every content type: search preview, keyword checks, canonical and robots, social sharing,
 * and a schema generator (FAQ, How-to, Article, Local business, Video, Event, Service, custom JSON-LD).
 */
export function SeoPanel({ value, onChange, fallback }: { value: SeoData; onChange: (v: SeoData) => void; fallback: { title: string; description?: string; slug?: string; path: string; text?: string; image?: string } }) {
  const seo = useMemo(() => value ?? {}, [value]);
  const set = <K extends keyof SeoData>(k: K, v: SeoData[K]) => onChange({ ...seo, [k]: v });
  const [picker, setPicker] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const site = (typeof window !== "undefined" ? window.location.host : "yourstore.com");
  const title = seo.title || fallback.title;
  const desc = seo.description || fallback.description || "";
  const checks = useMemo(() => seoChecks(seo, { title: fallback.title, slug: fallback.slug, text: fallback.text }), [seo, fallback.title, fallback.slug, fallback.text]);
  const schemas = seo.schemas ?? [];
  const addSchema = (type: SchemaType) => { const it = { id: uid(), type, data: type === "Article" ? { headline: fallback.title } : {} }; onChange({ ...seo, schemas: [...schemas, it] }); setOpen(it.id); };

  return (
    <Card title="Search engines and sharing" description="How this page looks in Google and on social media, plus structured data (schema).">
      <div className="rounded-[14px] bg-fill/60 p-4">
        <p className="truncate text-[12px] text-fg-muted">{site}{fallback.path}</p>
        <p className="mt-0.5 truncate text-[18px] text-accent">{title || "Page title"}</p>
        <p className="line-clamp-2 text-[13px] text-fg-muted">{desc || "Add a description to control what Google shows."}</p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label={`Page title (${title.length}/60)`} htmlFor="sp-t"><Input id="sp-t" value={seo.title ?? ""} onChange={(e) => set("title", e.target.value)} placeholder={fallback.title} /></Field>
        <Field label="Focus keyword" htmlFor="sp-k" hint="The main phrase people search for."><Input id="sp-k" value={seo.keyword ?? ""} onChange={(e) => set("keyword", e.target.value)} /></Field>
        <Field label={`Meta description (${desc.length}/160)`} htmlFor="sp-d" className="sm:col-span-2"><Textarea id="sp-d" value={seo.description ?? ""} onChange={(e) => set("description", e.target.value)} className="min-h-20" placeholder={fallback.description} /></Field>
      </div>
      <ul className="mt-3 grid gap-1 sm:grid-cols-2">{checks.map((c) => <li key={c.label} className={cn("flex items-start gap-2 text-[13px]", c.ok ? "text-success" : "text-fg-muted")}>{c.ok ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-warning" />}{c.label}</li>)}</ul>

      <p className="mb-2 mt-6 text-[13px] font-semibold text-fg-muted">URL and robots</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Canonical URL (optional)" htmlFor="sp-c" hint="Use only when another address is the main version of this page."><Input id="sp-c" value={seo.canonical ?? ""} onChange={(e) => set("canonical", e.target.value)} placeholder="https://" /></Field>
        <Field label="Breadcrumb name (optional)" htmlFor="sp-b"><Input id="sp-b" value={seo.breadcrumb_title ?? ""} onChange={(e) => set("breadcrumb_title", e.target.value)} /></Field>
        <Switch checked={!!seo.noindex} onChange={(v) => set("noindex", v)} label="Hide from search engines (noindex)" />
        <Switch checked={!!seo.nofollow} onChange={(v) => set("nofollow", v)} label="Do not follow links (nofollow)" />
      </div>

      <p className="mb-2 mt-6 text-[13px] font-semibold text-fg-muted">Social sharing (Facebook, WhatsApp, X)</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Share title" htmlFor="sp-ot"><Input id="sp-ot" value={seo.og_title ?? ""} onChange={(e) => set("og_title", e.target.value)} placeholder={title} /></Field>
        <Field label="Card size" htmlFor="sp-tc"><Select id="sp-tc" value={seo.twitter_card ?? "summary_large_image"} onChange={(e) => set("twitter_card", e.target.value as "summary")}><option value="summary_large_image">Large image</option><option value="summary">Small</option></Select></Field>
        <Field label="Share description" htmlFor="sp-od" className="sm:col-span-2"><Input id="sp-od" value={seo.og_description ?? ""} onChange={(e) => set("og_description", e.target.value)} placeholder={desc} /></Field>
        <div className="flex items-center gap-3 sm:col-span-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {(seo.og_image || fallback.image) ? <img src={seo.og_image || fallback.image} alt="" className="h-14 w-24 rounded-[8px] object-cover" /> : <span className="h-14 w-24 rounded-[8px] bg-fill" />}
          <Button type="button" size="sm" variant="secondary" onClick={() => setPicker(true)}><ImagePlus className="h-4 w-4" />Share image</Button>
          {seo.og_image && <Button type="button" size="sm" variant="ghost" onClick={() => set("og_image", "")}>Use default</Button>}
          <MediaPicker open={picker} onClose={() => setPicker(false)} multiple={false} folder="seo" onSelect={(m) => m[0] && set("og_image", m[0].url)} />
        </div>
      </div>

      <p className="mb-1 mt-6 text-[13px] font-semibold text-fg-muted">Schema markup (structured data)</p>
      <p className="mb-3 text-[12px] text-fg-subtle">Product, breadcrumb and article data are added automatically. Add extra types here. The result is checked as you type.</p>
      <div className="space-y-2">
        {schemas.map((it) => {
          const built = buildSchema(it);
          const meta = SCHEMA_TYPES.find((t) => t.id === it.type)!;
          return (
            <div key={it.id} className="rounded-[14px] border border-line">
              <div className="flex items-center gap-2 px-3 py-2.5">
                <button type="button" className="flex-1 text-left text-[14px] font-medium" onClick={() => setOpen(open === it.id ? null : it.id)}>{meta.label}</button>
                <span className={cn("text-[12px]", built ? "text-success" : "text-warning")}>{built ? "Valid" : "Needs more info"}</span>
                <button type="button" aria-label="Remove" onClick={() => onChange({ ...seo, schemas: schemas.filter((x) => x.id !== it.id) })}><Trash2 className="h-4 w-4 text-fg-subtle" /></button>
              </div>
              {open === it.id && (
                <div className="space-y-3 border-t border-line p-3">
                  <SchemaForm item={it} onChange={(data) => onChange({ ...seo, schemas: schemas.map((x) => (x.id === it.id ? { ...x, data } : x)) })} />
                  {built && <pre className="max-h-48 overflow-auto rounded-[10px] bg-fill p-3 text-[11px]">{JSON.stringify({ "@context": "https://schema.org", ...built }, null, 2)}</pre>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {schemas.length < 8 && <div className="mt-3 flex flex-wrap gap-1.5">{SCHEMA_TYPES.map((t) => <button key={t.id} type="button" title={t.hint} onClick={() => addSchema(t.id)} className="rounded-full bg-fill px-3 py-1.5 text-[12px] hover:bg-accent-soft">+ {t.label}</button>)}</div>}
    </Card>
  );
}
