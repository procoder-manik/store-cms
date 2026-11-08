"use client";
import { useState, useTransition } from "react";
import { Copy, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { inviteStaffAction, removeStaffAction, setStaffBlockedAction, updateStaffRoleAction } from "./actions";

export interface StaffRow {
  id: string; name: string | null; email: string | null; blocked: boolean;
  lastLogin: string | null; roleId: string | null; roleName: string | null;
}

export function StaffManager({ rows, roles, selfId, canCreate, canUpdate, canDelete }: {
  rows: StaffRow[]; roles: { id: string; name: string }[]; selfId: string;
  canCreate: boolean; canUpdate: boolean; canDelete: boolean;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    start(async () => {
      const r = await fn();
      if (r.ok) toast(success);
      else toast(r.error ?? "Failed", "error");
    });

  async function invite(form: FormData) {
    const r = await inviteStaffAction({
      email: String(form.get("email")), name: String(form.get("name")), role_id: String(form.get("role_id")),
    });
    if (!r.ok) return toast(r.error, "error");
    setLink(r.data!.link);
    toast("Invite created");
  }

  return (
    <>
      {canCreate && (
        <div className="mt-6">
          <Button onClick={() => { setLink(null); setOpen(true); }}><UserPlus className="h-4 w-4" />Invite staff</Button>
        </div>
      )}
      <div className="mt-6 overflow-x-auto rounded-[20px] bg-surface shadow-card">
        <table className="w-full min-w-[720px] text-left text-[14px]">
          <thead className="text-[12px] text-fg-muted">
            <tr className="border-b border-line">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Last sign-in</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="px-5 py-3">
                  <p className="font-medium">{r.name ?? "No name"}{r.id === selfId && <span className="ml-2 text-fg-subtle">(you)</span>}</p>
                  <p className="text-[13px] text-fg-muted">{r.email}</p>
                </td>
                <td className="px-5 py-3">
                  {canUpdate && r.id !== selfId ? (
                    <Select defaultValue={r.roleId ?? ""} className="h-9 w-48" disabled={pending}
                      onChange={(e) => run(() => updateStaffRoleAction(r.id, e.target.value), "Role updated")}>
                      <option value="" disabled>Choose role</option>
                      {roles.map((ro) => <option key={ro.id} value={ro.id}>{ro.name}</option>)}
                    </Select>
                  ) : r.roleName ?? "None"}
                </td>
                <td className="px-5 py-3 text-fg-muted">{r.lastLogin ? new Date(r.lastLogin).toLocaleString("en-GB") : "Never"}</td>
                <td className="px-5 py-3">
                  <span className={r.blocked ? "text-danger" : "text-success"}>{r.blocked ? "Blocked" : "Active"}</span>
                </td>
                <td className="px-5 py-3 text-right">
                  {r.id !== selfId && (
                    <div className="flex justify-end gap-2">
                      {canUpdate && (
                        <Button size="sm" variant="ghost" disabled={pending}
                          onClick={() => run(() => setStaffBlockedAction(r.id, !r.blocked), r.blocked ? "Unblocked" : "Blocked")}>
                          {r.blocked ? "Unblock" : "Block"}
                        </Button>
                      )}
                      {canDelete && (
                        <Button size="sm" variant="ghost" className="text-danger" disabled={pending}
                          onClick={() => confirm(`Remove ${r.email} from staff?`) && run(() => removeStaffAction(r.id), "Removed from staff")}>
                          Remove
                        </Button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title="Invite staff">
        {link ? (
          <div className="space-y-4">
            <p className="text-[14px] text-fg-muted">Send this one-time link to them. It works once. Once email sending is set up, they also get it by email.</p>
            <div className="break-all rounded-[12px] bg-fill p-3 font-mono text-[12px]">{link}</div>
            <Button className="w-full" onClick={() => { navigator.clipboard.writeText(link); toast("Link copied"); }}>
              <Copy className="h-4 w-4" />Copy link
            </Button>
          </div>
        ) : (
          <form action={invite} className="space-y-3">
            <Field label="Name" htmlFor="inv-name"><Input id="inv-name" name="name" required /></Field>
            <Field label="Email" htmlFor="inv-email"><Input id="inv-email" name="email" type="email" required /></Field>
            <Field label="Role" htmlFor="inv-role">
              <Select id="inv-role" name="role_id" required defaultValue="">
                <option value="" disabled>Choose role</option>
                {roles.map((ro) => <option key={ro.id} value={ro.id}>{ro.name}</option>)}
              </Select>
            </Field>
            <Button type="submit" className="w-full">Create invite</Button>
          </form>
        )}
      </Dialog>
    </>
  );
}
