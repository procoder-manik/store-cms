import { absoluteUrl } from "@/lib/utils";

/** Page-level JSON-LD graph. Organization and WebSite are added once for the whole site (see SiteSchema). */
export function graph(...nodes: Record<string, unknown>[]) {
  return { "@context": "https://schema.org", "@graph": nodes };
}

export function breadcrumb(items: { name: string; url: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.url) })),
  };
}

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
