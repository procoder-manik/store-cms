"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { saveSettingsAction } from "./actions";
import { FieldListEditor, type FormField } from "./field-list-editor";

type Cfg = { email?: { show?: boolean; required?: boolean }; upazila?: { show?: boolean; required?: boolean }; note?: { show?: boolean }; custom?: FormField[] };

/** Choose which built-in checkout fields show and add your own (gift note, preferred time, company...). */
export function CheckoutFieldsEditor({ value, canEdit }: { value: Cfg; canEdit: boolean }) {
  const toast = useToast();
  const [c, setC] = useState<Cfg>({ email: { show: true }, upazila: { show: true }, note: { show: true }, custom: [], ...value });
  const [pending, start] = useTransition();
  const row = (label: string, k: "email" | "upazila") => (
    <div className="flex flex-wrap items-center gap-5 rounded-[12px] bg-fill/50 px-3 py-2.5 text-[14px]">
      <span className="w-40 font-medium">{label}</span>
      <Switch checked={c[k]?.show !== false} onChange={(v) => setC((s) => ({ ...s, [k]: { ...s[k], show: v, required: v ? s[k]?.required : false } }))} label="Show" />
      <Switch checked={!!c[k]?.required} disabled={c[k]?.show === false} onChange={(v) => setC((s) => ({ ...s, [k]: { ...s[k], required: v } }))} label="Required" />
    </div>
  );
  return (
    <Card title="Checkout fields" description="Name, mobile, district and address are always asked. Turn the others on or off and add your own fields. Answers appear on the order.">
      <div className="space-y-2">
        {row("Email", "email")}
        {row("Area / Thana", "upazila")}
        <div className="flex items-center gap-5 rounded-[12px] bg-fill/50 px-3 py-2.5 text-[14px]">
          <span className="w-40 font-medium">Delivery note</span>
          <Switch checked={c.note?.show !== false} onChange={(v) => setC((s) => ({ ...s, note: { show: v } }))} label="Show" />
        </div>
      </div>
      <p className="mb-2 mt-5 text-[13px] font-medium text-fg-muted">Your own fields</p>
      <FieldListEditor value={c.custom ?? []} onChange={(custom) => setC((s) => ({ ...s, custom }))} types={["text", "textarea", "select", "checkbox"]} max={8} />
      {canEdit && <Button className="mt-4" disabled={pending} onClick={() => start(async () => {
        const r = await saveSettingsAction("checkout_fields", { ...c, custom: (c.custom ?? []).filter((f) => f.label.trim()) });
        toast(r.ok ? "Checkout fields saved" : r.error, r.ok ? "success" : "error");
      })}>Save checkout fields</Button>}
    </Card>
  );
}
