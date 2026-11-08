"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export function ReportDownloads({ items }: { items: { type: string; title: string; body: string; dated: boolean }[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-2 text-[14px]">
        <span className="text-fg-muted">Date range for dated reports</span>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-40" aria-label="From" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-40" aria-label="To" />
      </div>
      <ul className="mt-5 grid gap-3 md:grid-cols-2">
        {items.map((i) => (
          <li key={i.type} className="flex items-start gap-4 rounded-[20px] bg-surface p-5 shadow-card">
            <div className="flex-1"><p className="font-semibold">{i.title}</p><p className="mt-1 text-[13px] text-fg-muted">{i.body}</p></div>
            <a className={buttonClass("secondary", "sm")} href={`/api/admin/export?type=${i.type}${i.dated ? `&from=${from}&to=${to}` : ""}`}><Download className="h-4 w-4" />CSV</a>
          </li>
        ))}
      </ul>
    </>
  );
}
