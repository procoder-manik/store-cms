"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { CardId, HeaderId } from "@/lib/theme/presets";

const Ctx = createContext<{ card: CardId; header: HeaderId }>({ card: "classic", header: "glass" });

export function AppearanceProvider({ card, header, children }: { card: CardId; header: HeaderId; children: ReactNode }) {
  return <Ctx.Provider value={{ card, header }}>{children}</Ctx.Provider>;
}
export const useAppearance = () => useContext(Ctx);
