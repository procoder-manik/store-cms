"use client";
import { ThemeProvider as NextThemes } from "next-themes";
import type { ReactNode } from "react";

export function ThemeProvider({ children, defaultTheme = "system" }: { children: ReactNode; defaultTheme?: string }) {
  return (
    <NextThemes attribute="class" defaultTheme={defaultTheme} enableSystem disableTransitionOnChange>
      {children}
    </NextThemes>
  );
}
