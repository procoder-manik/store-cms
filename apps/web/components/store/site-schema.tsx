import { getSetting } from "@/lib/data/catalog";
import { JsonLd } from "@/lib/seo/jsonld";
import { absoluteUrl } from "@/lib/utils";

interface SchemaOrg {
  enabled?: boolean; type?: string; name?: string; legal_name?: string; logo?: string; phone?: string; email?: string; price_range?: string; hours?: string; search_action?: boolean;
  street?: string; city?: string; region?: string; postal?: string; country?: string; lat?: string; lng?: string; same_as?: string;
}

/** Organization or LocalBusiness plus WebSite, once per page, from Admin > SEO > Schema. */
export async function SiteSchema() {
  const [o, store, social] = await Promise.all([
    getSetting<SchemaOrg>("schema_org").catch(() => null), getSetting<{ name?: string; phone?: string; email?: string; address?: string; logo_url?: string | null }>("store").catch(() => null),
    getSetting<Record<string, string>>("social").catch(() => null),
  ]);
  if (o?.enabled === false) return null;
  const name = o?.name || store?.name || process.env.NEXT_PUBLIC_SITE_NAME || "Store";
  const sameAs = [...(o?.same_as ?? "").split(/[\n,]/), social?.facebook, social?.instagram, social?.youtube, social?.tiktok].map((x) => x?.trim()).filter((x): x is string => !!x && /^https?:/.test(x));
  const type = o?.type || "Organization";
  const address = o?.street || o?.city || store?.address ? { "@type": "PostalAddress", streetAddress: o?.street || store?.address, addressLocality: o?.city, addressRegion: o?.region, postalCode: o?.postal, addressCountry: o?.country || "BD" } : undefined;
  const org: Record<string, unknown> = {
    "@type": type, "@id": absoluteUrl("/#org"), name, legalName: o?.legal_name || undefined, url: absoluteUrl("/"), logo: o?.logo || store?.logo_url || undefined,
    image: o?.logo || store?.logo_url || undefined, telephone: o?.phone || store?.phone || undefined, email: o?.email || store?.email || undefined, sameAs: sameAs.length ? [...new Set(sameAs)] : undefined,
    ...(type !== "Organization" ? { address, priceRange: o?.price_range || undefined, openingHours: o?.hours ? o.hours.split("\n").map((l) => l.trim()).filter(Boolean) : undefined,
      geo: o?.lat && o?.lng ? { "@type": "GeoCoordinates", latitude: o.lat, longitude: o.lng } : undefined } : { address }),
  };
  const site: Record<string, unknown> = {
    "@type": "WebSite", "@id": absoluteUrl("/#website"), name, url: absoluteUrl("/"), publisher: { "@id": absoluteUrl("/#org") }, inLanguage: ["en", "bn"],
    ...(o?.search_action !== false ? { potentialAction: { "@type": "SearchAction", target: absoluteUrl("/search?q={search_term_string}"), "query-input": "required name=search_term_string" } } : {}),
  };
  return <JsonLd data={{ "@context": "https://schema.org", "@graph": [org, site] }} />;
}
