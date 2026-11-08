"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { cn, formatBDT } from "@/lib/utils";
import { bulkProductsAction, duplicateProductAction } from "./actions";

export interface ProductRow {
  id: string; title: string; slug: string; status: string; price: number; stock: number; trackInventory: boolean;
  lowStock: boolean; sku: string; source: string; image: string | null; scheduled: boolean;
}

const statusStyle: Record<string, string> = {
  published: "bg-success/15 text-success", draft: "bg-fill text-fg-muted", archived: "bg-fill text-fg-subtle", scheduled: "bg-accent/15 text-accent",
};

export function ProductTable({ rows, total, page, pageSize, categories, filters, canUpdate, canDelete, canCreate }: {
  rows: ProductRow[]; total: number; page: number; pageSize: number; categories: { id: string; name: string }[];
  filters: { q: string; status: string; category: string }; canUpdate: boolean; canDelete: boolean; canCreate: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  const setParam = (k: string, v: string) => {
    const p = new URLSearchParams(params.toString());
    if (v) p.set(k, v); else p.delete(k);
    if (k !== "page") p.delete("page");
    router.push(`/admin/products?${p.toString()}`);
  };
  const all = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const bulk = (op: "publish" | "draft" | "archive" | "delete") => {
    if (op === "delete" && !confirm(`Delete ${selected.size} product(s)?`)) return;
    start(async () => {
      const r = await bulkProductsAction([...selected], op);
      if (!r.ok) return toast(r.error, "error");
      toast(r.message ?? "Done");
      setSelected(new Set());
      router.refresh();
    });
  };
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2">
        <form onSubmit={(e) => { e.preventDefault(); setParam("q", String(new FormData(e.currentTarget).get("q") ?? "")); }} className="flex-1 min-w-48">
          <Input name="q" defaultValue={filters.q} placeholder="Search title or SKU" className="h-10" />
        </form>
        <Select value={filters.status} onChange={(e) => setParam("status", e.target.value)} className="h-10 w-40">
          <option value="">All statuses</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option>
        </Select>
        <Select value={filters.category} onChange={(e) => setParam("category", e.target.value)} className="h-10 w-48">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>

      {selected.size > 0 && (
        <div className="glass sticky top-16 z-20 mt-4 flex flex-wrap items-center gap-2 rounded-full px-4 py-2 shadow-float">
          <span className="text-[13px] font-medium">{selected.size} selected</span>
          {canUpdate && <>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => bulk("publish")}>Publish</Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => bulk("draft")}>Set draft</Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => bulk("archive")}>Archive</Button>
          </>}
          {canDelete && <Button size="sm" variant="ghost" className="text-danger" disabled={pending} onClick={() => bulk("delete")}>Delete</Button>}
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-[20px] bg-surface shadow-card">
        <table className="w-full min-w-[760px] text-left text-[14px]">
          <thead className="text-[12px] text-fg-muted">
            <tr className="border-b border-line">
              <th className="w-10 px-4 py-3">
                <input type="checkbox" aria-label="Select all" checked={all} className="h-4 w-4 accent-[var(--accent)]"
                  onChange={() => setSelected(all ? new Set() : new Set(rows.map((r) => r.id)))} />
              </th>
              <th className="py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const st = r.scheduled ? "scheduled" : r.status;
              return (
                <tr key={r.id} className="border-b border-line last:border-0 hover:bg-fill/40">
                  <td className="px-4 py-3">
                    <input type="checkbox" aria-label={`Select ${r.title}`} checked={selected.has(r.id)} className="h-4 w-4 accent-[var(--accent)]"
                      onChange={() => setSelected((s) => { const n = new Set(s); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })} />
                  </td>
                  <td className="py-3">
                    <Link href={`/admin/products/${r.id}`} className="flex items-center gap-3">
                      {r.image
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={r.image} alt="" className="h-11 w-11 rounded-[10px] object-cover" />
                        : <span className="h-11 w-11 rounded-[10px] bg-fill" />}
                      <span className="min-w-0">
                        <span className="line-clamp-1 font-medium hover:text-accent">{r.title}</span>
                        <span className="text-[12px] text-fg-subtle">{r.sku || "No SKU"}{r.source !== "manual" && ` · ${r.source}`}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3"><span className={cn("rounded-full px-2.5 py-1 text-[12px] font-medium capitalize", statusStyle[st])}>{st}</span></td>
                  <td className="px-4 py-3">{formatBDT(r.price)}</td>
                  <td className={cn("px-4 py-3", r.trackInventory && r.lowStock && "text-danger")}>{r.trackInventory ? r.stock : "Not tracked"}</td>
                  <td className="px-4 py-3 text-right">
                    {canCreate && (
                      <Button size="sm" variant="ghost" aria-label="Duplicate" disabled={pending}
                        onClick={() => start(async () => { const res = await duplicateProductAction(r.id); if (res.ok) router.push(`/admin/products/${res.data!.id}`); else toast(res.error, "error"); })}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={6} className="p-12 text-center text-fg-muted">No products match. Add one or import from Temu or AliExpress.</td></tr>}
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
