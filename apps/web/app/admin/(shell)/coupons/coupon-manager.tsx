"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { formatBDT } from "@/lib/utils";
import { deleteCouponAction, saveCouponAction, type CouponInput } from "./actions";

export interface Coupon {
  id: string; code: string; description: string | null; type: "percentage" | "fixed" | "free_shipping"; value: number; min_order: number;
  max_discount: number | null; usage_limit: number | null; per_user_limit: number | null; used_count: number; starts_at: string | null; ends_at: string | null;
  applies_to: { product_ids?: string[]; category_ids?: string[] }; first_order_only: boolean; is_public: boolean; is_active: boolean; given: number;
}
const toLocal = (d: string | null) => (d ? new Date(d).toISOString().slice(0, 16) : "");
const blank: CouponInput = { code: "", description: "", type: "percentage", value: 10, min_order: 0, max_discount: null, usage_limit: null, per_user_limit: 1, starts_at: null, ends_at: null, product_ids: [], category_ids: [], first_order_only: false, is_public: false, is_active: true };

export function CouponManager({ coupons, categories, canCreate, canUpdate, canDelete }: { coupons: Coupon[]; categories: { id: string; name: string }[]; canCreate: boolean; canUpdate: boolean; canDelete: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<CouponInput | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof CouponInput>(k: K, v: CouponInput[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const num = (v: string) => (v === "" ? null : Number(v));
  const describe = (c: Coupon) => c.type === "percentage" ? `${c.value}% off${c.max_discount ? `, up to ${formatBDT(c.max_discount)}` : ""}` : c.type === "fixed" ? `${formatBDT(c.value)} off` : "Free delivery";
  const live = (c: Coupon) => c.is_active && (!c.ends_at || new Date(c.ends_at) > new Date()) && (!c.usage_limit || c.used_count < c.usage_limit);

  return (
    <>
      {canCreate && <Button className="mt-6" onClick={() => setForm(blank)}><Plus className="h-4 w-4" />New coupon</Button>}
      <div className="mt-6 overflow-x-auto rounded-[20px] bg-surface shadow-card">
        <table className="w-full min-w-[720px] text-left text-[14px]">
          <thead className="text-[12px] text-fg-muted"><tr className="border-b border-line"><th className="px-5 py-3 font-medium">Code</th><th className="py-3 font-medium">Discount</th><th className="py-3 font-medium">Used</th><th className="py-3 font-medium">Given away</th><th className="py-3 font-medium">Ends</th><th /></tr></thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-b border-line last:border-0">
                <td className="px-5 py-3"><span className="font-mono font-medium">{c.code}</span> <span className={`ml-2 text-[12px] ${live(c) ? "text-success" : "text-fg-subtle"}`}>{live(c) ? "Active" : "Off"}</span>{c.is_public && <span className="ml-2 text-[12px] text-accent">Public</span>}</td>
                <td className="py-3">{describe(c)}{c.min_order > 0 && <span className="text-fg-muted"> · min {formatBDT(c.min_order)}</span>}</td>
                <td className="py-3">{c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ""}</td>
                <td className="py-3">{formatBDT(c.given)}</td>
                <td className="py-3 text-fg-muted">{c.ends_at ? new Date(c.ends_at).toLocaleDateString("en-GB") : "Never"}</td>
                <td className="px-3 py-3 text-right">
                  {canUpdate && <Button size="sm" variant="ghost" onClick={() => setForm({ id: c.id, code: c.code, description: c.description ?? "", type: c.type, value: Number(c.value), min_order: Number(c.min_order), max_discount: c.max_discount, usage_limit: c.usage_limit, per_user_limit: c.per_user_limit, starts_at: toLocal(c.starts_at) || null, ends_at: toLocal(c.ends_at) || null, product_ids: c.applies_to?.product_ids ?? [], category_ids: c.applies_to?.category_ids ?? [], first_order_only: c.first_order_only, is_public: c.is_public, is_active: c.is_active })}>Edit</Button>}
                  {canDelete && <Button size="sm" variant="ghost" className="text-danger" disabled={pending} onClick={() => confirm(`Delete ${c.code}?`) && start(async () => { const r = await deleteCouponAction(c.id); toast(r.ok ? r.message ?? "Deleted" : r.error, r.ok ? "success" : "error"); router.refresh(); })}>Delete</Button>}
                </td>
              </tr>
            ))}
            {!coupons.length && <tr><td colSpan={6} className="p-10 text-center text-fg-muted">No coupons yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit coupon" : "New coupon"} className="md:max-w-2xl">
        {form && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Code" htmlFor="cp-code"><Input id="cp-code" value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="EID20" /></Field>
            <Field label="Type" htmlFor="cp-type">
              <Select id="cp-type" value={form.type} onChange={(e) => set("type", e.target.value as CouponInput["type"])}>
                <option value="percentage">Percentage off</option><option value="fixed">Fixed amount off</option><option value="free_shipping">Free delivery</option>
              </Select>
            </Field>
            {form.type !== "free_shipping" && <Field label={form.type === "percentage" ? "Percent" : "Amount (৳)"} htmlFor="cp-val"><Input id="cp-val" type="number" min={0} value={form.value} onChange={(e) => set("value", Number(e.target.value))} /></Field>}
            {form.type === "percentage" && <Field label="Max discount (৳, optional)" htmlFor="cp-max"><Input id="cp-max" type="number" min={0} value={form.max_discount ?? ""} onChange={(e) => set("max_discount", num(e.target.value))} /></Field>}
            <Field label="Minimum order (৳)" htmlFor="cp-min"><Input id="cp-min" type="number" min={0} value={form.min_order} onChange={(e) => set("min_order", Number(e.target.value))} /></Field>
            <Field label="Total uses (empty = unlimited)" htmlFor="cp-lim"><Input id="cp-lim" type="number" min={1} value={form.usage_limit ?? ""} onChange={(e) => set("usage_limit", num(e.target.value))} /></Field>
            <Field label="Uses per customer" htmlFor="cp-pu"><Input id="cp-pu" type="number" min={1} value={form.per_user_limit ?? ""} onChange={(e) => set("per_user_limit", num(e.target.value))} /></Field>
            <Field label="Starts" htmlFor="cp-st"><Input id="cp-st" type="datetime-local" value={form.starts_at ?? ""} onChange={(e) => set("starts_at", e.target.value || null)} /></Field>
            <Field label="Ends" htmlFor="cp-en"><Input id="cp-en" type="datetime-local" value={form.ends_at ?? ""} onChange={(e) => set("ends_at", e.target.value || null)} /></Field>
            <Field label="Only for categories (none = all)" className="sm:col-span-2">
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                {categories.map((c) => {
                  const on = (form.category_ids ?? []).includes(c.id);
                  return <button type="button" key={c.id} onClick={() => set("category_ids", on ? form.category_ids!.filter((x) => x !== c.id) : [...(form.category_ids ?? []), c.id])} className={`rounded-full px-3 py-1 text-[12px] ${on ? "bg-accent text-accent-contrast" : "bg-fill"}`}>{c.name}</button>;
                })}
              </div>
            </Field>
            <Field label="Note (shown to customers when public)" htmlFor="cp-desc" className="sm:col-span-2"><Textarea id="cp-desc" value={form.description} onChange={(e) => set("description", e.target.value)} className="min-h-16" /></Field>
            <Switch checked={!!form.first_order_only} onChange={(v) => set("first_order_only", v)} label="First order only" />
            <Switch checked={!!form.is_public} onChange={(v) => set("is_public", v)} label="Public (chatbot can share it)" />
            <Switch checked={!!form.is_active} onChange={(v) => set("is_active", v)} label="Active" />
            <Button className="sm:col-span-2" disabled={pending} onClick={() => start(async () => {
              const r = await saveCouponAction(form);
              if (!r.ok) return toast(r.error, "error");
              toast("Coupon saved"); setForm(null); router.refresh();
            })}>Save coupon</Button>
          </div>
        )}
      </Dialog>
    </>
  );
}
