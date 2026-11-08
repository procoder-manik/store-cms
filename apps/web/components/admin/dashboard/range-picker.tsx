"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";

const OPTIONS = [["1d", "1D"], ["7d", "7D"], ["15d", "15D"], ["30d", "30D"], ["3m", "3M"], ["6m", "6M"], ["1y", "1Y"]];

export function RangePicker({ active }: { active: string }) {
  const router = useRouter();
  const [custom, setCustom] = useState(active === "custom");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-full bg-fill p-0.5">
        {OPTIONS.map(([k, label]) => (
          <button key={k} onClick={() => { setCustom(false); router.push(`/admin?range=${k}`); }}
            className={cn("h-8 rounded-full px-3 text-[13px]", active === k ? "bg-surface font-medium shadow-card" : "text-fg-muted")}>{label}</button>
        ))}
        <button onClick={() => setCustom(true)} className={cn("h-8 rounded-full px-3 text-[13px]", active === "custom" || custom ? "bg-surface font-medium shadow-card" : "text-fg-muted")}>Custom</button>
      </div>
      {custom && (
        <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); router.push(`/admin?from=${f.get("from")}&to=${f.get("to")}`); }}>
          <Input type="date" name="from" required className="h-9 w-36" aria-label="From" />
          <Input type="date" name="to" required className="h-9 w-36" aria-label="To" />
          <Button size="sm" type="submit">Apply</Button>
        </form>
      )}
    </div>
  );
}
