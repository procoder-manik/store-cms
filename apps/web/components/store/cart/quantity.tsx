"use client";
import { Minus, Plus } from "lucide-react";

export function Quantity({ value, onChange, max = 99, size = "md" }: { value: number; onChange: (v: number) => void; max?: number; size?: "sm" | "md" }) {
  const h = size === "sm" ? "h-8" : "h-11";
  const w = size === "sm" ? "w-8" : "w-11";
  return (
    <div className={`inline-flex items-center rounded-full bg-fill ${h}`}>
      <button type="button" aria-label="Decrease" onClick={() => onChange(Math.max(0, value - 1))} className={`flex ${h} ${w} items-center justify-center rounded-full active:scale-90`}><Minus className="h-3.5 w-3.5" /></button>
      <span className="min-w-6 text-center text-[14px] font-medium tabular-nums" aria-live="polite">{value}</span>
      <button type="button" aria-label="Increase" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} className={`flex ${h} ${w} items-center justify-center rounded-full active:scale-90 disabled:opacity-40`}><Plus className="h-3.5 w-3.5" /></button>
    </div>
  );
}
