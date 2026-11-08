import Link from "next/link";
import { requireStaff } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettingValue, secretKeysSet } from "@/lib/settings/server";
import { SettingsForm } from "@/components/admin/settings/settings-form";
import { cn } from "@/lib/utils";
import { RedirectManager } from "./redirect-manager";
import { SeoAudit } from "./audit";

export const metadata = { title: "SEO and tracking" };
const TABS = [
  ["general", "General"], ["schema", "Schema"], ["social", "Social"], ["webmaster", "Search Console"], ["sitemap", "Sitemap and robots"],
  ["redirects", "Redirects and 404s"], ["tracking", "Analytics and pixels"], ["audit", "SEO audit"],
] as const;

export default async function SeoPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const staff = await requireStaff("seo.view");
  const tab = (await searchParams).tab ?? "general";
  const can = staff.can("seo.update");
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  let body: React.ReactNode;

  if (tab === "redirects") {
    const admin = createAdminClient();
    const [{ data: redirects }, { data: missing }] = await Promise.all([
      admin.from("redirects").select("*").order("created_at", { ascending: false }),
      admin.from("not_found_logs").select("*").order("hits", { ascending: false }).limit(50),
    ]);
    body = <RedirectManager redirects={(redirects ?? []) as never} missing={(missing ?? []) as never} canEdit={can} />;
  } else if (tab === "audit") {
    body = <SeoAudit />;
  } else if (tab === "tracking") {
    const [tracking, capi, capiSet] = await Promise.all([getSettingValue("tracking"), getSettingValue("tracking.meta_capi"), secretKeysSet("tracking.meta_capi")]);
    body = (
      <div className="space-y-5">
        <SettingsForm settingKey="tracking" title="Analytics and pixels" description="Scripts load only after a visitor accepts cookies. View item, add to cart, checkout and purchase events are sent automatically." canEdit={can} values={tracking} fields={[
          { name: "enabled", label: "Turn tracking on", type: "switch" },
          { name: "ga4_id", label: "Google Analytics 4 ID", type: "text", hint: "G-XXXXXXXXXX" }, { name: "gtm_id", label: "Google Tag Manager ID", type: "text", hint: "GTM-XXXXXXX. Use GA4 here or inside GTM, not both." },
          { name: "google_ads_id", label: "Google Ads ID", type: "text", hint: "AW-XXXXXXXXX" }, { name: "google_ads_purchase_label", label: "Google Ads purchase conversion label", type: "text" },
          { name: "meta_pixel_id", label: "Facebook (Meta) Pixel ID", type: "text" }, { name: "tiktok_pixel_id", label: "TikTok Pixel ID", type: "text" },
          { name: "pinterest_tag_id", label: "Pinterest Tag ID", type: "text" }, { name: "snapchat_pixel_id", label: "Snapchat Pixel ID", type: "text" },
          { name: "clarity_id", label: "Microsoft Clarity project ID", type: "text", hint: "Free heatmaps and session recordings." }, { name: "hotjar_id", label: "Hotjar site ID", type: "text" },
        ]} />
        <SettingsForm settingKey="tracking.meta_capi" title="Facebook Conversions API" description="Sends purchases from the server too, so Facebook counts orders even when ad blockers hide the Pixel. Events Manager > Settings > Generate access token." canEdit={can}
          values={capi} savedSecrets={capiSet} fields={[
            { name: "enabled", label: "Send server events", type: "switch" }, { name: "access_token", label: "Access token", type: "secret" },
            { name: "test_event_code", label: "Test event code (only while testing)", type: "text" },
          ]} />
        <p className="text-[13px] text-fg-muted">Need another tool? Paste its snippet under Design, then Custom code.</p>
      </div>
    );
  } else {
    const seo = await getSettingValue<Record<string, unknown>>("seo");
    const ver = (seo.verification ?? {}) as Record<string, string>;
    const schemaOrg = await getSettingValue<Record<string, unknown>>("schema_org");
    const common = (
      <section className="rounded-[20px] bg-surface p-5 text-[14px] shadow-card">
        <p>Sitemap: <a className="text-accent" href={`${site}/sitemap.xml`} target="_blank" rel="noreferrer">{site}/sitemap.xml</a> · Robots: <a className="text-accent" href={`${site}/robots.txt`} target="_blank" rel="noreferrer">{site}/robots.txt</a></p>
        <p className="mt-1 text-fg-muted">Each page, product, post and category has its own SEO box with search preview, keyword checks, social sharing, canonical, noindex and a schema generator.</p>
      </section>
    );
    if (tab === "schema") {
      body = (
        <div className="space-y-5">
          {common}
          <SettingsForm settingKey="schema_org" title="Business schema (Organization and Website)" description="Added to every page so Google understands who you are. Choose Store or Local business to show address, phone and opening hours." canEdit={can} values={schemaOrg} fields={[
            { name: "enabled", label: "Add business schema to every page", type: "switch" },
            { name: "type", label: "Type", type: "select", options: [{ value: "Organization", label: "Organization" }, { value: "Store", label: "Store (shop)" }, { value: "OnlineStore", label: "Online store" }, { value: "LocalBusiness", label: "Local business" }] },
            { name: "name", label: "Name", type: "text", hint: "Empty = store name." }, { name: "legal_name", label: "Legal name", type: "text" },
            { name: "logo", label: "Logo URL", type: "url", hint: "Empty = store logo." }, { name: "phone", label: "Phone", type: "text" }, { name: "email", label: "Email", type: "email" },
            { name: "street", label: "Street address", type: "text" }, { name: "city", label: "City", type: "text" }, { name: "region", label: "Division", type: "text" },
            { name: "postal", label: "Postal code", type: "text" }, { name: "country", label: "Country code", type: "text", hint: "BD" },
            { name: "price_range", label: "Price range", type: "text", hint: "Example: ৳৳" }, { name: "hours", label: "Opening hours (one per line)", type: "textarea", hint: "Mo-Sa 10:00-20:00" },
            { name: "lat", label: "Latitude", type: "text" }, { name: "lng", label: "Longitude", type: "text" },
            { name: "same_as", label: "Other profiles (one URL per line)", type: "textarea", hint: "Facebook, Instagram and YouTube from Settings are added automatically." },
            { name: "search_action", label: "Let Google show a search box for your site", type: "switch" },
          ]} />
        </div>
      );
    } else if (tab === "social") {
      body = (
        <div className="space-y-5">{common}
          <SettingsForm settingKey="seo" title="Social sharing defaults" description="Used when a page has no share image or title of its own." canEdit={can} values={seo} fields={[
            { name: "og_image", label: "Default share image URL", type: "url", hint: "1200×630. Copy a URL from Media." }, { name: "twitter_handle", label: "X (Twitter) handle", type: "text", hint: "@yourstore" },
          ]} />
        </div>
      );
    } else if (tab === "webmaster") {
      body = (
        <div className="space-y-5">{common}
          <SettingsForm settingKey="seo" title="Search Console and webmaster tools" description="Paste only the code from the meta tag (the value of content). Then press Verify in each tool." canEdit={can}
            values={{ ...seo, verify_google: seo.verify_google ?? ver.google ?? "", verify_bing: seo.verify_bing ?? ver.bing ?? "", verify_facebook: seo.verify_facebook ?? ver.facebook ?? "" }} fields={[
              { name: "verify_google", label: "Google Search Console", type: "text" }, { name: "verify_bing", label: "Bing Webmaster Tools", type: "text" },
              { name: "verify_facebook", label: "Facebook domain verification", type: "text" }, { name: "verify_pinterest", label: "Pinterest", type: "text" },
              { name: "verify_yandex", label: "Yandex", type: "text" }, { name: "verify_baidu", label: "Baidu", type: "text" },
            ]} />
          <section className="rounded-[20px] bg-surface p-5 text-[14px] shadow-card">
            <p className="font-medium">After verifying</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-fg-muted"><li>Open Google Search Console, then Sitemaps, and submit <span className="font-mono">sitemap.xml</span>.</li><li>In Bing Webmaster Tools, import the site from Search Console.</li><li>Use the SEO audit tab here to find pages without descriptions.</li></ol>
          </section>
        </div>
      );
    } else if (tab === "sitemap") {
      const sm = (seo.sitemap ?? {}) as Record<string, boolean>;
      body = (
        <div className="space-y-5">{common}
          <SettingsForm settingKey="seo" title="Sitemap" description="Choose what goes into sitemap.xml. Pages marked noindex are always left out." canEdit={can} values={{ ...seo, sitemap_products: sm.products !== false, sitemap_categories: sm.categories !== false, sitemap_pages: sm.pages !== false, sitemap_posts: sm.posts !== false, sitemap_landing: sm.landing !== false }} fields={[
            { name: "sitemap_products", label: "Products", type: "switch" }, { name: "sitemap_categories", label: "Categories", type: "switch" }, { name: "sitemap_pages", label: "Pages", type: "switch" },
            { name: "sitemap_posts", label: "Posts", type: "switch" }, { name: "sitemap_landing", label: "Landing pages", type: "switch" },
          ]} />
          <SettingsForm settingKey="seo" title="Robots.txt" description="Leave the box empty to use the automatic version (admin, cart, checkout and account are hidden). Paste text to replace it completely." canEdit={can} values={seo} fields={[
            { name: "noindex_site", label: "Hide the whole site from search engines (use while building)", type: "switch" },
            { name: "robots_extra", label: "Extra paths to hide (one per line)", type: "textarea", hint: "Example: /internal" },
            { name: "robots_txt", label: "Full robots.txt (advanced)", type: "textarea" },
          ]} />
        </div>
      );
    } else {
      body = (
        <div className="space-y-5">{common}
          <SettingsForm settingKey="seo" title="Search appearance" canEdit={can} values={seo} fields={[
            { name: "default_title", label: "Home page title", type: "text" }, { name: "title_template", label: "Title template", type: "text", hint: "%s is replaced by the page title, for example %s | Lumen" },
            { name: "default_description", label: "Default description", type: "textarea", hint: "About 155 characters." },
          ]} />
        </div>
      );
    }
  }
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="headline text-[28px]">SEO and tracking</h1>
      <nav className="no-scrollbar mt-5 flex gap-1 overflow-x-auto" aria-label="SEO sections">{TABS.map(([k, l]) => <Link key={k} href={`/admin/seo?tab=${k}`} className={cn("shrink-0 rounded-full px-4 py-1.5 text-[14px]", tab === k ? "bg-fg text-background" : "text-fg-muted hover:bg-fill")}>{l}</Link>)}</nav>
      <div className="mt-6">{body}</div>
    </div>
  );
}
