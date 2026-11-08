"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { saveSettingsAction } from "./actions";
import { FieldListEditor, type FormField } from "./field-list-editor";

type Cfg = { fields: FormField[]; submit_label?: string; success_message?: string };

/** Design the contact form: fields, labels in English and Bangla, button text and thank-you message. */
export function ContactFormEditor({ value, canEdit }: { value: Cfg; canEdit: boolean }) {
  const toast = useToast();
  const [c, setC] = useState<Cfg>({ ...value, fields: (value.fields ?? []).map((f) => (["name", "email", "message"].includes(f.key) ? { ...f, locked: true } : f)) });
  const [pending, start] = useTransition();
  return (
    <Card title="Contact form" description="Name, email and message are kept so you can reply. Add, rename or reorder anything else.">
      <FieldListEditor value={c.fields} onChange={(fields) => setC((s) => ({ ...s, fields }))} />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Field label="Button text" htmlFor="cf-btn"><Input id="cf-btn" value={c.submit_label ?? ""} onChange={(e) => setC((s) => ({ ...s, submit_label: e.target.value }))} /></Field>
        <Field label="Message after sending" htmlFor="cf-ok"><Input id="cf-ok" value={c.success_message ?? ""} onChange={(e) => setC((s) => ({ ...s, success_message: e.target.value }))} /></Field>
      </div>
      {canEdit && <Button className="mt-4" disabled={pending} onClick={() => start(async () => {
        const r = await saveSettingsAction("contact_form", { ...c, fields: c.fields.filter((f) => f.label.trim()).map(({ locked: _l, ...f }) => { void _l; return f; }) });
        toast(r.ok ? "Contact form saved" : r.error, r.ok ? "success" : "error");
      })}>Save contact form</Button>}
    </Card>
  );
}
