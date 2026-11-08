"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { deleteTagAction, mergeTagsAction, renameTagAction } from "./actions";

type T = { id: string; name: string; slug: string; count: number };

export function TagManager({ tags, canEdit, canDelete }: { tags: T[]; canEdit: boolean; canDelete: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [edit, setEdit] = useState<{ id: string; name: string } | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) => start(async () => { const r = await fn(); toast(r.ok ? msg : r.error ?? "Failed", r.ok ? "success" : "error"); if (r.ok) { setEdit(null); router.refresh(); } });
  return (
    <ul className="mt-6 overflow-hidden rounded-[20px] bg-surface shadow-card">
      {tags.map((t) => (
        <li key={t.id} className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 last:border-0">
          {edit?.id === t.id ? (
            <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); run(() => renameTagAction(t.id, edit.name), "Renamed"); }}>
              <input autoFocus value={edit.name} onChange={(e) => setEdit({ id: t.id, name: e.target.value })} className="h-9 flex-1 rounded-[10px] bg-fill px-3 text-[14px] outline-none" aria-label="Tag name" />
              <Button size="sm" type="submit" disabled={pending}>Save</Button><Button size="sm" type="button" variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
            </form>
          ) : (
            <>
              <div className="min-w-0 flex-1"><p className="font-medium">#{t.name}</p><p className="text-[12px] text-fg-muted">{t.count} products · /shop?tag={t.slug}</p></div>
              {canEdit && <Select aria-label="Merge into" defaultValue="" className="h-9 w-36 text-[13px]" onChange={(e) => { if (e.target.value && confirm(`Move all products from #${t.name} to the chosen tag and delete #${t.name}?`)) run(() => mergeTagsAction(t.id, e.target.value), "Merged"); e.target.value = ""; }}>
                <option value="" disabled>Merge into</option>{tags.filter((x) => x.id !== t.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </Select>}
              {canEdit && <Button size="sm" variant="ghost" onClick={() => setEdit({ id: t.id, name: t.name })}>Rename</Button>}
              {canDelete && <Button size="sm" variant="ghost" className="text-danger" onClick={() => confirm(`Delete #${t.name}?`) && run(() => deleteTagAction(t.id), "Deleted")}>Delete</Button>}
            </>
          )}
        </li>
      ))}
      {!tags.length && <li className="p-10 text-center text-fg-muted">No tags yet. Add tags in the product editor.</li>}
    </ul>
  );
}
