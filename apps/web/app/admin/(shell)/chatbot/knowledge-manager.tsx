"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Card, Field, Input, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { deleteKnowledgeAction, saveKnowledgeAction } from "./actions";

type K = { id?: string; title: string; content: string; is_active: boolean };

export function KnowledgeManager({ items, canEdit }: { items: K[]; canEdit: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [k, setK] = useState<K | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card title="Extra knowledge" description="Policies, warranty, store hours, how to pay with bKash, anything customers ask. The assistant reads this on every relevant question."
      actions={canEdit && <Button size="sm" onClick={() => setK({ title: "", content: "", is_active: true })}><Plus className="h-4 w-4" />Add</Button>}>
      <ul>
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-3 border-b border-line py-2.5 text-[14px] last:border-0">
            <div className="min-w-0 flex-1"><p className="font-medium">{it.title}{!it.is_active && <span className="ml-2 text-[12px] text-fg-subtle">Off</span>}</p><p className="truncate text-[12px] text-fg-muted">{it.content}</p></div>
            {canEdit && <><Button size="sm" variant="ghost" onClick={() => setK(it)}>Edit</Button><Button size="sm" variant="ghost" className="text-danger" onClick={() => start(async () => { await deleteKnowledgeAction(it.id!); router.refresh(); })}>Delete</Button></>}
          </li>
        ))}
      </ul>
      <Dialog open={!!k} onClose={() => setK(null)} title="Knowledge">
        {k && (
          <div className="space-y-3">
            <Field label="Topic" htmlFor="kb-t"><Input id="kb-t" value={k.title} onChange={(e) => setK({ ...k, title: e.target.value })} /></Field>
            <Field label="What the assistant should know" htmlFor="kb-c"><Textarea id="kb-c" value={k.content} onChange={(e) => setK({ ...k, content: e.target.value })} className="min-h-40" /></Field>
            <Switch checked={k.is_active} onChange={(v) => setK({ ...k, is_active: v })} label="Active" />
            <Button className="w-full" disabled={pending} onClick={() => start(async () => { const r = await saveKnowledgeAction(k); if (!r.ok) return toast(r.error, "error"); toast("Saved"); setK(null); router.refresh(); })}>Save</Button>
          </div>
        )}
      </Dialog>
    </Card>
  );
}
