"use client";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Glass modal. Becomes a bottom sheet on phones. Escape and backdrop click close it. */
export function Dialog({ open, onClose, title, children, className }: {
  open: boolean; onClose: () => void; title?: string; children: ReactNode; className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
          <motion.div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div role="dialog" aria-modal="true" aria-label={title}
            initial={{ y: 40, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className={cn("glass relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[var(--radius-sheet)] p-5 shadow-float md:max-w-lg md:rounded-[var(--radius-sheet)] md:p-6", className)}>
            <div className="mb-4 flex items-center justify-between gap-4">
              {title ? <h2 className="text-[19px] font-semibold tracking-tight">{title}</h2> : <span />}
              <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full bg-fill">
                <X className="h-4 w-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
