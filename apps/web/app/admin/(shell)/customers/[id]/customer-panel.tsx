"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { updateCustomerAction } from "../actions";

export function CustomerPanel({ id, blocked, note, points, canEdit }: { id: string; blocked: boolean; note: string; points: number; canEdit: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const run = (patch: Parameters<typeof updateCustomerAction>[1], msg: string) => start(async () => {
    const r = await updateCustomerAction(id, patch);
    toast(r.ok ? msg : r.error, r.ok ? "success" : "error"); router.refresh();
  });
  if (!canEdit) return null;
  return (
    <div className="space-y-5">
      <Card title="Notes"><Textarea defaultValue={note} placeholder="Only staff can see this" onBlur={(e) => e.target.value !== note && run({ admin_note: e.target.value }, "Note saved")} /></Card>
      <Card title={`Loyalty points: ${points}`}>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run({ points_delta: Number(f.get("delta")), points_reason: String(f.get("reason") ?? "") }, "Points updated"); e.currentTarget.reset(); }}>
          <Input name="delta" type="number" placeholder="+50 or -20" className="w-28" required />
          <Input name="reason" placeholder="Reason" />
          <Button type="submit" variant="secondary" disabled={pending}>Apply</Button>
        </form>
      </Card>
      <Button variant={blocked ? "secondary" : "danger"} className="w-full" disabled={pending}
        onClick={() => confirm(blocked ? "Unblock this customer?" : "Block this customer? They will be signed out and cannot order with this account.") && run({ is_blocked: !blocked }, blocked ? "Unblocked" : "Blocked")}>
        {blocked ? "Unblock customer" : "Block customer"}
      </Button>
    </div>
  );
}
