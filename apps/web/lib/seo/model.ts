/** SEO data stored on products, categories, pages, posts and landing pages (column `seo`). Safe to import in client components. */
export type SchemaType = "FAQPage" | "HowTo" | "Article" | "LocalBusiness" | "VideoObject" | "Event" | "Service" | "Custom";
export interface SchemaItem { id: string; type: SchemaType; data: Record<string, unknown> }
export interface SeoData {
  title?: string; description?: string; canonical?: string; og_title?: string; og_description?: string; og_image?: string;
  twitter_card?: "summary" | "summary_large_image"; noindex?: boolean; nofollow?: boolean; keyword?: string; breadcrumb_title?: string; schemas?: SchemaItem[];
}

export const SCHEMA_TYPES: { id: SchemaType; label: string; hint: string }[] = [
  { id: "FAQPage", label: "FAQ", hint: "Questions and answers shown in Google results" },
  { id: "HowTo", label: "How-to", hint: "Step by step guide" },
  { id: "Article", label: "Article", hint: "Blog or news article" },
  { id: "LocalBusiness", label: "Local business", hint: "Shop address, phone and opening hours" },
  { id: "VideoObject", label: "Video", hint: "A video on this page" },
  { id: "Event", label: "Event", hint: "Sale event, launch or workshop" },
  { id: "Service", label: "Service", hint: "A service you offer" },
  { id: "Custom", label: "Custom JSON-LD", hint: "Paste any schema.org markup" },
];

const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const clean = <T extends Record<string, unknown>>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v != null && !(Array.isArray(v) && !v.length)));

/** Turns the simple form values into valid schema.org JSON-LD. Returns null when required fields are missing. */
export function buildSchema(item: SchemaItem): Record<string, unknown> | null {
  const d = item.data ?? {};
  switch (item.type) {
    case "FAQPage": {
      const qa = ((d.items as { q?: string; a?: string }[]) ?? []).filter((x) => s(x.q) && s(x.a));
      return qa.length ? { "@type": "FAQPage", mainEntity: qa.map((x) => ({ "@type": "Question", name: s(x.q), acceptedAnswer: { "@type": "Answer", text: s(x.a) } })) } : null;
    }
    case "HowTo": {
      const steps = ((d.steps as { name?: string; text?: string; image?: string }[]) ?? []).filter((x) => s(x.text) || s(x.name));
      return s(d.name) && steps.length ? clean({ "@type": "HowTo", name: s(d.name), description: s(d.description), totalTime: s(d.totalTime),
        step: steps.map((x, i) => clean({ "@type": "HowToStep", position: i + 1, name: s(x.name) || `Step ${i + 1}`, text: s(x.text), image: s(x.image) })) }) : null;
    }
    case "Article":
      return s(d.headline) ? clean({ "@type": s(d.kind) === "NewsArticle" ? "NewsArticle" : "Article", headline: s(d.headline), description: s(d.description), image: s(d.image) ? [s(d.image)] : undefined,
        author: s(d.author) ? { "@type": "Person", name: s(d.author) } : undefined, datePublished: s(d.datePublished) || undefined, dateModified: s(d.dateModified) || undefined }) : null;
    case "LocalBusiness":
      return s(d.name) ? clean({ "@type": s(d.kind) || "Store", name: s(d.name), image: s(d.image), telephone: s(d.phone), email: s(d.email), priceRange: s(d.priceRange), url: s(d.url),
        address: s(d.street) || s(d.city) ? clean({ "@type": "PostalAddress", streetAddress: s(d.street), addressLocality: s(d.city), addressRegion: s(d.region), postalCode: s(d.postal), addressCountry: s(d.country) || "BD" }) : undefined,
        openingHours: s(d.hours) ? s(d.hours).split("\n").map((l) => l.trim()).filter(Boolean) : undefined }) : null;
    case "VideoObject":
      return s(d.name) && s(d.contentUrl || d.embedUrl) ? clean({ "@type": "VideoObject", name: s(d.name), description: s(d.description) || s(d.name), thumbnailUrl: s(d.thumbnail) ? [s(d.thumbnail)] : undefined,
        uploadDate: s(d.uploadDate) || new Date().toISOString().slice(0, 10), contentUrl: s(d.contentUrl), embedUrl: s(d.embedUrl), duration: s(d.duration) }) : null;
    case "Event":
      return s(d.name) && s(d.startDate) ? clean({ "@type": "Event", name: s(d.name), description: s(d.description), startDate: s(d.startDate), endDate: s(d.endDate), image: s(d.image) ? [s(d.image)] : undefined,
        eventAttendanceMode: s(d.online) === "yes" ? "https://schema.org/OnlineEventAttendanceMode" : "https://schema.org/OfflineEventAttendanceMode",
        location: s(d.location) ? { "@type": "Place", name: s(d.location), address: s(d.address) || s(d.location) } : undefined }) : null;
    case "Service":
      return s(d.name) ? clean({ "@type": "Service", name: s(d.name), description: s(d.description), serviceType: s(d.serviceType), areaServed: s(d.areaServed) || "Bangladesh", provider: s(d.provider) ? { "@type": "Organization", name: s(d.provider) } : undefined }) : null;
    case "Custom": {
      try { const j = JSON.parse(s(d.json)); return j && typeof j === "object" && !Array.isArray(j) ? (delete (j as Record<string, unknown>)["@context"], j) : null; } catch { return null; }
    }
  }
}

export function schemaNodes(items: SchemaItem[] | undefined) {
  return (items ?? []).map(buildSchema).filter(Boolean) as Record<string, unknown>[];
}

/** Simple on-page checks for a focus keyword. */
export function seoChecks(seo: SeoData, ctx: { title: string; slug?: string; text?: string }) {
  const k = (seo.keyword ?? "").trim().toLowerCase();
  const title = (seo.title || ctx.title).trim();
  const desc = (seo.description ?? "").trim();
  const checks: { ok: boolean; label: string }[] = [
    { ok: title.length >= 30 && title.length <= 60, label: `Title length is ${title.length} (best 30 to 60)` },
    { ok: desc.length >= 90 && desc.length <= 160, label: `Description length is ${desc.length} (best 90 to 160)` },
  ];
  if (k) {
    checks.push({ ok: title.toLowerCase().includes(k), label: "Keyword is in the title" });
    checks.push({ ok: desc.toLowerCase().includes(k), label: "Keyword is in the description" });
    if (ctx.slug !== undefined) checks.push({ ok: (ctx.slug ?? "").replace(/-/g, " ").includes(k.replace(/-/g, " ")) || (ctx.slug ?? "").includes(k.replace(/\s+/g, "-")), label: "Keyword is in the address (URL)" });
    if (ctx.text !== undefined) checks.push({ ok: ctx.text.toLowerCase().includes(k), label: "Keyword appears in the content" });
  } else checks.push({ ok: false, label: "Set a focus keyword to run keyword checks" });
  return checks;
}
