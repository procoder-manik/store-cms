"use client";
import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { saveSettingsAction } from "./actions";

export type SettingField =
  | { name: string; label: string; type: "text" | "number" | "url" | "email" | "textarea"; hint?: string }
  | { name: string; label: string; type: "switch"; hint?: string }
  | { name: string; label: string; type: "secret"; hint?: string }
  | { name: string; label: string; type: "select"; hint?: string; options: { value: string; label: string }[] };

/** One settings card. Secret fields are write-only: they show "Saved" and keep their value when left empty. */
export function SettingsForm({ settingKey, title, description, fields, values, savedSecrets = [], canEdit, footer }: {
  settingKey: string; title: string; description?: string; fields: SettingField[]; values: Record<string, unknown>;
  savedSecrets?: string[]; canEdit: boolean; footer?: React.ReactNode;
}) {
  const toast = useToast();
  const [state, setState] = useState<Record<string, unknown>>(values);
  const [pending, start] = useTransition();

  function save(form: FormData) {
    const pub: Record<string, unknown> = {};
    const secrets: Record<string, string> = {};
    let hasSecrets = false;
    for (const f of fields) {
      if (f.type === "secret") { hasSecrets = true; secrets[f.name] = String(form.get(f.name) ?? ""); }
      else if (f.type === "switch") pub[f.name] = !!state[f.name];
      else if (f.type === "number") pub[f.name] = form.get(f.name) === "" ? null : Number(form.get(f.name));
      else if (f.type === "select") pub[f.name] = String(form.get(f.name) ?? "");
      else pub[f.name] = String(form.get(f.name) ?? "");
    }
    start(async () => {
      const r = await saveSettingsAction(settingKey, pub, hasSecrets ? secrets : undefined);
      toast(r.ok ? "Saved" : r.error, r.ok ? "success" : "error");
    });
  }

  return (
    <Card title={title} description={description}>
      <form action={save} className="grid gap-4 md:grid-cols-2">
        {fields.map((f) => f.type === "switch" ? (
          <div key={f.name} className="md:col-span-2">
            <Switch checked={!!state[f.name]} onChange={(v) => setState((s) => ({ ...s, [f.name]: v }))} label={f.label} disabled={!canEdit} />
            {f.hint && <p className="mt-1 text-[12px] text-fg-subtle">{f.hint}</p>}
          </div>
        ) : f.type === "select" ? (
          <Field key={f.name} label={f.label} htmlFor={`${settingKey}-${f.name}`} hint={f.hint}>
            <Select id={`${settingKey}-${f.name}`} name={f.name} defaultValue={String(values[f.name] ?? f.options[0]?.value ?? "")} disabled={!canEdit}>
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
        ) : f.type === "textarea" ? (
          <Field key={f.name} label={f.label} htmlFor={`${settingKey}-${f.name}`} hint={f.hint} className="md:col-span-2">
            <Textarea id={`${settingKey}-${f.name}`} name={f.name} defaultValue={String(values[f.name] ?? "")} disabled={!canEdit} />
          </Field>
        ) : (
          <Field key={f.name} label={f.label} htmlFor={`${settingKey}-${f.name}`} hint={f.hint}>
            <div className="relative">
              <Input id={`${settingKey}-${f.name}`} name={f.name} disabled={!canEdit} autoComplete="off"
                type={f.type === "secret" ? "password" : f.type} defaultValue={f.type === "secret" ? "" : String(values[f.name] ?? "")}
                placeholder={f.type === "secret" && savedSecrets.includes(f.name) ? "Saved. Leave empty to keep." : undefined} />
              {f.type === "secret" && savedSecrets.includes(f.name) && <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-success" />}
            </div>
          </Field>
        ))}
        {canEdit && <div className="flex items-center gap-3 md:col-span-2"><Button type="submit" disabled={pending}>Save</Button>{footer}</div>}
      </form>
    </Card>
  );
}
