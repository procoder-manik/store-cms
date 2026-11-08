import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { fontVariables } from "@/lib/fonts";
import { getAppearance } from "@/lib/theme/server";
import { themeCss } from "@/lib/theme/css";
import "../globals.css";
import { seoSettings, trackingSettings } from "@/lib/seo/settings";
import { Tracking } from "@/components/store/tracking/tracking";
import { CodeBlock, getCode } from "@/lib/code/inject";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "Lumen";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await seoSettings().catch(() => ({} as Awaited<ReturnType<typeof seoSettings>>));
  const title = seo.default_title || `${siteName}: Online shopping in Bangladesh`;
  const description = seo.default_description || "Shop quality products with cash on delivery across Bangladesh.";
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: { default: title, template: seo.title_template?.includes("%s") ? seo.title_template : `%s | ${siteName}` },
    description,
    applicationName: siteName,
    openGraph: { siteName, type: "website", locale: "en_BD", alternateLocale: ["bn_BD"], title, description, images: seo.og_image ? [{ url: seo.og_image }] : undefined },
    twitter: { card: "summary_large_image", ...(seo.twitter_handle ? { site: seo.twitter_handle } : {}) },
    icons: { icon: "/icon", apple: "/apple-icon" },
    verification: (() => {
      const g = seo.verify_google || seo.verification?.google;
      const b = seo.verify_bing || seo.verification?.bing;
      const f = seo.verify_facebook || seo.verification?.facebook;
      return { google: g || undefined, yandex: seo.verify_yandex || undefined, other: { ...(b && { "msvalidate.01": b }), ...(f && { "facebook-domain-verification": f }), ...(seo.verify_pinterest && { "p:domain_verify": seo.verify_pinterest }), ...(seo.verify_baidu && { "baidu-site-verification": seo.verify_baidu }) } };
    })(),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const appearance = await getAppearance();
  const globalCode = await getCode("global", "site").catch(() => null);
  return (
    <html lang={locale} suppressHydrationWarning className={fontVariables}>
      <head><CodeBlock code={globalCode?.head} slot="head" /></head>
      <body data-btn={appearance.button}>
        <CodeBlock code={globalCode?.body_start} slot="body_start" />
        <style id="theme-vars" dangerouslySetInnerHTML={{ __html: themeCss(appearance) }} />
        <ThemeProvider defaultTheme={appearance.defaultMode}>
          <NextIntlClientProvider>
            <ToastProvider>{children}</ToastProvider>
            <Tracking settings={await trackingSettings().catch(() => ({}))} />
          </NextIntlClientProvider>
        </ThemeProvider>
        <CodeBlock code={globalCode?.footer} slot="footer" />
      </body>
    </html>
  );
}
