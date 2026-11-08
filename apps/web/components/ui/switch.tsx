"use client";
import { cn } from "@/lib/utils";

/** iOS-style toggle. Works controlled, and posts its value through a hidden input when `name` is set. */
export function Switch({ checked, onChange, name, label, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; name?: string; label?: string; disabled?: boolean;
}) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-3", disabled && "opacity-50")}>
      <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
        className={cn("relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-success" : "bg-fill")}>
        <span className={cn("absolute left-[2px] top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-transform duration-200 ease-[var(--ease-spring)]",
          checked && "translate-x-[20px]")} />
      </button>
      {name && <input type="hidden" name={name} value={checked ? "on" : ""} />}
      {label && <span className="text-[15px]">{label}</span>}
    </label>
  );
}
