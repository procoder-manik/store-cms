"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { PostType } from "@/lib/content/post-types";
import { deleteCategoryAction, deletePostAction, saveCategoryAction, savePostTypesAction } from "./actions";

export function DeletePostButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return <Button size="sm" variant="ghost" className="text-danger" disabled={pending} onClick={() => confirm("Delete this post?") && start(async () => { await deletePostAction(id); router.refresh(); })}>Delete</Button>;
}

export function CategoryManager({ postType, categories, canEdit }: { postType: string; categories: { id: string; name: string }[]; canEdit: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  return (
    <Card title="Categories">
      <ul className="space-y-1">{categories.map((c) => (
        <li key={c.id} className="flex items-center justify-between rounded-[10px] px-2 py-1.5 text-[14px] hover:bg-fill">{c.name}
          {canEdit && <button aria-label="Delete" onClick={() => confirm(`Delete ${c.name}?`) && start(async () => { await deleteCategoryAction(c.id); router.refresh(); })}><Trash2 className="h-4 w-4 text-fg-subtle" /></button>}
        </li>))}
        {!categories.length && <li className="text-[13px] text-fg-muted">No categories yet.</li>}
      </ul>
      {canEdit && (
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveCategoryAction(postType, name); if (!r.ok) return toast(r.error, "error"); setName(""); router.refresh(); }); }}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category" className="h-9" />
          <Button size="sm" type="submit" disabled={pending || name.trim().length < 2}><Plus className="h-4 w-4" /></Button>
        </form>
      )}
    </Card>
  );
}

export function PostTypesEditor({ types, canEdit }: { types: PostType[]; canEdit: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [list, setList] = useState<PostType[]>(types);
  const [pending, start] = useTransition();
  const up = (i: number, patch: Partial<PostType>) => setList((l) => l.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  return (
    <Card title="Post types" description="Each type gets its own section on the site, for example /news or /guides, with its own categories and layout.">
      <div className="space-y-2">{list.map((t, i) => (
        <div key={i} className="grid gap-2 rounded-[14px] border border-line p-3 md:grid-cols-[1fr_1fr_140px_150px_auto]">
          <Input value={t.label} placeholder="Name (English)" className="h-10" onChange={(e) => up(i, { label: e.target.value, ...(types.some((x) => x.id === t.id) ? {} : { id: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30) }) })} />
          <Input value={t.label_bn ?? ""} placeholder="Name (Bangla)" className="h-10" onChange={(e) => up(i, { label_bn: e.target.value })} />
          <Input value={t.path} placeholder="address" className="h-10 font-mono text-[13px]" onChange={(e) => up(i, { path: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} />
          <Select value={t.layout ?? "classic"} className="h-10" onChange={(e) => up(i, { layout: e.target.value as PostType["layout"] })}>
            <option value="classic">Classic layout</option><option value="magazine">Magazine layout</option><option value="minimal">Minimal layout</option>
          </Select>
          <button type="button" aria-label="Delete" disabled={t.id === "post"} onClick={() => setList((l) => l.filter((_, j) => j !== i))} className="p-2 text-danger disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}</div>
      {canEdit && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setList((l) => [...l, { id: "", label: "", path: "" }])}><Plus className="h-4 w-4" />Add type</Button>
          <Button size="sm" disabled={pending} onClick={() => start(async () => { const r = await savePostTypesAction(list.map((t) => ({ ...t, id: t.id || t.path }))); toast(r.ok ? "Post types saved" : r.error, r.ok ? "success" : "error"); if (r.ok) router.refresh(); })}>Save</Button>
        </div>
      )}
    </Card>
  );
}
