import type { Box } from "@/lib/sections/registry";
import { cn } from "@/lib/utils";

const FILL: Record<Box[4], string> = {
  i: "var(--accent-soft)", t: "var(--text-primary)", s: "var(--text-tertiary)", b: "var(--accent)", c: "var(--surface)", d: "#16161a",
};

/** Schematic preview of a layout, drawn from boxes. */
export function Thumb({ boxes, className }: { boxes: Box[]; className?: string }) {
  return (
    <svg viewBox="0 0 120 72" className={cn("w-full rounded-[10px] bg-fill", className)} aria-hidden>
      {boxes.map(([x, y, w, h, k], n) => (
        <rect key={n} x={x} y={y} width={w} height={h} rx={k === "t" || k === "s" ? 1.5 : k === "b" ? 3 : 4}
          fill={FILL[k]} stroke={k === "c" ? "var(--border)" : "none"} opacity={k === "s" ? 0.6 : 1} />
      ))}
    </svg>
  );
}

export const HEADER_THUMBS: Record<string, Box[]> = {
  glass: [[0, 0, 120, 16, "c"], [6, 5, 18, 6, "t"], [32, 6, 10, 4, "s"], [46, 6, 10, 4, "s"], [70, 4, 30, 8, "c"], [104, 5, 10, 6, "b"], [0, 22, 120, 50, "i"]],
  centered: [[0, 0, 120, 22, "c"], [46, 4, 28, 7, "t"], [4, 5, 14, 5, "s"], [100, 5, 14, 5, "s"], [24, 15, 72, 3, "s"], [0, 28, 120, 44, "i"]],
  bold: [[0, 0, 120, 6, "b"], [0, 6, 120, 18, "c"], [4, 11, 16, 7, "t"], [26, 10, 62, 8, "c"], [94, 11, 22, 6, "s"], [0, 24, 120, 6, "c"], [4, 26, 80, 2, "s"], [0, 34, 120, 38, "i"]],
  minimal: [[0, 0, 120, 16, "c"], [4, 5, 8, 6, "s"], [16, 5, 18, 6, "t"], [100, 5, 14, 6, "b"], [0, 22, 120, 50, "i"]],
};
export const FOOTER_THUMBS: Record<string, Box[]> = {
  columns: [[0, 30, 120, 42, "c"], [6, 36, 24, 6, "t"], [6, 46, 30, 3, "s"], [50, 36, 16, 3, "t"], [50, 44, 14, 3, "s"], [72, 36, 16, 3, "t"], [72, 44, 14, 3, "s"], [94, 36, 16, 3, "t"]],
  dark: [[0, 24, 120, 48, "d"], [8, 30, 104, 14, "s"], [8, 52, 22, 5, "c"], [50, 52, 14, 3, "s"], [72, 52, 14, 3, "s"], [94, 52, 14, 3, "s"]],
  brand: [[0, 24, 120, 48, "b"], [8, 30, 30, 4, "c"], [60, 30, 14, 3, "c"], [84, 30, 14, 3, "c"], [6, 50, 108, 16, "c"]],
  minimal: [[0, 50, 120, 22, "c"], [6, 57, 20, 6, "t"], [40, 59, 40, 3, "s"], [96, 57, 18, 6, "s"]],
};
export const CARD_THUMBS: Record<string, Box[]> = {
  classic: [[34, 4, 52, 46, "i"], [34, 53, 44, 4, "t"], [34, 60, 20, 4, "s"], [34, 66, 24, 5, "c"], [62, 66, 24, 5, "b"]],
  minimal: [[34, 4, 52, 52, "i"], [74, 46, 9, 8, "d"], [34, 60, 40, 3, "s"], [34, 66, 18, 4, "t"]],
  overlay: [[34, 2, 52, 68, "i"], [34, 46, 52, 24, "d"], [38, 52, 38, 4, "c"], [38, 60, 20, 4, "c"]],
  bordered: [[30, 2, 60, 68, "c"], [34, 6, 52, 40, "i"], [34, 50, 44, 4, "t"], [34, 57, 20, 4, "s"], [34, 63, 52, 6, "b"]],
};
