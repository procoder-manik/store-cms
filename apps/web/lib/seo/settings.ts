import "server-only";
import { cache } from "react";
import { getSetting } from "@/lib/data/catalog";

export interface SeoSettings {
  title_template?: string; default_title?: string; default_description?: string; og_image?: string | null; robots_extra?: string;
  verification?: { google?: string; bing?: string; facebook?: string };
  verify_google?: string; verify_bing?: string; verify_facebook?: string; verify_pinterest?: string; verify_yandex?: string; verify_baidu?: string;
  robots_txt?: string; sitemap?: { products?: boolean; categories?: boolean; pages?: boolean; posts?: boolean; landing?: boolean }; twitter_handle?: string; noindex_site?: boolean;
}
export interface TrackingSettings { enabled?: boolean; ga4_id?: string; gtm_id?: string; meta_pixel_id?: string; tiktok_pixel_id?: string; google_ads_id?: string; google_ads_purchase_label?: string; clarity_id?: string; hotjar_id?: string; pinterest_tag_id?: string; snapchat_pixel_id?: string }

export const seoSettings = cache(async () => (await getSetting<SeoSettings>("seo")) ?? {});
export const trackingSettings = cache(async () => (await getSetting<TrackingSettings>("tracking")) ?? {});
