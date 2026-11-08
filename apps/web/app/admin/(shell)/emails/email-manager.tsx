"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { StatusBadge } from "@/components/admin/orders/status-badge";
import { retryEmailAction, runQueueAction, saveTemplateAction, sendTestAction } from "./actions";
import { FieldInput } from "../builder/fields";
import type { Field as BlockField } from "@/lib/sections/registry";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

type Block = { type: "heading" | "text" | "button" | "products" | "image" | "divider"; [k: string]: unknown };
type T = { event: string; subject: string; heading: string; body_html: string; is_active: boolean; customized: boolean; blocks: Block[] };
const BLOCK_FIELDS: Record<Block["type"], BlockField[]> = {
  heading: [{ key: "text", label: "Heading", type: "text" }],
  text: [{ key: "text", label: "Text", type: "textarea" }],
  button: [{ key: "label", label: "Button text", type: "text" }, { key: "url", label: "Link", type: "url" }],
  image: [{ key: "image", label: "Image", type: "image" }, { key: "url", label: "Link (optional)", type: "url" }],
  products: [{ key: "text", label: "Heading (optional)", type: "text" }, { key: "source", label: "Products", type: "select", options: [{ value: "newest", label: "Newest" }, { value: "best_selling", label: "Best selling" }, { value: "on_sale", label: "On sale" }, { value: "featured", label: "Featured" }, { value: "manual", label: "Pick products" }] }, { key: "product_ids", label: "Picked products", type: "products" }, { key: "limit", label: "How many (max 6)", type: "number" }],
  divider: [],
};
const BLOCK_LABEL: Record<Block["type"], string> = { heading: "Heading", text: "Text", button: "Button", image: "Image", products: "Products", divider: "Divider" };
type Q = { id: number; event: string; to_email: string; status: string; attempts: number; error: string | null; created_at: string };
const label = (e: string) => e.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

export function EmailManager({ templates, queue, canEdit }: { templates: T[]; queue: Q[]; canEdit: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [edit, setEdit] = useState<T | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) => start(async () => {
    const r = await fn(); toast(r.ok ? msg : r.error ?? "Failed", r.ok ? "success" : "error"); router.refresh();
  });

  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="rounded-[20px] bg-surface p-5 shadow-card">
        <h2 className="text-[17px] font-semibold">Templates</h2>
        <ul className="mt-2">
          {templates.map((t) => (
            <li key={t.event} className="flex items-center gap-3 border-b border-line py-2.5 text-[14px] last:border-0">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{label(t.event)}{!t.is_active && <span className="ml-2 text-[12px] text-fg-subtle">Off</span>}{t.customized && <span className="ml-2 text-[12px] text-accent">Edited</span>}</p>
                <p className="truncate text-[12px] text-fg-muted">{t.subject}</p>
              </div>
              {canEdit && <>
                <Button size="sm" variant="ghost" onClick={() => setEdit(t)}>Edit</Button>
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => sendTestAction(t.event), "Test sent to your email")}>Test</Button>
              </>}
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-[20px] bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold">Queue</h2>
          {canEdit && <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(runQueueAction, "Queue processed")}>Send now</Button>}
        </div>
        <ul className="mt-2">
          {queue.map((q) => (
            <li key={q.id} className="border-b border-line py-2.5 text-[13px] last:border-0">
              <div className="flex items-center gap-2">
                <StatusBadge status={q.status === "sent" ? "paid" : q.status === "failed" ? "failed" : "pending"} />
                <span className="font-medium">{label(q.event)}</span>
                <span className="truncate text-fg-muted">{q.to_email}</span>
                {canEdit && q.status === "failed" && <Button size="sm" variant="ghost" className="ml-auto" onClick={() => run(() => retryEmailAction(q.id), "Retried")}>Retry</Button>}
              </div>
              {q.error && <p className="mt-1 text-[12px] text-danger">{q.error}</p>}
            </li>
          ))}
          {!queue.length && <li className="py-6 text-center text-fg-muted">Nothing sent yet.</li>}
        </ul>
      </section>
      <Dialog open={!!edit} onClose={() => setEdit(null)} title={edit ? label(edit.event) : ""} className="md:max-w-2xl">
        {edit && (
          <form className="space-y-3" onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            run(() => saveTemplateAction({ event: edit.event, subject: String(f.get("subject")), heading: String(f.get("heading")), body_html: String(f.get("body")), is_active: edit.is_active, blocks: edit.blocks.map((b) => ({ ...b, product_ids: b.source === "manual" ? (b.product_ids as string[] | undefined) : undefined, limit: b.limit ? Number(b.limit) : undefined })) as never }), "Template saved");
            setEdit(null);
          }}>
            <p className="text-[12px] text-fg-muted">Variables: {"{{name}} {{order}} {{amount}} {{store}} {{product}} {{courier}} {{tracking}} {{note}}"}. Edits apply to the English version; Bangla uses the built-in text.</p>
            <Field label="Subject" htmlFor="et-s"><Input id="et-s" name="subject" defaultValue={edit.subject} /></Field>
            <Field label="Heading" htmlFor="et-h"><Input id="et-h" name="heading" defaultValue={edit.heading} /></Field>
            <Field label="Message" htmlFor="et-b"><Textarea id="et-b" name="body" defaultValue={edit.body_html} className="min-h-32" /></Field>
            <div>
              <p className="mb-2 text-[13px] font-medium text-fg-muted">Extra blocks (added under the message, in both languages)</p>
              <div className="space-y-2">
                {edit.blocks.map((b, i) => (
                  <div key={i} className="rounded-[12px] border border-line p-3">
                    <div className="mb-2 flex items-center gap-2 text-[13px] font-medium">
                      <span className="flex-1">{BLOCK_LABEL[b.type]}</span>
                      <button type="button" aria-label="Up" onClick={() => { if (i === 0) return; const n = [...edit.blocks]; [n[i - 1], n[i]] = [n[i]!, n[i - 1]!]; setEdit({ ...edit, blocks: n }); }}><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" aria-label="Down" onClick={() => { if (i === edit.blocks.length - 1) return; const n = [...edit.blocks]; [n[i + 1], n[i]] = [n[i]!, n[i + 1]!]; setEdit({ ...edit, blocks: n }); }}><ArrowDown className="h-4 w-4" /></button>
                      <button type="button" aria-label="Delete" onClick={() => setEdit({ ...edit, blocks: edit.blocks.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4 text-danger" /></button>
                    </div>
                    <div className="space-y-2">{BLOCK_FIELDS[b.type].filter((fd) => fd.key !== "product_ids" || b.source === "manual").map((fd) => (
                      <FieldInput key={fd.key} field={fd} value={b[fd.key]} ctx={{ categories: [] }} onChange={(v) => setEdit({ ...edit, blocks: edit.blocks.map((x, j) => (j === i ? { ...x, [fd.key]: v } : x)) })} />
                    ))}</div>
                  </div>
                ))}
              </div>
              {edit.blocks.length < 12 && (
                <div className="mt-2 flex flex-wrap gap-1.5">{(Object.keys(BLOCK_LABEL) as Block["type"][]).map((ty) => (
                  <button key={ty} type="button" onClick={() => setEdit({ ...edit, blocks: [...edit.blocks, { type: ty, ...(ty === "products" ? { source: "best_selling", limit: 4 } : {}) }] })} className="rounded-full bg-fill px-3 py-1.5 text-[12px] hover:bg-accent-soft">+ {BLOCK_LABEL[ty]}</button>
                ))}</div>
              )}
            </div>
            <Switch checked={edit.is_active} onChange={(v) => setEdit({ ...edit, is_active: v })} label="Send this email" />
            <Button type="submit" className="w-full" disabled={pending}>Save</Button>
          </form>
        )}
      </Dialog>
    </div>
  );
}
