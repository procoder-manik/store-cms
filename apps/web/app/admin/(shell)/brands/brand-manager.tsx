"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { MediaPicker } from "@/components/admin/media-library";
import { deleteBrandAction, saveBrandAction } from "./actions";

type B = { id?: string; name: string; slug: string; logo_url: string; is_active: boolean; count?: number };

export function BrandManager({ brands, canEdit, canDelete }: { brands: B[]; canEdit: boolean; canDelete: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [b, setB] = useState<B | null>(null);
  const [picker, setPicker] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      {canEdit && <Button className="mt-6" onClick={() => setB({ name: "", slug: "", logo_url: "", is_active: true })}><Plus className="h-4 w-4" />New brand</Button>}
      <ul className="mt-6 overflow-hidden rounded-[20px] bg-surface shadow-card">
        {brands.map((x) => (
          <li key={x.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {x.logo_url ? <img src={x.logo_url} alt="" className="h-10 w-10 rounded-[8px] object-contain" /> : <span className="h-10 w-10 rounded-[8px] bg-fill" />}
            <div className="min-w-0 flex-1"><p className="font-medium">{x.name}{!x.is_active && <span className="ml-2 text-[12px] text-fg-subtle">Hidden</span>}</p><p className="text-[12px] text-fg-muted">/shop?brand={x.slug} · {x.count} products</p></div>
            {canEdit && <Button size="sm" variant="ghost" onClick={() => setB(x)}>Edit</Button>}
            {canDelete && <Button size="sm" variant="ghost" className="text-danger" onClick={() => confirm(`Delete ${x.name}? Products keep existing, only the brand is removed.`) && start(async () => { await deleteBrandAction(x.id!); router.refresh(); })}>Delete</Button>}
          </li>
        ))}
        {!brands.length && <li className="p-10 text-center text-fg-muted">No brands yet.</li>}
      </ul>
      <Dialog open={!!b} onClose={() => setB(null)} title="Brand">
        {b && (
          <div className="space-y-3">
            <Field label="Name" htmlFor="br-n"><Input id="br-n" value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} /></Field>
            <Field label="Address (optional)" htmlFor="br-s"><Input id="br-s" value={b.slug} onChange={(e) => setB({ ...b, slug: e.target.value })} placeholder="auto from the name" /></Field>
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {b.logo_url ? <img src={b.logo_url} alt="" className="h-14 w-14 rounded-[10px] object-contain" /> : <span className="h-14 w-14 rounded-[10px] bg-fill" />}
              <Button size="sm" variant="secondary" type="button" onClick={() => setPicker(true)}><ImagePlus className="h-4 w-4" />Logo</Button>
              <MediaPicker open={picker} onClose={() => setPicker(false)} multiple={false} folder="brands" onSelect={(m) => m[0] && setB({ ...b, logo_url: m[0].url })} />
            </div>
            <Switch checked={b.is_active} onChange={(v) => setB({ ...b, is_active: v })} label="Visible" />
            <Button className="w-full" disabled={pending} onClick={() => start(async () => { const r = await saveBrandAction(b); if (!r.ok) return toast(r.error, "error"); toast("Saved"); setB(null); router.refresh(); })}>Save</Button>
          </div>
        )}
      </Dialog>
    </>
  );
}
