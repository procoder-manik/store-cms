"use client";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn, formatBDT } from "@/lib/utils";

export type Point = { label: string; revenue: number; orders: number; profit: number; previous: number };
type Metric = "revenue" | "orders" | "profit";

export function SalesChart({ data }: { data: Point[] }) {
  const [metric, setMetric] = useState<Metric>("revenue");
  const money = metric !== "orders";
  return (
    <div>
      <div className="mt-3 inline-flex rounded-full bg-fill p-0.5">
        {(["revenue", "orders", "profit"] as Metric[]).map((m) => (
          <button key={m} onClick={() => setMetric(m)} className={cn("h-8 rounded-full px-3.5 text-[13px] capitalize", metric === m ? "bg-surface font-medium shadow-card" : "text-fg-muted")}>{m}</button>
        ))}
      </div>
      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="fillMain" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "var(--text-tertiary)", fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={16} />
            <YAxis tick={{ fill: "var(--text-tertiary)", fontSize: 12 }} tickLine={false} axisLine={false} width={money ? 72 : 36}
              tickFormatter={(v: number) => (money ? (v >= 1000 ? `৳${Math.round(v / 1000)}k` : `৳${v}`) : String(v))} />
            <Tooltip
              contentStyle={{ background: "var(--surface-glass)", backdropFilter: "blur(20px)", border: "1px solid var(--border)", borderRadius: 14, color: "var(--text-primary)" }}
              formatter={(v: number, name: string) => [money ? formatBDT(v) : v, name === "previous" ? "Previous period" : metric]} />
            {metric === "revenue" && <Line type="monotone" dataKey="previous" stroke="var(--text-tertiary)" strokeDasharray="4 4" dot={false} strokeWidth={1.5} />}
            <Area type="monotone" dataKey={metric} stroke="var(--accent)" strokeWidth={2.5} fill="url(#fillMain)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
