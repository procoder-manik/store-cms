"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle } from "lucide-react";

type Toast = { id: number; message: string; tone: "success" | "error" };
const Ctx = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, message, tone }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 3500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div key={t.id} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
              className="glass pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2.5 text-[14px] shadow-float">
              {t.tone === "success" ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertCircle className="h-4 w-4 text-danger" />}
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
