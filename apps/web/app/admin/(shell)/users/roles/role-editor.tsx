"use client";
import { useMemo, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { MODULES, ACTIONS } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { deleteRoleAction, saveRoleAction } from "../actions";

export interface RoleRow { id: string; name: string; description: string; isSystem: boolean; permissions: string[] }

const label = (m: string) => m.charAt(0).toUpperCase() + m.slice(1);

export function RoleEditor({ roles, canEdit, canCreate, canDelete }: { roles: RoleRow[]; canEdit: boolean; canCreate: boolean; canDelete: boolean }) {
  const toast = useToast();
  const [selectedId, setSelectedId] = useState<string | "new">(roles.find((r) => r.name !== "Super Admin")?.id ?? "new");
  const selected = useMemo(() => roles.find((r) => r.id === selectedId), [roles, selectedId]);
  const [name, setName] = useState(selected?.name ?? "");
  const [description, setDescription] = useState(selected?.description ?? "");
  const [perms, setPerms] = useState<Set<string>>(new Set(selected?.permissions ?? []));
  const [pending, start] = useTransition();

  const isSuper = selected?.name === "Super Admin";
  const editable = !isSuper && (selectedId === "new" ? canCreate : canEdit);

  function pick(id: string | "new") {
    const r = roles.find((x) => x.id === id);
    setSelectedId(id);
    setName(r?.name ?? "");
    setDescription(r?.description ?? "");
    setPerms(new Set(r?.permissions ?? []));
  }
  const toggle = (key: string) => setPerms((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const toggleRow = (m: string) => {
    const keys = ACTIONS.map((a) => `${m}.${a}`);
    const all = keys.every((k) => perms.has(k));
    setPerms((s) => { const n = new Set(s); keys.forEach((k) => (all ? n.delete(k) : n.add(k))); return n; });
  };

  function save() {
    start(async () => {
      const r = await saveRoleAction({ id: selectedId === "new" ? undefined : selectedId, name, description, permissions: [...perms] });
      if (!r.ok) return toast(r.error, "error");
      toast("Role saved");
      if (selectedId === "new" && r.data) setSelectedId(r.data.id);
    });
  }

  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
      <div className="space-y-1">
        {roles.map((r) => (
          <button key={r.id} onClick={() => pick(r.id)}
            className={cn("flex w-full items-center justify-between rounded-[12px] px-3 py-2.5 text-left text-[14px]",
              selectedId === r.id ? "bg-surface font-medium shadow-card" : "text-fg-muted hover:bg-fill")}>
            {r.name}
            <span className="text-[12px] text-fg-subtle">{r.name === "Super Admin" ? "all" : r.permissions.length}</span>
          </button>
        ))}
        {canCreate && (
          <button onClick={() => pick("new")} className="flex w-full items-center gap-2 rounded-[12px] px-3 py-2.5 text-[14px] text-accent hover:bg-fill">
            <Plus className="h-4 w-4" />New role
          </button>
        )}
      </div>

      <div className="rounded-[20px] bg-surface p-5 shadow-card">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Role name" htmlFor="role-name"><Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} disabled={!editable} /></Field>
          <Field label="Description" htmlFor="role-desc"><Input id="role-desc" value={description} onChange={(e) => setDescription(e.target.value)} disabled={!editable} /></Field>
        </div>
        {isSuper ? (
          <p className="mt-6 rounded-[12px] bg-fill p-4 text-[14px] text-fg-muted">Super Admin has every permission and cannot be limited.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[560px] text-[14px]">
              <thead>
                <tr className="text-[12px] text-fg-muted">
                  <th className="py-2 text-left font-medium">Area</th>
                  {ACTIONS.map((a) => <th key={a} className="py-2 font-medium">{label(a)}</th>)}
                </tr>
              </thead>
              <tbody>
                {MODULES.map((m) => (
                  <tr key={m} className="border-t border-line">
                    <td className="py-2">
                      <button type="button" onClick={() => editable && toggleRow(m)} className="text-left hover:text-accent">{label(m)}</button>
                    </td>
                    {ACTIONS.map((a) => {
                      const key = `${m}.${a}`;
                      return (
                        <td key={a} className="py-2 text-center">
                          <input type="checkbox" aria-label={`${m} ${a}`} checked={perms.has(key)} disabled={!editable}
                            onChange={() => toggle(key)} className="h-4 w-4 accent-[var(--accent)]" />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {editable && (
          <div className="mt-6 flex gap-2">
            <Button onClick={save} disabled={pending || name.trim().length < 2}>Save role</Button>
            {selected && !selected.isSystem && canDelete && (
              <Button variant="ghost" className="text-danger" disabled={pending}
                onClick={() => confirm("Delete this role?") && start(async () => {
                  const r = await deleteRoleAction(selected.id);
                  if (r.ok) { toast("Role deleted"); pick("new"); } else toast(r.error, "error");
                })}>
                Delete
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
