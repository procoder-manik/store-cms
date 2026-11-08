"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, Printer, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { StatusBadge, STATUS_LABEL } from "@/components/admin/orders/status-badge";
import { formatBDT } from "@/lib/utils";
import { sendToCourierAction, updateOrderStatusAction } from "./actions";
import type { CourierName, OrderStatus } from "@/types/domain";

export interface OrderRow {
  id: string; number: string; name: string; phone: string; status: string; payment: string; method: string; total: number;
  courier: string | null; tracking: string | null; fraud: number; source: string; placedAt: string; district: string;
}
const NEXT: OrderStatus[] = ["confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered", "cancelled"];

export function OrdersTable({ rows, total, page, pageSize, couriers, canUpdate }: {
  rows: OrderRow[]; total: number; page: number; pageSize: number; couriers: CourierName[]; canUpdate: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const all = rows.length > 0 && rows.every((r) => sel.has(r.id));
  const setParam = (k: string, v: string) => {
    const p = new URLSearchParams(params.toString());
    if (v) p.set(k, v); else p.delete(k);
    if (k !== "page") p.delete("page");
    router.push(`/admin/orders?${p}`);
  };
  const bulkStatus = (s: OrderStatus) => start(async () => {
    const r = await updateOrderStatusAction([...sel], s, "", true);
    if (!r.ok) return toast(r.error, "error");
    toast(`Marked ${sel.size} as ${STATUS_LABEL(s)}`); setSel(new Set()); router.refresh();
  });
  const bulkCourier = (c: CourierName) => start(async () => {
    const r = await sendToCourierAction([...sel], c);
    if (!r.ok) return toast(r.error, "error");
    toast(`${r.data!.done} sent to ${c}`);
    r.data!.errors.slice(0, 3).forEach((e) => toast(e, "error"));
    setSel(new Set()); router.refresh();
  });
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <div className="mt-4 flex flex-wrap gap-2">
        <form className="min-w-48 flex-1" onSubmit={(e) => { e.preventDefault(); setParam("q", String(new FormData(e.currentTarget).get("q") ?? "")); }}>
          <Input name="q" defaultValue={params.get("q") ?? ""} placeholder="Order number, phone or name" className="h-10" />
        </form>
        <Select value={params.get("payment") ?? ""} onChange={(e) => setParam("payment", e.target.value)} className="h-10 w-40">
          <option value="">Any payment</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option><option value="pending">Pending</option><option value="failed">Failed</option>
        </Select>
        <Input type="date" aria-label="From" value={params.get("from") ?? ""} onChange={(e) => setParam("from", e.target.value)} className="h-10 w-40" />
        <Input type="date" aria-label="To" value={params.get("to") ?? ""} onChange={(e) => setParam("to", e.target.value)} className="h-10 w-40" />
      </div>

      {sel.size > 0 && canUpdate && (
        <div className="glass sticky top-16 z-20 mt-4 flex flex-wrap items-center gap-2 rounded-[18px] px-4 py-2 shadow-float">
          <span className="text-[13px] font-medium">{sel.size} selected</span>
          <Select aria-label="Set status" defaultValue="" disabled={pending} onChange={(e) => { if (e.target.value) bulkStatus(e.target.value as OrderStatus); e.target.value = ""; }} className="h-9 w-44">
            <option value="" disabled>Set status</option>
            {NEXT.map((s) => <option key={s} value={s}>{STATUS_LABEL(s)}</option>)}
          </Select>
          {couriers.map((c) => (
            <Button key={c} size="sm" variant="ghost" disabled={pending} onClick={() => bulkCourier(c)}><Truck className="h-4 w-4" />{c}</Button>
          ))}
          <a className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[14px] hover:bg-fill" target="_blank" href={`/admin/print/${[...sel].join(",")}?kind=invoice`}><Printer className="h-4 w-4" />Invoices</a>
          <a className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[14px] hover:bg-fill" target="_blank" href={`/admin/print/${[...sel].join(",")}?kind=slip`}>Packing slips</a>
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-[20px] bg-surface shadow-card">
        <table className="w-full min-w-[920px] text-left text-[14px]">
          <thead className="text-[12px] text-fg-muted">
            <tr className="border-b border-line">
              <th className="w-10 px-4 py-3"><input type="checkbox" aria-label="Select all" checked={all} className="h-4 w-4 accent-[var(--accent)]" onChange={() => setSel(all ? new Set() : new Set(rows.map((r) => r.id)))} /></th>
              <th className="py-3 font-medium">Order</th><th className="px-3 py-3 font-medium">Customer</th><th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Payment</th><th className="px-3 py-3 font-medium">Courier</th><th className="px-3 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0 hover:bg-fill/40">
                <td className="px-4 py-3"><input type="checkbox" aria-label={`Select ${r.number}`} checked={sel.has(r.id)} className="h-4 w-4 accent-[var(--accent)]"
                  onChange={() => setSel((s) => { const n = new Set(s); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })} /></td>
                <td className="py-3">
                  <Link href={`/admin/orders/${r.id}`} className="font-medium hover:text-accent">{r.number}</Link>
                  <p className="text-[12px] text-fg-subtle">{new Date(r.placedAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Dhaka" })}{r.source !== "web" && ` · ${r.source.replace("_", " ")}`}</p>
                </td>
                <td className="px-3 py-3">
                  <p className="flex items-center gap-1.5">{r.name}{r.fraud > 0 && <span title={`${r.fraud} cancelled or returned orders`}><AlertTriangle className="h-3.5 w-3.5 text-warning" /></span>}</p>
                  <p className="text-[12px] text-fg-muted">{r.phone} · {r.district}</p>
                </td>
                <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-3 py-3"><StatusBadge status={r.payment} /><p className="mt-0.5 text-[12px] text-fg-subtle">{r.method}</p></td>
                <td className="px-3 py-3 text-[13px] text-fg-muted">{r.courier ? <>{r.courier}<br /><span className="font-mono text-[12px]">{r.tracking}</span></> : "Not booked"}</td>
                <td className="px-3 py-3 text-right font-medium">{formatBDT(r.total)}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7} className="p-12 text-center text-fg-muted">No orders here yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between text-[14px]">
        <span className="text-fg-muted">Page {page} of {pages}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setParam("page", String(page - 1))}>Previous</Button>
          <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setParam("page", String(page + 1))}>Next</Button>
        </div>
      </div>
    </>
  );
}
