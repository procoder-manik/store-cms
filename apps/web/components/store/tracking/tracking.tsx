"use client";
import { useEffect, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { TrackingSettings } from "@/lib/seo/settings";

const CONSENT = "cookie_consent";

/** Loads GTM, GA4, Meta Pixel and TikTok only after the visitor accepts analytics cookies. */
export function Tracking({ settings: s }: { settings: TrackingSettings }) {
  const t = useTranslations("consent");
  const pathname = usePathname();
  const [consent, setConsent] = useState<"granted" | "denied" | null>(null);
  const active = !!s.enabled && !!(s.gtm_id || s.ga4_id || s.meta_pixel_id || s.tiktok_pixel_id || s.google_ads_id || s.clarity_id || s.hotjar_id || s.pinterest_tag_id || s.snapchat_pixel_id);
  const isAdmin = pathname?.startsWith("/admin");

  useEffect(() => {
    try { setConsent((localStorage.getItem(CONSENT) as "granted" | "denied" | null) ?? null); } catch { setConsent("denied"); }
  }, []);
  // SPA page views for GA4 and Pixel
  useEffect(() => {
    if (consent !== "granted") return;
    const w = window as Window & { gtag?: (...a: unknown[]) => void; fbq?: (...a: unknown[]) => void };
    w.gtag?.("event", "page_view", { page_path: pathname });
    w.fbq?.("track", "PageView");
  }, [pathname, consent]);

  if (!active || isAdmin) return null;
  const decide = (v: "granted" | "denied") => { try { localStorage.setItem(CONSENT, v); } catch { /* ignore */ } setConsent(v); };
  const valid = (id?: string) => !!id && /^[A-Za-z0-9-]+$/.test(id);

  return (
    <>
      {consent === "granted" && (
        <>
          <Script id="dl-init" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];${valid(s.google_ads_id) && s.google_ads_purchase_label ? `window.__ads={id:"${s.google_ads_id}",label:"${String(s.google_ads_purchase_label).replace(/[^A-Za-z0-9_-]/g, "")}"};` : ""}`}</Script>
          {valid(s.gtm_id) && <Script id="gtm" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${s.gtm_id}');`}</Script>}
          {valid(s.ga4_id) && (
            <>
              <Script src={`https://www.googletagmanager.com/gtag/js?id=${s.ga4_id}`} strategy="afterInteractive" />
              <Script id="ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${s.ga4_id}',{send_page_view:false});${valid(s.google_ads_id) ? `gtag('config','${s.google_ads_id}');` : ""}`}</Script>
            </>
          )}
          {!valid(s.ga4_id) && valid(s.google_ads_id) && (
            <>
              <Script src={`https://www.googletagmanager.com/gtag/js?id=${s.google_ads_id}`} strategy="afterInteractive" />
              <Script id="gads" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${s.google_ads_id}');`}</Script>
            </>
          )}
          {valid(s.clarity_id) && <Script id="clarity" strategy="afterInteractive">{`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${s.clarity_id}");`}</Script>}
          {valid(s.hotjar_id) && <Script id="hotjar" strategy="afterInteractive">{`(function(h,o,t,j,a,r){h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};h._hjSettings={hjid:${Number(s.hotjar_id) || 0},hjsv:6};a=o.getElementsByTagName('head')[0];r=o.createElement('script');r.async=1;r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;a.appendChild(r);})(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');`}</Script>}
          {valid(s.pinterest_tag_id) && <Script id="pintrk" strategy="afterInteractive">{`!function(e){if(!window.pintrk){window.pintrk=function(){window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var n=window.pintrk;n.queue=[],n.version="3.0";var t=document.createElement("script");t.async=!0,t.src=e;var r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");pintrk('load','${s.pinterest_tag_id}');pintrk('page');`}</Script>}
          {valid(s.snapchat_pixel_id) && <Script id="snaptr" strategy="afterInteractive">{`(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var s='script';var r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');snaptr('init','${s.snapchat_pixel_id}');snaptr('track','PAGE_VIEW');`}</Script>}
          {valid(s.meta_pixel_id) && <Script id="fbq" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${s.meta_pixel_id}');`}</Script>}
          {valid(s.tiktok_pixel_id) && <Script id="ttq" strategy="afterInteractive">{`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;var o=document.createElement("script");o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${s.tiktok_pixel_id}');ttq.page();}(window,document,'ttq');`}</Script>}
        </>
      )}
      {consent === null && (
        <div role="dialog" aria-label={t("title")} className="glass fixed inset-x-3 bottom-20 z-[55] mx-auto max-w-lg rounded-[22px] p-4 shadow-float md:bottom-5">
          <p className="text-[14px]">{t("body")}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => decide("granted")}>{t("accept")}</Button>
            <Button size="sm" variant="ghost" onClick={() => decide("denied")}>{t("decline")}</Button>
          </div>
        </div>
      )}
    </>
  );
}
