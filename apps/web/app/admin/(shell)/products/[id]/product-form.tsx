"use client";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Film, GripVertical, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { RichText } from "@/components/admin/rich-text";
import { SeoPanel } from "@/components/admin/seo/seo-panel";
import { CodePanel, type CodeValue } from "@/components/admin/code/code-panel";
import type { SeoData } from "@/lib/seo/model";
import { MediaPicker } from "@/components/admin/media-library";
import { cn, slugify } from "@/lib/utils";
import type { ProductInput } from "@/lib/validators/product";
import { saveProductAction } from "../actions";

type Media = NonNullable<ProductInput["media"]>[number];
type Option = NonNullable<ProductInput["options"]>[number];
type Variant = NonNullable<ProductInput["variants"]>[number];

const blank: ProductInput = {
  title: "", title_bn: "", slug: "", short_description: "", description_html: "", status: "draft", published_at: "",
  price: 0, compare_at_price: null, cost_price: null, sku: "", barcode: "", stock: 0, track_inventory: true,
  allow_backorder: false, low_stock_threshold: 5, weight_grams: "", is_featured: false, category_ids: [], tags: [],
  specs: [], size_guide_html: "", media: [], options: [], variants: [], seo: {},
  shipping_mode: "default", advance_percent: null, advance_optional: true, preorder: false, preorder_ships_at: "", preorder_note: "", badges: [],
};

const comboKey = (o: Record<string, string>) => JSON.stringify(Object.keys(o).sort().map((k) => [k, o[k]]));

function cartesian(options: Option[]): Record<string, string>[] {
  const valid = options.filter((o) => o.name && o.values.length);
  if (!valid.length) return [];
  return valid.reduce<Record<string, string>[]>(
    (acc, o) => acc.flatMap((combo) => o.values.map((v) => ({ ...combo, [o.name]: v.value }))),
    [{}],
  );
}

export function ProductForm({ initial, categories, canSave, siteUrl, brands = [], code, canCode }: {
  initial: ProductInput | null; categories: { id: string; name: string; parent_id: string | null }[]; canSave: boolean; siteUrl: string; brands?: { id: string; name: string }[]; code?: CodeValue | null; canCode?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [p, setP] = useState<ProductInput>(() => {
    if (!initial) return blank;
    const scheduled = initial.status === "published" && initial.published_at && new Date(initial.published_at) > new Date();
    return { ...initial, status: scheduled ? "scheduled" : initial.status, published_at: scheduled ? initial.published_at!.slice(0, 16) : initial.published_at };
  });
  const [picker, setPicker] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [pending, start] = useTransition();
  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) => setP((s) => ({ ...s, [k]: v }));
  const media = p.media ?? [];
  const options = p.options ?? [];
  const variants = p.variants ?? [];
  const hasVariants = options.length > 0;

  // ---------- Media ----------
  const moveMedia = (from: number, to: number) => {
    const next = [...media];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m!);
    set("media", next);
  };

  // ---------- Options / variants ----------
  function setOptions(next: Option[]) {
    const byKey = new Map(variants.map((v) => [comboKey(v.option_values), v]));
    const combos = cartesian(next);
    const regenerated: Variant[] = combos.map((c) => byKey.get(comboKey(c)) ?? {
      option_values: c, sku: "", price: Number(p.price) || 0, compare_at_price: p.compare_at_price ?? null,
      cost_price: p.cost_price ?? null, stock: 0, image_url: "", is_active: true,
    });
    setP((s) => ({ ...s, options: next, variants: regenerated }));
  }
  const updateVariant = (i: number, patch: Partial<Variant>) => set("variants", variants.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  const applyToAll = (field: "price" | "stock" | "compare_at_price") => {
    const val = prompt(`Set ${field.replace(/_/g, " ")} for all variants`);
    if (val === null || val === "" || isNaN(Number(val))) return;
    set("variants", variants.map((v) => ({ ...v, [field]: Number(val) })));
  };

  const optionValuesForMedia = useMemo(() => (p.options ?? []).flatMap((o) => o.values.map((v) => v.value)), [p.options]);

  function save() {
    start(async () => {
      const r = await saveProductAction(p);
      if (!r.ok) return toast(r.error, "error");
      toast("Product saved");
      if (!p.id) router.replace(`/admin/products/${r.data!.id}`);
      else { set("slug", r.data!.slug); router.refresh(); }
    });
  }

  return (
    <div className="mx-auto max-w-6xl pb-24">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/products" className="flex h-9 w-9 items-center justify-center rounded-full bg-fill" aria-label="Back"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="headline min-w-0 flex-1 text-[22px] sm:text-[26px]">{p.id ? p.title || "Edit product" : "New product"}</h1>
        {p.id && p.status === "published" && (
          <a href={`${siteUrl}/product/${p.slug}`} target="_blank" rel="noreferrer" className="ml-auto text-[14px] text-accent hover:underline">View in store</a>
        )}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Card>
            <div className="grid gap-4">
              <Field label="Title" htmlFor="title">
                <Input id="title" value={p.title} onChange={(e) => { set("title", e.target.value); if (!p.id) set("slug", slugify(e.target.value)); }} />
              </Field>
              <Field label="Title in Bangla (optional)" htmlFor="title_bn"><Input id="title_bn" value={p.title_bn} onChange={(e) => set("title_bn", e.target.value)} /></Field>
              <Field label="Short description" htmlFor="short" hint="Shown under the price. One or two sentences.">
                <Textarea id="short" value={p.short_description} onChange={(e) => set("short_description", e.target.value)} className="min-h-20" />
              </Field>
              <Field label="Description"><RichText value={p.description_html ?? ""} onChange={(html) => set("description_html", html)} /></Field>
            </div>
          </Card>

          <Card title="Images and videos" description="Drag to reorder. The first image is the cover."
            actions={<Button size="sm" variant="secondary" onClick={() => setPicker(true)}><ImagePlus className="h-4 w-4" />Add</Button>}>
            {media.length ? (
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {media.map((m, i) => (
                  <li key={m.url + i} draggable onDragStart={() => setDragIdx(i)} onDragOver={(e) => e.preventDefault()}
                    onDrop={() => { if (dragIdx !== null && dragIdx !== i) moveMedia(dragIdx, i); setDragIdx(null); }}
                    className={cn("group relative overflow-hidden rounded-[14px] bg-fill", i === 0 && "col-span-2 row-span-2", dragIdx === i && "opacity-50")}>
                    <div className="aspect-square">
                      {m.type === "video"
                        ? <video src={m.url} muted className="h-full w-full object-cover" />
                        // eslint-disable-next-line @next/next/no-img-element
                        : <img src={m.url} alt={m.alt ?? ""} className="h-full w-full object-cover" />}
                    </div>
                    {m.type === "video" && <Film className="absolute bottom-2 left-2 h-4 w-4 text-white drop-shadow" />}
                    <GripVertical className="absolute left-1.5 top-1.5 h-4 w-4 cursor-grab text-white opacity-0 drop-shadow group-hover:opacity-100" />
                    <button type="button" aria-label="Remove" onClick={() => set("media", media.filter((_, j) => j !== i))}
                      className="glass absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full opacity-0 group-hover:opacity-100">
                      <X className="h-3.5 w-3.5" />
                    </button>
                    {optionValuesForMedia.length > 0 && (
                      <select value={m.option_value ?? ""} aria-label="Show for option"
                        onChange={(e) => set("media", media.map((x, j) => (j === i ? { ...x, option_value: e.target.value } : x)))}
                        className="glass absolute inset-x-1.5 bottom-1.5 h-7 rounded-full px-2 text-[11px] opacity-0 group-hover:opacity-100">
                        <option value="">All options</option>
                        {optionValuesForMedia.map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <button type="button" onClick={() => setPicker(true)} className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-line text-fg-muted hover:bg-fill">
                <ImagePlus className="h-6 w-6" />Add images or a video
              </button>
            )}
          </Card>

          <Card title="Options and variants" description="Add options like Size or Color. Every combination becomes a variant with its own price and stock.">
            <div className="space-y-3">
              {options.map((o, oi) => (
                <div key={oi} className="rounded-[14px] bg-fill/60 p-3">
                  <div className="flex gap-2">
                    <Input value={o.name} placeholder="Option name, e.g. Size" className="h-10 max-w-48"
                      onChange={(e) => setOptions(options.map((x, j) => (j === oi ? { ...x, name: e.target.value } : x)))} />
                    <Input placeholder="Type a value and press Enter" className="h-10"
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" && e.key !== ",") return;
                        e.preventDefault();
                        const val = e.currentTarget.value.trim();
                        if (!val || o.values.some((v) => v.value === val)) return;
                        setOptions(options.map((x, j) => (j === oi ? { ...x, values: [...x.values, { value: val, swatch_hex: "", image_url: "" }] } : x)));
                        e.currentTarget.value = "";
                      }} />
                    <Button size="icon" variant="ghost" aria-label="Remove option" onClick={() => setOptions(options.filter((_, j) => j !== oi))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {o.values.map((v, vi) => (
                      <span key={v.value} className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-[13px] shadow-card">
                        {v.value}
                        <button type="button" aria-label={`Remove ${v.value}`} onClick={() => setOptions(options.map((x, j) => (j === oi ? { ...x, values: x.values.filter((_, k) => k !== vi) } : x)))}>
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {options.length < 3 && (
                <Button size="sm" variant="secondary" onClick={() => setOptions([...options, { name: options.length ? "Color" : "Size", values: [] }])}>
                  <Plus className="h-4 w-4" />Add option
                </Button>
              )}
            </div>

            {variants.length > 0 && (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[640px] text-[13px]">
                  <thead className="text-fg-muted">
                    <tr>
                      <th className="py-2 text-left font-medium">Variant</th>
                      <th className="py-2 text-left font-medium"><button type="button" onClick={() => applyToAll("price")} className="hover:text-accent">Price</button></th>
                      <th className="py-2 text-left font-medium"><button type="button" onClick={() => applyToAll("compare_at_price")} className="hover:text-accent">Compare at</button></th>
                      <th className="py-2 text-left font-medium"><button type="button" onClick={() => applyToAll("stock")} className="hover:text-accent">Stock</button></th>
                      <th className="py-2 text-left font-medium">SKU</th>
                      <th className="py-2 text-center font-medium">On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v, i) => (
                      <tr key={comboKey(v.option_values)} className="border-t border-line">
                        <td className="py-2 pr-2 font-medium">{Object.values(v.option_values).join(" / ")}</td>
                        <td className="py-2 pr-2"><Input type="number" min={0} value={v.price} onChange={(e) => updateVariant(i, { price: Number(e.target.value) })} className="h-9 w-24" /></td>
                        <td className="py-2 pr-2"><Input type="number" min={0} value={v.compare_at_price ?? ""} onChange={(e) => updateVariant(i, { compare_at_price: e.target.value === "" ? null : Number(e.target.value) })} className="h-9 w-24" /></td>
                        <td className="py-2 pr-2"><Input type="number" min={0} value={v.stock} onChange={(e) => updateVariant(i, { stock: Number(e.target.value) })} className="h-9 w-20" /></td>
                        <td className="py-2 pr-2"><Input value={v.sku ?? ""} onChange={(e) => updateVariant(i, { sku: e.target.value })} className="h-9 w-32" /></td>
                        <td className="py-2 text-center"><input type="checkbox" checked={v.is_active !== false} onChange={(e) => updateVariant(i, { is_active: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-[12px] text-fg-subtle">Click a column title to set the same value for every variant.</p>
              </div>
            )}
          </Card>

          <Card title="Specifications" actions={<Button size="sm" variant="secondary" onClick={() => set("specs", [...(p.specs ?? []), { label: "", value: "" }])}><Plus className="h-4 w-4" />Add row</Button>}>
            <div className="space-y-2">
              {(p.specs ?? []).map((s, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder="Material" value={s.label} className="h-10 max-w-48" onChange={(e) => set("specs", (p.specs ?? []).map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                  <Input placeholder="Cotton" value={s.value} className="h-10" onChange={(e) => set("specs", (p.specs ?? []).map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                  <Button size="icon" variant="ghost" aria-label="Remove" onClick={() => set("specs", (p.specs ?? []).filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              {!(p.specs ?? []).length && <p className="text-[13px] text-fg-muted">Material, dimensions, power, warranty and so on.</p>}
            </div>
          </Card>

          <Card title="Size guide" description="Optional. Opens in a sheet on the product page.">
            <RichText value={p.size_guide_html ?? ""} onChange={(html) => set("size_guide_html", html)} />
          </Card>

          <Card title="URL"><Field label="URL slug" htmlFor="slug" hint="If you change it, a redirect from the old address is added automatically."><Input id="slug" value={p.slug} onChange={(e) => set("slug", slugify(e.target.value))} /></Field></Card>
          <CodePanel entity="product" id={p.id ?? null} initial={code ?? null} canEdit={!!canCode} scope="this product page" />
          <SeoPanel value={(p.seo ?? {}) as SeoData} onChange={(v) => set("seo", v as never)} fallback={{ title: p.title, description: p.short_description ?? "", slug: p.slug, path: `/product/${p.slug}`, text: p.description_html ?? "", image: p.media?.find((m) => m.type === "image")?.url }} />
        </div>

        <div className="space-y-5">
          <Card title="Status">
            <Select value={p.status} onChange={(e) => set("status", e.target.value as ProductInput["status"])}>
              <option value="draft">Draft</option><option value="published">Published</option><option value="scheduled">Scheduled</option><option value="archived">Archived</option>
            </Select>
            {p.status === "scheduled" && (
              <Input type="datetime-local" className="mt-3" value={p.published_at ?? ""} onChange={(e) => set("published_at", e.target.value)} />
            )}
            <div className="mt-4"><Switch checked={!!p.is_featured} onChange={(v) => set("is_featured", v)} label="Featured on home page" /></div>
          </Card>

          <Card title="Pricing" description={hasVariants ? "Variants set their own prices. The lowest is shown." : undefined}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (৳)" htmlFor="price"><Input id="price" type="number" min={0} value={p.price} disabled={hasVariants} onChange={(e) => set("price", Number(e.target.value))} /></Field>
              <Field label="Compare at (৳)" htmlFor="cmp"><Input id="cmp" type="number" min={0} value={p.compare_at_price ?? ""} disabled={hasVariants} onChange={(e) => set("compare_at_price", e.target.value === "" ? null : Number(e.target.value))} /></Field>
              <Field label="Cost (৳)" htmlFor="cost" hint="Private. Used for profit." className="col-span-2">
                <Input id="cost" type="number" min={0} value={p.cost_price ?? ""} onChange={(e) => set("cost_price", e.target.value === "" ? null : Number(e.target.value))} />
              </Field>
            </div>
          </Card>

          <Card title="Inventory">
            <div className="space-y-3">
              <Switch checked={p.track_inventory !== false} onChange={(v) => set("track_inventory", v)} label="Track stock" />
              {!hasVariants && p.track_inventory !== false && (
                <Field label="Stock" htmlFor="stock"><Input id="stock" type="number" min={0} value={p.stock} onChange={(e) => set("stock", Number(e.target.value))} /></Field>
              )}
              <Switch checked={!!p.allow_backorder} onChange={(v) => set("allow_backorder", v)} label="Sell when out of stock" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="SKU" htmlFor="sku"><Input id="sku" value={p.sku} onChange={(e) => set("sku", e.target.value)} /></Field>
                <Field label="Barcode" htmlFor="barcode"><Input id="barcode" value={p.barcode} onChange={(e) => set("barcode", e.target.value)} /></Field>
                <Field label="Weight (g)" htmlFor="weight"><Input id="weight" type="number" min={0} value={p.weight_grams ?? ""} onChange={(e) => set("weight_grams", e.target.value === "" ? "" : Number(e.target.value))} /></Field>
                <Field label="Low stock alert" htmlFor="low"><Input id="low" type="number" min={0} value={p.low_stock_threshold} onChange={(e) => set("low_stock_threshold", Number(e.target.value))} /></Field>
              </div>
            </div>
          </Card>

          <Card title="Brand">
            <Select value={p.brand_id ?? ""} onChange={(e) => set("brand_id", e.target.value || null)}><option value="">No brand</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>
            <p className="mt-1.5 text-[12px] text-fg-muted">Add brands under Shop, then Brands.</p>
          </Card>

          <Card title="Labels and pre-order">
            <p className="mb-2 text-[13px] text-fg-muted">Labels shown on the product card. New is also added automatically for 14 days.</p>
            <div className="flex flex-wrap gap-1.5">{(["new", "hot", "featured", "bestseller", "limited", "exclusive", "trending"] as const).map((b) => {
              const on = (p.badges ?? []).includes(b);
              return <button key={b} type="button" onClick={() => set("badges", on ? (p.badges ?? []).filter((x) => x !== b) : [...(p.badges ?? []), b].slice(0, 4))} className={cn("rounded-full px-3 py-1 text-[12px] capitalize", on ? "bg-accent text-accent-contrast" : "bg-fill")}>{b}</button>;
            })}</div>
            <div className="mt-4 space-y-3">
              <Switch checked={!!p.preorder} onChange={(v) => set("preorder", v)} label="Pre-order (sell before stock arrives)" />
              {p.preorder && <>
                <Field label="Expected shipping date" htmlFor="po-date"><Input id="po-date" type="date" value={p.preorder_ships_at ?? ""} onChange={(e) => set("preorder_ships_at", e.target.value)} /></Field>
                <Field label="Note for customers" htmlFor="po-note" hint="Tip: combine with an advance payment in Payment rules."><Input id="po-note" value={p.preorder_note ?? ""} onChange={(e) => set("preorder_note", e.target.value)} placeholder="Arrives from our supplier in 2 weeks" /></Field>
              </>}
            </div>
          </Card>

          <Card title="Payment rules" description="When to collect the delivery charge and whether to take an advance for this product.">
            <div className="space-y-3">
              <Field label="Delivery charge" htmlFor="ship-mode">
                <Select id="ship-mode" value={p.shipping_mode ?? "default"} onChange={(e) => set("shipping_mode", e.target.value as "default")}>
                  <option value="default">Store default (Settings)</option>
                  <option value="prepaid">Collect in advance (online)</option>
                  <option value="on_delivery">Collect on delivery</option>
                  <option value="free">Free delivery for this product</option>
                </Select>
              </Field>
              <Field label="Advance payment (%)" htmlFor="adv" hint="Empty = store default. 0 = no advance. Example: 50 takes half the price online, the rest on delivery.">
                <Input id="adv" type="number" min={0} max={100} value={p.advance_percent ?? ""} onChange={(e) => set("advance_percent", e.target.value === "" ? null : Number(e.target.value))} />
              </Field>
              <Switch checked={p.advance_optional !== false} onChange={(v) => set("advance_optional", v)} label="Customer may skip the advance" />
              <p className="text-[12px] text-fg-muted">Advance and prepaid delivery need bKash or SSLCommerz turned on in Payments.</p>
            </div>
          </Card>

          <Card title="Categories">
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {categories.map((c) => {
                const checked = (p.category_ids ?? []).includes(c.id);
                return (
                  <label key={c.id} className={cn("flex items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-[14px] hover:bg-fill", c.parent_id && "pl-6")}>
                    <input type="checkbox" checked={checked} className="h-4 w-4 accent-[var(--accent)]"
                      onChange={() => set("category_ids", checked ? (p.category_ids ?? []).filter((x) => x !== c.id) : [...(p.category_ids ?? []), c.id])} />
                    {c.name}
                  </label>
                );
              })}
            </div>
          </Card>

          <Card title="Tags">
            <Input value={tagInput} placeholder="Type and press Enter" onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== ",") return;
                e.preventDefault();
                const t = tagInput.trim();
                if (t && !(p.tags ?? []).includes(t)) set("tags", [...(p.tags ?? []), t]);
                setTagInput("");
              }} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(p.tags ?? []).map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full bg-fill px-3 py-1 text-[13px]">
                  {t}<button type="button" aria-label={`Remove ${t}`} onClick={() => set("tags", (p.tags ?? []).filter((x) => x !== t))}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {canSave && (
        <div className="glass fixed inset-x-0 bottom-0 z-30 border-x-0 border-b-0 lg:left-64">
          <div className="mx-auto flex max-w-6xl items-center justify-end gap-3 px-5 py-3 md:px-8">
            <Button variant="ghost" onClick={() => router.push("/admin/products")}>Cancel</Button>
            <Button onClick={save} disabled={pending || p.title.trim().length < 2}>{pending ? "Saving" : "Save product"}</Button>
          </div>
        </div>
      )}

      <MediaPicker open={picker} onClose={() => setPicker(false)} folder="products"
        onSelect={(items) => set("media", [...media, ...items.filter((m) => !media.some((x) => x.url === m.url)).map<Media>((m) => ({
          type: m.mime.startsWith("video/") ? "video" : "image", url: m.url, thumbnail_url: m.thumbnail_url, alt: m.alt ?? "", option_value: "",
        }))])} />
    </div>
  );
}
