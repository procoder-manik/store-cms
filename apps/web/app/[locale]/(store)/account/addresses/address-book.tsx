"use client";
import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { BD_DIVISIONS } from "@/lib/data/bd-locations";
import { deleteAddressAction, saveAddressAction } from "./actions";

export interface Address { id: string; label: string | null; name: string; phone: string; district: string; upazila: string | null; address_line: string; is_default: boolean }

export function AddressBook({ addresses }: { addresses: Address[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const toast = useToast();
  const [form, setForm] = useState<Partial<Address> | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [pending, start] = useTransition();

  const open = (a?: Address) => { setForm(a ?? {}); setIsDefault(a?.is_default ?? addresses.length === 0); };

  return (
    <>
      <Button className="mt-6" onClick={() => open()}><Plus className="h-4 w-4" />{t("misc.addAddress")}</Button>
      <ul className="mt-6 grid gap-3 md:grid-cols-2">
        {addresses.map((a) => (
          <li key={a.id} className="rounded-[20px] bg-surface p-5 text-[14px] shadow-card">
            <div className="flex items-center gap-2">
              <span className="font-medium">{a.label || a.name}</span>
              {a.is_default && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent">{t("misc.default")}</span>}
            </div>
            <p className="mt-1 text-fg-muted">{a.name} · {a.phone}</p>
            <p className="text-fg-muted">{[a.address_line, a.upazila, a.district].filter(Boolean).join(", ")}</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => open(a)}>{t("misc.edit")}</Button>
              <Button size="sm" variant="ghost" className="text-danger" disabled={pending}
                onClick={() => start(async () => { await deleteAddressAction(a.id); toast(t("misc.delete")); })}>{t("misc.delete")}</Button>
            </div>
          </li>
        ))}
      </ul>
      <Dialog open={!!form} onClose={() => setForm(null)} title={t("misc.addAddress")}>
        {form && (
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            start(async () => {
              const r = await saveAddressAction({
                id: form.id, label: String(f.get("label") ?? ""), name: String(f.get("name") ?? ""), phone: String(f.get("phone") ?? ""),
                district: String(f.get("district") ?? ""), upazila: String(f.get("upazila") ?? ""), address_line: String(f.get("address_line") ?? ""), is_default: isDefault,
              });
              if (!r.ok) return toast(t("checkout.errors.form"), "error");
              toast(t("account.saved"));
              setForm(null);
            });
          }}>
            <Field label={t("misc.label")} htmlFor="ad-label" className="sm:col-span-2"><Input id="ad-label" name="label" defaultValue={form.label ?? ""} /></Field>
            <Field label={t("checkout.name")} htmlFor="ad-name"><Input id="ad-name" name="name" defaultValue={form.name} required /></Field>
            <Field label={t("checkout.phone")} htmlFor="ad-phone"><Input id="ad-phone" name="phone" type="tel" defaultValue={form.phone} required /></Field>
            <Field label={t("checkout.district")} htmlFor="ad-district">
              <Select id="ad-district" name="district" defaultValue={form.district ?? ""} required>
                <option value="" disabled>{t("checkout.chooseDistrict")}</option>
                {BD_DIVISIONS.map((d) => (
                  <optgroup key={d.name} label={locale === "bn" ? d.bn : d.name}>
                    {d.districts.map((x) => <option key={x.name} value={x.name}>{locale === "bn" ? x.bn : x.name}</option>)}
                  </optgroup>
                ))}
              </Select>
            </Field>
            <Field label={t("checkout.upazila")} htmlFor="ad-up"><Input id="ad-up" name="upazila" defaultValue={form.upazila ?? ""} /></Field>
            <Field label={t("checkout.address")} htmlFor="ad-line" className="sm:col-span-2"><Textarea id="ad-line" name="address_line" defaultValue={form.address_line} required className="min-h-16" /></Field>
            <div className="sm:col-span-2"><Switch checked={isDefault} onChange={setIsDefault} label={t("misc.makeDefault")} /></div>
            <Button type="submit" disabled={pending} className="sm:col-span-2">{t("misc.save")}</Button>
          </form>
        )}
      </Dialog>
    </>
  );
}
