import { describe, expect, it } from "vitest";
import { buildSchema, schemaNodes, seoChecks } from "@/lib/seo/model";
import { resolveTemplates, DEFAULT_TEMPLATES } from "@/lib/theme/templates";
import { buildMetadata } from "@/lib/seo/meta";
import { readPostTypes, RESERVED_PATHS } from "@/lib/content/post-types";
import { sanitizeCss, sanitizeLoose } from "@/lib/security/sanitize";

describe("schema generator", () => {
  it("builds valid FAQ markup and skips empty rows", () => {
    const n = buildSchema({ id: "a", type: "FAQPage", data: { items: [{ q: "Is COD available?", a: "Yes, all over Bangladesh." }, { q: "", a: "x" }] } })!;
    expect(n["@type"]).toBe("FAQPage");
    expect((n.mainEntity as unknown[]).length).toBe(1);
  });
  it("needs required fields", () => {
    expect(buildSchema({ id: "a", type: "HowTo", data: { name: "Set up" } })).toBeNull();
    expect(buildSchema({ id: "b", type: "Event", data: { name: "Sale" } })).toBeNull();
  });
  it("accepts custom JSON-LD and strips the context", () => {
    const n = buildSchema({ id: "c", type: "Custom", data: { json: '{"@context":"https://schema.org","@type":"Product","name":"X"}' } })!;
    expect(n["@type"]).toBe("Product");
    expect(n["@context"]).toBeUndefined();
    expect(buildSchema({ id: "d", type: "Custom", data: { json: "{bad" } })).toBeNull();
  });
  it("local business keeps opening hours as a list", () => {
    const n = buildSchema({ id: "e", type: "LocalBusiness", data: { name: "Shop", hours: "Mo-Sa 10:00-20:00\nSu 12:00-18:00" } })!;
    expect(n.openingHours).toEqual(["Mo-Sa 10:00-20:00", "Su 12:00-18:00"]);
    expect(schemaNodes([{ id: "x", type: "Service", data: {} }])).toEqual([]);
  });
});

describe("seo checks and metadata", () => {
  it("checks the focus keyword", () => {
    const c = seoChecks({ keyword: "moon lamp", title: "Moon lamp with remote", description: "A moon lamp that glows" }, { title: "x", slug: "moon-lamp" });
    expect(c.filter((x) => x.label.includes("Keyword")).every((x) => x.ok)).toBe(true);
  });
  it("noindex and canonical flow into metadata", () => {
    const m = buildMetadata({ seo: { noindex: true, canonical: "https://a.com/x", og_title: "Share me" }, title: "T", path: "/p" });
    expect(m.robots).toEqual({ index: false, follow: true });
    expect(m.alternates?.canonical).toBe("https://a.com/x");
    expect(m.openGraph?.title).toBe("Share me");
  });
});

describe("templates and post types", () => {
  it("fills missing template values with defaults", () => {
    expect(resolveTemplates({ shop: { columns: 3 } }).shop.columns).toBe(3);
    expect(resolveTemplates({ shop: { columns: 3 } }).product).toEqual(DEFAULT_TEMPLATES.product);
    expect(resolveTemplates(null).blog.per_page).toBe(9);
  });
  it("refuses post type addresses used by the store", () => {
    expect(RESERVED_PATHS.has("shop")).toBe(true);
    expect(readPostTypes({ types: [{ id: "x", label: "X", path: "shop" }] })[0]!.id).toBe("post");
  });
});

describe("code safety", () => {
  it("loose HTML keeps layout but drops scripts and handlers", () => {
    const out = sanitizeLoose('<div style="color:red" onclick="x()"><script>alert(1)</script><a href="javascript:alert(1)">a</a><svg viewBox="0 0 1 1"><path d="M0 0"/></svg></div>');
    expect(out).toContain("style=");
    expect(out).toContain("<svg");
    expect(out).not.toMatch(/<script|onclick|javascript:/i);
  });
  it("css cannot break out of its style tag", () => {
    expect(sanitizeCss("a{color:red}</style><script>x</script>")).not.toMatch(/<\/?style/i);
    expect(sanitizeCss("@import url(x);a{b:c}")).not.toContain("@import");
  });
});
