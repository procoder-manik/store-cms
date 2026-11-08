import { cn } from "@/lib/utils";

const STYLE: Record<string, string> = {
  pending: "bg-warning/15 text-warning", confirmed: "bg-accent/15 text-accent", processing: "bg-accent/15 text-accent", packed: "bg-accent/15 text-accent",
  shipped: "bg-accent/15 text-accent", out_for_delivery: "bg-accent/15 text-accent", delivered: "bg-success/15 text-success",
  cancelled: "bg-fill text-fg-muted", returned: "bg-danger/15 text-danger", refunded: "bg-fill text-fg-muted", failed: "bg-danger/15 text-danger",
  paid: "bg-success/15 text-success", unpaid: "bg-fill text-fg-muted", partially_paid: "bg-warning/15 text-warning",
};
export const STATUS_LABEL = (s: string) => s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

export function StatusBadge({ status }: { status: string }) {
  return <span className={cn("inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-medium", STYLE[status] ?? "bg-fill")}>{STATUS_LABEL(status)}</span>;
}
