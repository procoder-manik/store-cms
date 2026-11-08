"use client";
import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { deletePageAction, duplicatePageAction } from "./actions";

export function RowActions({ id, editHref, builderHref, canEdit, canDelete }: { id: string; editHref: string; builderHref: string; canEdit: boolean; canDelete: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex gap-1">
      {canEdit && <Link href={editHref} className="rounded-full px-3 py-1.5 text-[13px] hover:bg-fill">Edit</Link>}
      {canEdit && <Link href={builderHref} className="rounded-full px-3 py-1.5 text-[13px] text-accent hover:bg-fill">Design</Link>}
      {canEdit && <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => { const r = await duplicatePageAction(id); if (r.ok) { toast("Copied"); router.push(editHref.replace(id, r.data!.id)); } })}>Copy</Button>}
      {canDelete && <Button size="sm" variant="ghost" className="text-danger" disabled={pending} onClick={() => confirm("Delete this page?") && start(async () => { await deletePageAction(id); router.refresh(); })}>Delete</Button>}
    </span>
  );
}
