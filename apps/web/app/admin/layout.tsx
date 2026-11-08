import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { fontVariables } from "@/lib/fonts";
import { getAppearance } from "@/lib/theme/server";
import { themeCss } from "@/lib/theme/css";
import "../globals.css";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminRootLayout({ children }: { children: ReactNode }) {
  const appearance = await getAppearance();
  return (
    <html lang="en" suppressHydrationWarning className={fontVariables}>
      <body data-btn={appearance.button}>
        <style id="theme-vars" dangerouslySetInnerHTML={{ __html: themeCss(appearance) }} />
        <ThemeProvider>
          <NextIntlClientProvider>
            <ToastProvider>{children}</ToastProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
