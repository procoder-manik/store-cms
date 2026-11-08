"use client";
import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { saveCodeAction } from "@/app/admin/(shell)/custom-code/actions";

type Entity = "global" | "home" | "page" | "landing" | "post" | "product" | "category";
export interface CodeValue { head: string; body_start: string; footer: string }

const SLOTS = [
  { key: "head", label: "Header code", hint: "Placed in the page head: meta tags, schema (JSON-LD), verification tags, tracking snippets, CSS in a style tag." },
  { key: "body_start", label: "Body code (top)", hint: "Right after the page opens, for example the Google Tag Manager noscript." },
  { key: "footer", label: "Footer code", hint: "At the end of the page: chat widgets, conversion pixels, scripts that should load last." },
] as const;

/** Header, body and footer code boxes. For the whole site or for a single page, product or post. */
export function CodePanel({ entity, id, initial, canEdit, scope }: { entity: Entity; id: string | null; initial: CodeValue | null; canEdit: boolean; scope: string }) {
  const toast = useToast();
  const [v, setV] = useState<CodeValue>(initial ?? { head: "", body_start: "", footer: "" });
  const [pending, start] = useTransition();
  if (!canEdit) return null;
  return (
    <Card title="Custom code" description={`Added only to ${scope}. Use it for schema markup, scripts, pixels or any HTML.`}>
      {!id ? <p className="text-[14px] text-fg-muted">Save first, then add code.</p> : (
        <div className="space-y-4">
          <p className="flex items-start gap-2 rounded-[12px] bg-warning/10 p-3 text-[13px]"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />Code runs for every visitor. Only paste code from sources you trust.</p>
          {SLOTS.map((s) => (
            <div key={s.key}>
              <p className="text-[13px] font-medium">{s.label}</p><p className="mb-1.5 text-[12px] text-fg-muted">{s.hint}</p>
              <Textarea value={v[s.key]} spellCheck={false} onChange={(e) => setV({ ...v, [s.key]: e.target.value })} className="min-h-28 font-mono text-[12px]" placeholder={s.key === "head" ? '<script type="application/ld+json">{ ... }</script>' : ""} />
            </div>
          ))}
          <Button disabled={pending} onClick={() => start(async () => { const r = await saveCodeAction({ entity, id, ...v }); toast(r.ok ? "Code saved" : r.error, r.ok ? "success" : "error"); })}>Save code</Button>
        </div>
      )}
    </Card>
  );
}
