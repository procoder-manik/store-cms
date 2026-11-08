"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { clearNotFoundAction, deleteRedirectAction, saveRedirectAction } from "./actions";

type R = { id: string; from_path: string; to_path: string; code: number; hits: number };
type M = { path: string; hits: number; last_seen_at: string };

export function RedirectManager({ redirects, missing, canEdit }: { redirects: R[]; missing: M[]; canEdit: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const save = (from: string, to: string, code: 301 | 302) => start(async () => {
    const r = await saveRedirectAction({ from_path: from, to_path: to, code });
    toast(r.ok ? r.message ?? "Saved" : r.error, r.ok ? "success" : "error"); router.refresh();
  });
  return (
    <div className="space-y-5">
      <Card title="Redirects" description="Send old links to new pages so you keep search rankings. 301 is permanent, 302 is temporary.">
        {canEdit && (
          <form className="mb-4 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); save(String(f.get("from")), String(f.get("to")), Number(f.get("code")) as 301); e.currentTarget.reset(); }}>
            <Input name="from" placeholder="/old-link" required className="h-10 flex-1" />
            <Input name="to" placeholder="/product/new-link" required className="h-10 flex-1" />
            <Select name="code" defaultValue="301" className="h-10 w-24"><option value="301">301</option><option value="302">302</option></Select>
            <Button type="submit" disabled={pending}>Add</Button>
          </form>
        )}
        <ul>
          {redirects.map((r) => (
            <li key={r.id} className="flex items-center gap-3 border-b border-line py-2 text-[14px] last:border-0">
              <span className="flex-1 truncate font-mono text-[13px]">{r.from_path} → {r.to_path}</span>
              <span className="text-[12px] text-fg-muted">{r.code} · {r.hits} hits</span>
              {canEdit && <Button size="sm" variant="ghost" className="text-danger" onClick={() => start(async () => { await deleteRedirectAction(r.id); router.refresh(); })}>Delete</Button>}
            </li>
          ))}
          {!redirects.length && <li className="text-[14px] text-fg-muted">No redirects.</li>}
        </ul>
      </Card>
      <Card title="Pages not found" description="Links visitors opened that do not exist. Fix the busiest ones with a redirect."
        actions={canEdit && missing.length > 0 && <Button size="sm" variant="ghost" onClick={() => start(async () => { await clearNotFoundAction(); router.refresh(); })}>Clear list</Button>}>
        <ul>
          {missing.map((m) => (
            <li key={m.path} className="flex flex-wrap items-center gap-2 border-b border-line py-2 text-[14px] last:border-0">
              <span className="flex-1 truncate font-mono text-[13px]">{m.path}</span>
              <span className="text-[12px] text-fg-muted">{m.hits} times</span>
              {canEdit && (
                <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); save(m.path, String(new FormData(e.currentTarget).get("to")), 301); }}>
                  <Input name="to" placeholder="Redirect to /..." required className="h-8 w-48 text-[13px]" />
                  <Button size="sm" type="submit" variant="secondary" disabled={pending}>Fix</Button>
                </form>
              )}
            </li>
          ))}
          {!missing.length && <li className="text-[14px] text-fg-muted">No broken links recorded.</li>}
        </ul>
      </Card>
    </div>
  );
}
