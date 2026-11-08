"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { resolveReturnAction } from "../actions";

export function ReturnActions({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const go = (approve: boolean) => start(async () => {
    const r = await resolveReturnAction(id, approve, note);
    if (!r.ok) return toast(r.error, "error");
    toast(approve ? "Return approved" : "Return rejected"); router.refresh();
  });
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Message to customer (optional)" className="h-9 max-w-sm" />
      <Button size="sm" disabled={pending} onClick={() => go(true)}>Approve</Button>
      <Button size="sm" variant="ghost" className="text-danger" disabled={pending} onClick={() => go(false)}>Reject</Button>
    </div>
  );
}
