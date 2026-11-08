"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { STATUS_LABEL } from "@/components/admin/orders/status-badge";
import { refundAction, saveAdminNoteAction, sendToCourierAction, updateOrderStatusAction } from "../actions";
import type { CourierName, OrderStatus } from "@/types/domain";

const ALL: OrderStatus[] = ["pending", "confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered", "cancelled", "returned", "failed"];

export function OrderPanel({ orderId, status, adminNote, couriers, booked, paid, method, canUpdate }: {
  orderId: string; status: string; adminNote: string; couriers: CourierName[]; booked: boolean; paid: number; method: string; canUpdate: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [next, setNext] = useState<OrderStatus>(status as OrderStatus);
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(true);
  const [viaGateway, setViaGateway] = useState(method === "bkash");
  const [pending, start] = useTransition();
  if (!canUpdate) return null;

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) => start(async () => {
    const r = await fn();
    if (!r.ok) return toast(r.error ?? "Failed", "error");
    toast(msg); router.refresh();
  });

  return (
    <>
      <Card title="Update status">
        <div className="space-y-3">
          <Select value={next} onChange={(e) => setNext(e.target.value as OrderStatus)} aria-label="Status">
            {ALL.map((s) => <option key={s} value={s}>{STATUS_LABEL(s)}</option>)}
          </Select>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional, shown in timeline)" />
          <Switch checked={notify} onChange={setNotify} label="Email the customer" />
          {(next === "cancelled" || next === "returned") && <p className="text-[12px] text-fg-muted">Stock is added back automatically.</p>}
          <Button className="w-full" disabled={pending || (next === status && !note)}
            onClick={() => run(() => updateOrderStatusAction([orderId], next, note, notify), "Status updated")}>Save status</Button>
        </div>
      </Card>

      {couriers.length > 0 && !booked && !["cancelled", "returned", "delivered", "refunded", "failed"].includes(status) && (
        <Card title="Send to courier" description="Books the parcel and sets the order to Packed.">
          <div className="grid gap-2">
            {couriers.map((c) => (
              <Button key={c} variant="secondary" disabled={pending} onClick={() => start(async () => {
                const r = await sendToCourierAction([orderId], c);
                if (!r.ok) return toast(r.error, "error");
                if (r.data!.errors.length) toast(r.data!.errors[0]!, "error"); else toast(`Booked with ${c}`);
                router.refresh();
              })}><Truck className="h-4 w-4" />{c.charAt(0).toUpperCase() + c.slice(1)}</Button>
            ))}
          </div>
        </Card>
      )}

      <Card title="Internal note">
        <Textarea defaultValue={adminNote} placeholder="Only staff can see this" onBlur={(e) => e.target.value !== adminNote && run(() => saveAdminNoteAction(orderId, e.target.value), "Note saved")} />
      </Card>

      {paid > 0 && (
        <Card title="Refund">
          <form className="space-y-3" onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            if (!confirm("Refund this amount?")) return;
            run(() => refundAction({ orderId, amount: Number(f.get("amount")), reason: String(f.get("reason") ?? ""), viaGateway }), "Refund recorded");
          }}>
            <Field label="Amount (৳)" htmlFor="rf-amt"><Input id="rf-amt" name="amount" type="number" min={1} max={paid} defaultValue={paid} /></Field>
            <Field label="Reason" htmlFor="rf-reason"><Input id="rf-reason" name="reason" /></Field>
            {method === "bkash" && <Switch checked={viaGateway} onChange={setViaGateway} label="Send money back through bKash" />}
            <Button type="submit" variant="danger" className="w-full" disabled={pending}>Refund</Button>
          </form>
        </Card>
      )}
    </>
  );
}
