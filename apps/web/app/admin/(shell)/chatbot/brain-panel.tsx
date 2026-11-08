"use client";
import { useState, useTransition } from "react";
import { Brain, GraduationCap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Field, Input, Textarea } from "@/components/ui/field";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { refreshBrainAction, teachAction } from "./actions";

export function BrainPanel({ brain, updated, canEdit }: { brain: string; updated: string; canEdit: boolean }) {
  const toast = useToast();
  const [text, setText] = useState(brain);
  const [pending, start] = useTransition();
  return (
    <Card title="Store brain" description="What the assistant knows about this store, built automatically from your categories, prices, delivery, policies, FAQ and taught answers. Refreshes daily."
      actions={canEdit && <Button size="sm" variant="secondary" disabled={pending} onClick={() => start(async () => { const r = await refreshBrainAction(); if (!r.ok) return toast(r.error, "error"); setText(r.data!.brain); toast("Brain refreshed"); })}><RefreshCw className="h-4 w-4" />Refresh now</Button>}>
      {text ? <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-[12px] bg-fill p-3 text-[12px] leading-relaxed">{text}</pre> : <p className="flex items-center gap-2 text-[14px] text-fg-muted"><Brain className="h-4 w-4" />Not built yet. Press Refresh now.</p>}
      {updated && <p className="mt-2 text-[12px] text-fg-subtle">Updated {new Date(updated).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p>}
    </Card>
  );
}

/** Turn a real answer into permanent knowledge, optionally improving it first. */
export function TeachButton({ question, answer }: { question: string; answer: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(question);
  const [a, setA] = useState(answer);
  const [pending, start] = useTransition();
  return (
    <>
      <button onClick={() => setOpen(true)} className="mt-1 flex items-center gap-1 text-[11px] text-accent hover:underline"><GraduationCap className="h-3.5 w-3.5" />Teach this answer</button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Teach the assistant">
        <div className="space-y-3">
          <Field label="Customer question" htmlFor="tq"><Input id="tq" value={q} onChange={(e) => setQ(e.target.value)} /></Field>
          <Field label="Best answer" htmlFor="ta"><Textarea id="ta" value={a} onChange={(e) => setA(e.target.value)} className="min-h-32" /></Field>
          <Button className="w-full" disabled={pending} onClick={() => start(async () => { const r = await teachAction(q, a); if (!r.ok) return toast(r.error, "error"); toast("Learned. The brain will include it."); setOpen(false); })}>Save to knowledge</Button>
        </div>
      </Dialog>
    </>
  );
}
