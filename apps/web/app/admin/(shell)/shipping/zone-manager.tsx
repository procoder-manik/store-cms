"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Card, Field, Input } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { BD_DIVISIONS } from "@/lib/data/bd-locations";
import { formatBDT } from "@/lib/utils";
import { deleteZoneAction, saveZoneAction } from "@/components/admin/settings/actions";

export interface Zone { id?: string; name: string; districts: string[]; base_rate: number; per_kg_rate: number; free_over: number | null; eta_min_days: number; eta_max_days: number; sort_order: number; is_active: boolean }
const blank: Zone = { name: "", districts: [], base_rate: 120, per_kg_rate: 20, free_over: null, eta_min_days: 2, eta_max_days: 4, sort_order: 10, is_active: true };

export function ZoneManager({ zones, canEdit, canDelete }: { zones: Zone[]; canEdit: boolean; canDelete: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [z, setZ] = useState<Zone | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof Zone>(k: K, v: Zone[K]) => setZ((s) => (s ? { ...s, [k]: v } : s));

  return (
    <Card title="Delivery zones" description="A district uses the first zone that lists it. The zone with no districts covers everywhere else."
      actions={canEdit && <Button size="sm" onClick={() => setZ(blank)}><Plus className="h-4 w-4" />Add zone</Button>}>
      <ul>
        {zones.map((zone) => (
          <li key={zone.id} className="flex flex-wrap items-center gap-3 border-b border-line py-3 text-[14px] last:border-0">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{zone.name}{!zone.is_active && <span className="ml-2 text-fg-subtle">Off</span>}</p>
              <p className="truncate text-[12px] text-fg-muted">{zone.districts.length ? zone.districts.join(", ") : "All other districts"}</p>
            </div>
            <span>{formatBDT(zone.base_rate)}{zone.per_kg_rate ? ` + ${formatBDT(zone.per_kg_rate)}/kg` : ""}</span>
            <span className="text-fg-muted">{zone.eta_min_days} to {zone.eta_max_days} days</span>
            {zone.free_over != null && <span className="text-success">Free over {formatBDT(zone.free_over)}</span>}
            {canEdit && <Button size="sm" variant="ghost" onClick={() => setZ(zone)}>Edit</Button>}
          </li>
        ))}
      </ul>
      <Dialog open={!!z} onClose={() => setZ(null)} title={z?.id ? "Edit zone" : "New zone"} className="md:max-w-2xl">
        {z && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" htmlFor="z-name" className="sm:col-span-2"><Input id="z-name" value={z.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="Base charge (৳)" htmlFor="z-base"><Input id="z-base" type="number" min={0} value={z.base_rate} onChange={(e) => set("base_rate", Number(e.target.value))} /></Field>
            <Field label="Each extra kg (৳)" htmlFor="z-kg"><Input id="z-kg" type="number" min={0} value={z.per_kg_rate} onChange={(e) => set("per_kg_rate", Number(e.target.value))} /></Field>
            <Field label="Free delivery over (৳, optional)" htmlFor="z-free"><Input id="z-free" type="number" min={0} value={z.free_over ?? ""} onChange={(e) => set("free_over", e.target.value === "" ? null : Number(e.target.value))} /></Field>
            <Field label="Sort order" htmlFor="z-sort"><Input id="z-sort" type="number" value={z.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} /></Field>
            <Field label="Fastest (days)" htmlFor="z-min"><Input id="z-min" type="number" min={0} value={z.eta_min_days} onChange={(e) => set("eta_min_days", Number(e.target.value))} /></Field>
            <Field label="Slowest (days)" htmlFor="z-max"><Input id="z-max" type="number" min={0} value={z.eta_max_days} onChange={(e) => set("eta_max_days", Number(e.target.value))} /></Field>
            <div className="sm:col-span-2">
              <p className="mb-2 text-[13px] font-medium text-fg-muted">Districts ({z.districts.length || "none = all others"})</p>
              <div className="max-h-56 space-y-3 overflow-y-auto rounded-[12px] bg-fill/60 p-3">
                {BD_DIVISIONS.map((d) => (
                  <div key={d.name}>
                    <p className="text-[12px] font-semibold text-fg-muted">{d.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {d.districts.map((x) => {
                        const on = z.districts.includes(x.name);
                        return <button type="button" key={x.name} onClick={() => set("districts", on ? z.districts.filter((v) => v !== x.name) : [...z.districts, x.name])}
                          className={`rounded-full px-2.5 py-1 text-[12px] ${on ? "bg-accent text-accent-contrast" : "bg-surface"}`}>{x.name}</button>;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2"><Switch checked={z.is_active} onChange={(v) => set("is_active", v)} label="Active" /></div>
            <div className="flex gap-2 sm:col-span-2">
              <Button disabled={pending || z.name.length < 2} onClick={() => start(async () => {
                const r = await saveZoneAction({ ...z });
                if (!r.ok) return toast(r.error, "error");
                toast("Zone saved"); setZ(null); router.refresh();
              })}>Save zone</Button>
              {z.id && canDelete && <Button variant="ghost" className="text-danger" disabled={pending} onClick={() => confirm("Delete this zone?") && start(async () => {
                await deleteZoneAction(z.id!); setZ(null); router.refresh();
              })}>Delete</Button>}
            </div>
          </div>
        )}
      </Dialog>
    </Card>
  );
}
