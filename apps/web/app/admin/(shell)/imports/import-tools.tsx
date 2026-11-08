"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Download, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { createImportTokenAction, importFromUrlAction, revokeImportTokenAction } from "./actions";

export function ImportBox() {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <form className="flex gap-2 rounded-[20px] bg-surface p-4 shadow-card" onSubmit={(e) => {
      e.preventDefault();
      const url = String(new FormData(e.currentTarget).get("url") ?? "");
      start(async () => {
        const r = await importFromUrlAction(url);
        if (!r.ok) return toast(r.error, "error");
        router.push(`/admin/imports/${r.data!.jobId}`);
      });
    }}>
      <Input name="url" placeholder="https://www.aliexpress.com/item/1005....html" required className="h-12" />
      <Button type="submit" size="lg" disabled={pending}><Download className="h-4 w-4" />{pending ? "Fetching" : "Import"}</Button>
    </form>
  );
}

type Token = { id: string; name: string; last_used_at: string | null; revoked_at: string | null; created_at: string };

export function TokenManager({ tokens, canCreate, siteUrl }: { tokens: Token[]; canCreate: boolean; siteUrl: string }) {
  const router = useRouter();
  const toast = useToast();
  const [fresh, setFresh] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card title="Chrome extension" description={`Load the "apps/extension" folder in Chrome (chrome://extensions, Developer mode, Load unpacked). In its settings enter your store URL ${siteUrl} and an import key.`}
      actions={canCreate && <Button size="sm" variant="secondary" disabled={pending} onClick={() => start(async () => {
        const r = await createImportTokenAction("Chrome extension");
        if (!r.ok) return toast(r.error, "error");
        setFresh(r.data!.token); router.refresh();
      })}><KeyRound className="h-4 w-4" />New import key</Button>}>
      {fresh && (
        <div className="mb-4 rounded-[14px] bg-warning/10 p-4">
          <p className="text-[13px]">Copy this key now. It is shown only once.</p>
          <div className="mt-2 flex gap-2">
            <code className="flex-1 break-all rounded-[10px] bg-surface p-2.5 text-[12px]">{fresh}</code>
            <Button size="sm" onClick={() => { navigator.clipboard.writeText(fresh); toast("Copied"); }}><Copy className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
      <ul>
        {tokens.map((t) => (
          <li key={t.id} className="flex items-center gap-3 border-b border-line py-2.5 text-[14px] last:border-0">
            <span className="flex-1">{t.name}<span className="ml-2 text-[12px] text-fg-subtle">created {new Date(t.created_at).toLocaleDateString("en-GB")}{t.last_used_at && `, last used ${new Date(t.last_used_at).toLocaleDateString("en-GB")}`}</span></span>
            {t.revoked_at ? <span className="text-[12px] text-fg-subtle">Revoked</span> : (
              <Button size="sm" variant="ghost" className="text-danger" disabled={pending} onClick={() => start(async () => { await revokeImportTokenAction(t.id); router.refresh(); })}>Revoke</Button>
            )}
          </li>
        ))}
        {!tokens.length && <li className="text-[14px] text-fg-muted">No keys yet.</li>}
      </ul>
    </Card>
  );
}
