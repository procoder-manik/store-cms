"use client";
import { useEffect } from "react";

/** Wires the invoice's print button and opens the print dialog automatically. */
export function PrintTrigger({ auto = true }: { auto?: boolean }) {
  useEffect(() => {
    const btn = document.querySelector("[data-print]");
    const onClick = () => window.print();
    btn?.addEventListener("click", onClick);
    const id = auto ? setTimeout(() => window.print(), 500) : undefined;
    return () => { btn?.removeEventListener("click", onClick); if (id) clearTimeout(id); };
  }, [auto]);
  return null;
}
