"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Card, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { MediaPicker } from "@/components/admin/media-library";
import { formatBDT } from "@/lib/utils";
import { addHomeSectionAction, deleteMarketingAction, saveBannerAction, saveFlashSaleAction, saveHomeSectionsAction, savePopupAction, searchProductsAction } from "./actions";

const local = (d: string | null | undefined) => (d ? new Date(d).toISOString().slice(0, 16) : "");
function useRun() {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string, after?: () => void) => start(async () => {
    const r = await fn();
    if (!r.ok) return toast(r.error ?? "Failed", "error");
    toast(msg); after?.(); router.refresh();
  });
  return { run, pending };
}

function ImageField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {value ? <img src={value} alt="" className="h-14 w-24 rounded-[10px] object-cover" /> : <span className="h-14 w-24 rounded-[10px] bg-fill" />}
        <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}><ImagePlus className="h-4 w-4" />Choose</Button>
        {value && <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")}>Remove</Button>}
      </div>
      <MediaPicker open={open} onClose={() => setOpen(false)} kind="image" multiple={false} folder="marketing" onSelect={(m) => m[0] && onChange(m[0].url)} />
    </Field>
  );
}

// ------------------------------------------------------------------ Banners
type Banner = { id?: string; placement: "hero" | "announcement" | "home_mid"; title: string | null; subtitle: string | null; image_url: string | null; mobile_image_url: string | null; link_url: string | null; sort_order: number; starts_at: string | null; ends_at: string | null; is_active: boolean };
export function BannerManager({ banners, canEdit }: { banners: Banner[]; canEdit: boolean }) {
  const { run, pending } = useRun();
  const [b, setB] = useState<Banner | null>(null);
  const set = <K extends keyof Banner>(k: K, v: Banner[K]) => setB((s) => (s ? { ...s, [k]: v } : s));
  const groups = [["hero", "Home hero slider"], ["announcement", "Announcement bar (top of every page)"]] as const;
  return (
    <div className="space-y-5">
      {groups.map(([placement, title]) => (
        <Card key={placement} title={title} actions={canEdit && <Button size="sm" onClick={() => setB({ placement, title: "", subtitle: "", image_url: "", mobile_image_url: "", link_url: "", sort_order: 0, starts_at: null, ends_at: null, is_active: true })}><Plus className="h-4 w-4" />Add</Button>}>
          <ul>
            {banners.filter((x) => x.placement === placement).map((x) => (
              <li key={x.id} className="flex items-center gap-3 border-b border-line py-2.5 text-[14px] last:border-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {x.image_url && <img src={x.image_url} alt="" className="h-10 w-16 rounded-[8px] object-cover" />}
                <span className="flex-1">{x.title || x.link_url || "Untitled"}{!x.is_active && <span className="ml-2 text-fg-subtle">Off</span>}</span>
                {canEdit && <><Button size="sm" variant="ghost" onClick={() => setB(x)}>Edit</Button>
                  <Button size="sm" variant="ghost" className="text-danger" disabled={pending} onClick={() => confirm("Delete?") && run(() => deleteMarketingAction("banners", x.id!), "Deleted")}><Trash2 className="h-4 w-4" /></Button></>}
              </li>
            ))}
          </ul>
        </Card>
      ))}
      <Dialog open={!!b} onClose={() => setB(null)} title="Banner" className="md:max-w-xl">
        {b && (
          <div className="grid gap-3">
            <Field label={b.placement === "announcement" ? "Message" : "Headline"} htmlFor="bn-t"><Input id="bn-t" value={b.title ?? ""} onChange={(e) => set("title", e.target.value)} placeholder={b.placement === "announcement" ? "Free delivery inside Dhaka over ৳3,000" : ""} /></Field>
            {b.placement !== "announcement" && <>
              <Field label="Subtitle" htmlFor="bn-s"><Input id="bn-s" value={b.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} /></Field>
              <ImageField label="Image (wide, 1920×840 works well)" value={b.image_url ?? ""} onChange={(v) => set("image_url", v)} />
              <ImageField label="Phone image (optional, tall)" value={b.mobile_image_url ?? ""} onChange={(v) => set("mobile_image_url", v)} />
            </>}
            <Field label="Link" htmlFor="bn-l"><Input id="bn-l" value={b.link_url ?? ""} onChange={(e) => set("link_url", e.target.value)} placeholder="/deals" /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Order" htmlFor="bn-o"><Input id="bn-o" type="number" value={b.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} /></Field>
              <Field label="Starts" htmlFor="bn-st"><Input id="bn-st" type="datetime-local" value={local(b.starts_at)} onChange={(e) => set("starts_at", e.target.value || null)} /></Field>
              <Field label="Ends" htmlFor="bn-en"><Input id="bn-en" type="datetime-local" value={local(b.ends_at)} onChange={(e) => set("ends_at", e.target.value || null)} /></Field>
            </div>
            <Switch checked={b.is_active} onChange={(v) => set("is_active", v)} label="Active" />
            <Button disabled={pending} onClick={() => run(() => saveBannerAction({ ...b, title: b.title ?? "", subtitle: b.subtitle ?? "", image_url: b.image_url ?? "", mobile_image_url: b.mobile_image_url ?? "", link_url: b.link_url ?? "", id: b.id }), "Saved", () => setB(null))}>Save</Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}

// ------------------------------------------------------------------ Popups
type Popup = { id?: string; title: string; body: string | null; image_url: string | null; cta_label: string | null; cta_url: string | null; coupon_id: string | null; trigger: { type: "delay" | "exit" | "scroll" | "entry"; value: number }; targeting: { pages: string[]; devices: string[] }; frequency: "once_per_session"; starts_at: string | null; ends_at: string | null; is_active: boolean; views: number; clicks: number };
export function PopupManager({ popups, coupons, canEdit }: { popups: Popup[]; coupons: { id: string; code: string }[]; canEdit: boolean }) {
  const { run, pending } = useRun();
  const [p, setP] = useState<Popup | null>(null);
  const set = <K extends keyof Popup>(k: K, v: Popup[K]) => setP((s) => (s ? { ...s, [k]: v } : s));
  return (
    <Card title="Popups" description="Shown once per visitor by default. Only active popups within their dates appear."
      actions={canEdit && <Button size="sm" onClick={() => setP({ title: "", body: "", image_url: "", cta_label: "Shop now", cta_url: "/deals", coupon_id: null, trigger: { type: "delay", value: 5 }, targeting: { pages: ["*"], devices: ["all"] }, frequency: "once_per_session", starts_at: null, ends_at: null, is_active: false, views: 0, clicks: 0 })}><Plus className="h-4 w-4" />New popup</Button>}>
      <ul>
        {popups.map((x) => (
          <li key={x.id} className="flex items-center gap-3 border-b border-line py-2.5 text-[14px] last:border-0">
            <span className="flex-1">{x.title}<span className={`ml-2 text-[12px] ${x.is_active ? "text-success" : "text-fg-subtle"}`}>{x.is_active ? "Live" : "Off"}</span></span>
            <span className="text-[12px] text-fg-muted">{x.views} views · {x.clicks} clicks{x.views ? ` (${Math.round((x.clicks / x.views) * 100)}%)` : ""}</span>
            {canEdit && <><Button size="sm" variant="ghost" onClick={() => setP(x)}>Edit</Button><Button size="sm" variant="ghost" className="text-danger" onClick={() => confirm("Delete?") && run(() => deleteMarketingAction("popups", x.id!), "Deleted")}><Trash2 className="h-4 w-4" /></Button></>}
          </li>
        ))}
        {!popups.length && <li className="py-6 text-center text-fg-muted">No popups yet.</li>}
      </ul>
      <Dialog open={!!p} onClose={() => setP(null)} title="Popup" className="md:max-w-xl">
        {p && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Headline" htmlFor="pp-t" className="sm:col-span-2"><Input id="pp-t" value={p.title} onChange={(e) => set("title", e.target.value)} placeholder="Get 10% off your first order" /></Field>
            <Field label="Message" htmlFor="pp-b" className="sm:col-span-2"><Textarea id="pp-b" value={p.body ?? ""} onChange={(e) => set("body", e.target.value)} className="min-h-16" /></Field>
            <div className="sm:col-span-2"><ImageField label="Image (optional)" value={p.image_url ?? ""} onChange={(v) => set("image_url", v)} /></div>
            <Field label="Coupon to show (optional)" htmlFor="pp-c"><Select id="pp-c" value={p.coupon_id ?? ""} onChange={(e) => set("coupon_id", e.target.value || null)}><option value="">None</option>{coupons.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}</Select></Field>
            <Field label="Button text" htmlFor="pp-cl"><Input id="pp-cl" value={p.cta_label ?? ""} onChange={(e) => set("cta_label", e.target.value)} /></Field>
            <Field label="Button link" htmlFor="pp-cu"><Input id="pp-cu" value={p.cta_url ?? ""} onChange={(e) => set("cta_url", e.target.value)} /></Field>
            <Field label="Show when" htmlFor="pp-tr">
              <Select id="pp-tr" value={p.trigger.type} onChange={(e) => set("trigger", { ...p.trigger, type: e.target.value as Popup["trigger"]["type"] })}>
                <option value="delay">After some seconds</option><option value="scroll">After scrolling (%)</option><option value="exit">When leaving (desktop)</option><option value="entry">Right away</option>
              </Select>
            </Field>
            {(p.trigger.type === "delay" || p.trigger.type === "scroll") && <Field label={p.trigger.type === "delay" ? "Seconds" : "Scroll %"} htmlFor="pp-tv"><Input id="pp-tv" type="number" min={0} value={p.trigger.value} onChange={(e) => set("trigger", { ...p.trigger, value: Number(e.target.value) })} /></Field>}
            <Field label="How often" htmlFor="pp-f"><Select id="pp-f" value={p.frequency} onChange={(e) => set("frequency", e.target.value as "once_per_session")}><option value="once_per_session">Once per visit</option><option value="once_per_day">Once a day</option><option value="once_ever">Only once</option><option value="every_visit">Every page</option></Select></Field>
            <Field label="Devices" htmlFor="pp-d"><Select id="pp-d" value={p.targeting.devices[0] ?? "all"} onChange={(e) => set("targeting", { ...p.targeting, devices: [e.target.value] })}><option value="all">All</option><option value="mobile">Phones</option><option value="desktop">Computers</option></Select></Field>
            <Field label="Pages (comma separated, * = all)" htmlFor="pp-pg" className="sm:col-span-2"><Input id="pp-pg" value={p.targeting.pages.join(", ")} onChange={(e) => set("targeting", { ...p.targeting, pages: e.target.value.split(",") })} placeholder="*, /shop, /product/*" /></Field>
            <Field label="Starts" htmlFor="pp-st"><Input id="pp-st" type="datetime-local" value={local(p.starts_at)} onChange={(e) => set("starts_at", e.target.value || null)} /></Field>
            <Field label="Ends" htmlFor="pp-en"><Input id="pp-en" type="datetime-local" value={local(p.ends_at)} onChange={(e) => set("ends_at", e.target.value || null)} /></Field>
            <div className="sm:col-span-2"><Switch checked={p.is_active} onChange={(v) => set("is_active", v)} label="Live" /></div>
            <Button className="sm:col-span-2" disabled={pending} onClick={() => run(() => savePopupAction({
              id: p.id, title: p.title, body: p.body ?? "", image_url: p.image_url ?? "", cta_label: p.cta_label ?? "", cta_url: p.cta_url ?? "", coupon_id: p.coupon_id,
              trigger_type: p.trigger.type, trigger_value: p.trigger.value, pages: p.targeting.pages.join(","), devices: (p.targeting.devices[0] ?? "all") as "all",
              frequency: p.frequency, starts_at: p.starts_at, ends_at: p.ends_at, is_active: p.is_active,
            }), "Saved", () => setP(null))}>Save popup</Button>
          </div>
        )}
      </Dialog>
    </Card>
  );
}

// ------------------------------------------------------------------ Flash sales
type SaleItem = { product_id: string; sale_price: number; quantity_limit: number | null; sold?: number; products?: { title: string; price: number } | null; title?: string; price?: number };
type Sale = { id?: string; title: string; starts_at: string; ends_at: string; is_active: boolean; flash_sale_items: SaleItem[] };
export function FlashSaleManager({ sales, canEdit }: { sales: Sale[]; canEdit: boolean }) {
  const { run, pending } = useRun();
  const [s, setS] = useState<Sale | null>(null);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ id: string; title: string; price: number }[]>([]);
  useEffect(() => { const id = setTimeout(async () => setFound(q.length > 1 ? await searchProductsAction(q) : []), 250); return () => clearTimeout(id); }, [q]);
  const now = Date.now();
  return (
    <Card title="Flash sales" description="Sale prices apply automatically at checkout during the sale and show a countdown on the home page."
      actions={canEdit && <Button size="sm" onClick={() => setS({ title: "Flash sale", starts_at: new Date().toISOString(), ends_at: new Date(Date.now() + 86400000).toISOString(), is_active: true, flash_sale_items: [] })}><Plus className="h-4 w-4" />New sale</Button>}>
      <ul>
        {sales.map((x) => {
          const live = x.is_active && new Date(x.starts_at).getTime() < now && new Date(x.ends_at).getTime() > now;
          return (
            <li key={x.id} className="flex items-center gap-3 border-b border-line py-2.5 text-[14px] last:border-0">
              <span className="flex-1">{x.title}<span className={`ml-2 text-[12px] ${live ? "text-success" : "text-fg-subtle"}`}>{live ? "Live" : new Date(x.starts_at).getTime() > now ? "Scheduled" : "Ended"}</span></span>
              <span className="text-[12px] text-fg-muted">{x.flash_sale_items.length} products · ends {new Date(x.ends_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</span>
              {canEdit && <><Button size="sm" variant="ghost" onClick={() => setS({ ...x, flash_sale_items: x.flash_sale_items.map((i) => ({ ...i, title: i.products?.title, price: i.products?.price })) })}>Edit</Button>
                <Button size="sm" variant="ghost" className="text-danger" onClick={() => confirm("Delete?") && run(() => deleteMarketingAction("flash_sales", x.id!), "Deleted")}><Trash2 className="h-4 w-4" /></Button></>}
            </li>
          );
        })}
      </ul>
      <Dialog open={!!s} onClose={() => setS(null)} title="Flash sale" className="md:max-w-2xl">
        {s && (
          <div className="grid gap-3">
            <Field label="Title" htmlFor="fs-t"><Input id="fs-t" value={s.title} onChange={(e) => setS({ ...s, title: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Starts" htmlFor="fs-s"><Input id="fs-s" type="datetime-local" value={local(s.starts_at)} onChange={(e) => setS({ ...s, starts_at: e.target.value })} /></Field>
              <Field label="Ends" htmlFor="fs-e"><Input id="fs-e" type="datetime-local" value={local(s.ends_at)} onChange={(e) => setS({ ...s, ends_at: e.target.value })} /></Field>
            </div>
            <div className="relative">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Add product: search by name" />
              {found.length > 0 && (
                <ul className="glass absolute inset-x-0 top-12 z-10 rounded-[14px] p-1 shadow-float">
                  {found.map((f) => <li key={f.id}><button type="button" className="w-full rounded-[10px] p-2 text-left text-[14px] hover:bg-fill" onClick={() => { if (!s.flash_sale_items.some((i) => i.product_id === f.id)) setS({ ...s, flash_sale_items: [...s.flash_sale_items, { product_id: f.id, title: f.title, price: f.price, sale_price: Math.round(f.price * 0.8), quantity_limit: null }] }); setQ(""); }}>{f.title} · {formatBDT(f.price)}</button></li>)}
                </ul>
              )}
            </div>
            <ul>
              {s.flash_sale_items.map((i, n) => (
                <li key={i.product_id} className="flex items-center gap-2 border-b border-line py-2 text-[14px] last:border-0">
                  <span className="flex-1 truncate">{i.title}<span className="ml-1 text-fg-subtle">{i.price ? formatBDT(i.price) : ""}</span></span>
                  <Input type="number" min={1} aria-label="Sale price" value={i.sale_price} className="h-9 w-24" onChange={(e) => setS({ ...s, flash_sale_items: s.flash_sale_items.map((x, j) => (j === n ? { ...x, sale_price: Number(e.target.value) } : x)) })} />
                  <Input type="number" min={1} aria-label="Quantity limit" placeholder="Limit" value={i.quantity_limit ?? ""} className="h-9 w-20" onChange={(e) => setS({ ...s, flash_sale_items: s.flash_sale_items.map((x, j) => (j === n ? { ...x, quantity_limit: e.target.value ? Number(e.target.value) : null } : x)) })} />
                  <button type="button" aria-label="Remove" onClick={() => setS({ ...s, flash_sale_items: s.flash_sale_items.filter((_, j) => j !== n) })}><Trash2 className="h-4 w-4 text-fg-subtle" /></button>
                </li>
              ))}
            </ul>
            <Switch checked={s.is_active} onChange={(v) => setS({ ...s, is_active: v })} label="Active" />
            <Button disabled={pending} onClick={() => run(() => saveFlashSaleAction({ id: s.id, title: s.title, starts_at: s.starts_at, ends_at: s.ends_at, is_active: s.is_active, items: s.flash_sale_items.map((i) => ({ product_id: i.product_id, sale_price: i.sale_price, quantity_limit: i.quantity_limit })) }), "Saved", () => setS(null))}>Save sale</Button>
          </div>
        )}
      </Dialog>
    </Card>
  );
}

// ------------------------------------------------------------------ Home sections
type Section = { id: string; type: string; title: string | null; config: { source?: string; limit?: number }; sort_order: number; is_active: boolean };
const NAMES: Record<string, string> = { hero: "Hero", perks: "Store promises", categories: "Categories", flash_sale: "Flash sale", products: "Product row", newsletter: "Newsletter" };
export function HomeEditor({ sections, canEdit }: { sections: Section[]; canEdit: boolean }) {
  const { run, pending } = useRun();
  const [rows, setRows] = useState(sections);
  useEffect(() => setRows(sections), [sections]);
  const move = (i: number, d: -1 | 1) => setRows((r) => { const n = [...r]; const j = i + d; if (j < 0 || j >= n.length) return r; [n[i], n[j]] = [n[j]!, n[i]!]; return n; });
  const upd = (i: number, patch: Partial<Section>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <Card title="Home page sections" description="Reorder, rename and switch sections on or off.">
      <ul className="space-y-2">
        {rows.map((s, i) => (
          <li key={s.id} className="flex flex-wrap items-center gap-2 rounded-[14px] bg-fill/50 p-3 text-[14px]">
            <div className="flex flex-col">
              <button type="button" aria-label="Move up" disabled={!canEdit} onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></button>
              <button type="button" aria-label="Move down" disabled={!canEdit} onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></button>
            </div>
            <span className="w-32 font-medium">{NAMES[s.type] ?? s.type}</span>
            {!["hero", "perks", "newsletter"].includes(s.type) && <Input value={s.title ?? ""} placeholder="Title" onChange={(e) => upd(i, { title: e.target.value })} className="h-9 max-w-56" />}
            {s.type === "products" && (
              <>
                <Select value={s.config.source ?? "newest"} onChange={(e) => upd(i, { config: { ...s.config, source: e.target.value } })} className="h-9 w-40">
                  <option value="newest">Newest</option><option value="best_selling">Best selling</option><option value="featured">Featured</option><option value="on_sale">On sale</option>
                </Select>
                <Input type="number" min={2} max={24} value={s.config.limit ?? 8} onChange={(e) => upd(i, { config: { ...s.config, limit: Number(e.target.value) } })} className="h-9 w-20" aria-label="How many" />
              </>
            )}
            <span className="ml-auto"><Switch checked={s.is_active} onChange={(v) => upd(i, { is_active: v })} /></span>
            {canEdit && <button type="button" aria-label="Delete" onClick={() => confirm("Remove section?") && run(() => deleteMarketingAction("home_sections", s.id), "Removed")}><Trash2 className="h-4 w-4 text-fg-subtle" /></button>}
          </li>
        ))}
      </ul>
      {canEdit && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={pending} onClick={() => run(() => saveHomeSectionsAction(rows.map((r, i) => ({ id: r.id, title: r.title, is_active: r.is_active, sort_order: i + 1, config: r.config }))), "Home page saved")}>Save changes</Button>
          <Select defaultValue="" onChange={(e) => { if (e.target.value) run(() => addHomeSectionAction(e.target.value), "Section added"); e.target.value = ""; }} className="h-11 w-48">
            <option value="" disabled>Add section</option>{Object.entries(NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
      )}
    </Card>
  );
}
