"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { moderateAction } from "./actions";

type Item = { id: string; rating?: number; title?: string | null; body?: string | null; question?: string; answer?: string | null; admin_reply?: string | null; is_verified?: boolean; status: string; created_at: string; products: { id: string; title: string } | null; profiles: { full_name: string | null; email: string | null } | null };

export function ModerationItem({ kind, item, canEdit }: { kind: "review" | "question"; item: Item; canEdit: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [reply, setReply] = useState((kind === "review" ? item.admin_reply : item.answer) ?? "");
  const [pending, start] = useTransition();
  const go = (status: "approved" | "rejected") => start(async () => {
    const r = await moderateAction({ kind, id: item.id, status, reply });
    if (!r.ok) return toast(r.error, "error");
    toast(status === "approved" ? "Published" : "Rejected"); router.refresh();
  });
  return (
    <li className="rounded-[20px] bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-fg-muted">
        {item.products && <Link href={`/admin/products/${item.products.id}`} className="font-medium text-fg hover:text-accent">{item.products.title}</Link>}
        <span>· {item.profiles?.full_name ?? item.profiles?.email ?? "Customer"} · {new Date(item.created_at).toLocaleDateString("en-GB")}</span>
        {item.is_verified && <span className="flex items-center gap-1 text-success"><BadgeCheck className="h-3.5 w-3.5" />Verified</span>}
      </div>
      {kind === "review" && <div className="mt-2 flex">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`h-4 w-4 ${i <= (item.rating ?? 0) ? "fill-warning text-warning" : "text-fg-subtle"}`} />)}</div>}
      {item.title && <p className="mt-1 font-medium">{item.title}</p>}
      <p className="mt-1 text-[15px]">{kind === "review" ? item.body : item.question}</p>
      {canEdit && (
        <div className="mt-3 space-y-2">
          <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder={kind === "review" ? "Public reply (optional)" : "Your answer"} className="min-h-16" />
          <div className="flex gap-2">
            <Button size="sm" disabled={pending || (kind === "question" && !reply)} onClick={() => go("approved")}>{item.status === "approved" ? "Save" : "Approve"}</Button>
            {item.status !== "rejected" && <Button size="sm" variant="ghost" className="text-danger" disabled={pending} onClick={() => go("rejected")}>Reject</Button>}
          </div>
        </div>
      )}
    </li>
  );
}
