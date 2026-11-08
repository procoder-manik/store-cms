"use client";
import { useEffect, useState } from "react";

export function Countdown({ to }: { to: string }) {
  const [left, setLeft] = useState(() => Math.max(0, new Date(to).getTime() - Date.now()));
  useEffect(() => { const id = setInterval(() => setLeft(Math.max(0, new Date(to).getTime() - Date.now())), 1000); return () => clearInterval(id); }, [to]);
  const s = Math.floor(left / 1000);
  const parts = [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
  return (
    <span className="inline-flex gap-1 font-semibold tabular-nums" suppressHydrationWarning>
      {parts.map((n, i) => (i === 0 && n === 0 ? null : <span key={i} className="rounded-[8px] bg-fg px-2 py-1 text-[14px] text-background">{String(n).padStart(2, "0")}</span>))}
    </span>
  );
}
