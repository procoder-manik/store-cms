import { getLocale, getTranslations } from "next-intl/server";
import { sectionDef, type SectionRow } from "@/lib/sections/registry";
import { brandLogos, getFaqs, productPhotos, recentQuotes, sectionCategories, sectionProducts } from "@/lib/sections/data";
import { getActiveFlashSale } from "@/lib/data/catalog";
import { sanitizeLoose, sanitizeRich } from "@/lib/security/sanitize";
import { Countdown } from "@/components/store/home/countdown";
import { ProductCard } from "@/components/store/product-card";
import { Newsletter } from "@/components/store/home/newsletter";
import { Hero } from "./hero";
import { Carousel } from "./carousel";
import { ProductTabs } from "./product-tabs";
import {
  BannerBlock, BrandsBlock, CategoriesBlock, CountdownBlock, FaqBlock, FeaturesBlock, GalleryBlock, ImageTextBlock,
  ProductsBlock, RichTextBlock, SectionHead, TestimonialsBlock, VideoBlock,
} from "./blocks";

/** Renders a list of page-builder sections (home page and CMS pages). */
export async function Sections({ rows }: { rows: SectionRow[] }) {
  const locale = await getLocale();
  const t = await getTranslations("home");
  const tm = await getTranslations("misc");
  const ts = await getTranslations("shop");

  const rendered = await Promise.all(rows.filter((r) => r.is_active !== false).map(async (r, index) => {
    const def = sectionDef(r.type);
    if (!def) return null;
    const c = { ...def.defaults, ...(r.config ?? {}) } as Record<string, unknown>;
    const title = r.title;
    const key = r.id ?? `${r.type}-${index}`;
    switch (def.type) {
      case "hero": {
        const needsProducts = String(c.variant) !== "slider" || !(Array.isArray(c.slides) && c.slides.length);
        const products = needsProducts ? await sectionProducts(c, 6) : [];
        return <Hero key={key} c={c} products={products} fallbackTitle={t("heroTitle")} fallbackBody={t("heroBody")} />;
      }
      case "categories":
        return <CategoriesBlock key={key} c={c} title={title ?? t("categories")} cats={await sectionCategories(c)} locale={locale} />;
      case "products": {
        if (c.variant === "tabs") {
          const card = (String(c.card || "") || undefined) as never;
          const lim = Number(c.limit) || 8;
          const [a, b, d] = await Promise.all([sectionProducts({ ...c, source: "newest" }, lim), sectionProducts({ ...c, source: "best_selling" }, lim), sectionProducts({ ...c, source: "on_sale" }, lim)]);
          const tabs = [{ label: ts("sorts.newest"), items: a }, { label: ts("sorts.popular"), items: b }, { label: ts("deals"), items: d }].filter((x) => x.items.length);
          if (!tabs.length) return null;
          return <section key={key} className="container-x mt-16 md:mt-24"><SectionHead title={title} subtitle={String(c.subtitle ?? "")} center /><ProductTabs tabs={tabs} card={card} /></section>;
        }
        return <ProductsBlock key={key} c={c} title={title ?? t("newArrivals")} products={await sectionProducts(c)} more={t("viewAll")} />;
      }
      case "flash_sale": {
        const sale = await getActiveFlashSale();
        if (!sale || !sale.products.length) return null;
        if (c.variant === "carousel") {
          return (
            <section key={key} className="container-x mt-16 md:mt-24">
              <div className="rounded-[var(--radius-sheet)] bg-accent p-5 text-accent-contrast md:p-8">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="headline text-[26px] md:text-[34px]">{title ?? sale.title}</h2><span className="flex items-center gap-2 text-[14px]">{tm("endsIn")} <Countdown to={sale.endsAt} /></span></div>
                <Carousel>{sale.products.map((p) => <div key={p.id} className="rounded-[var(--radius-card)] bg-surface p-2 text-fg"><ProductCard product={p} /></div>)}</Carousel>
              </div>
            </section>
          );
        }
        return (
          <section key={key} className="container-x mt-16 md:mt-24">
            <div className="mb-6 flex flex-wrap items-center gap-4"><h2 className="headline text-[26px] md:text-[36px]">{title ?? sale.title}</h2><span className="flex items-center gap-2 text-[14px] text-fg-muted">{tm("endsIn")} <Countdown to={sale.endsAt} /></span></div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">{sale.products.map((p) => <ProductCard key={p.id} product={p} />)}</div>
          </section>
        );
      }
      case "banner": return <BannerBlock key={key} c={c} />;
      case "countdown": return <CountdownBlock key={key} c={c} title={title} />;
      case "features":
        return <FeaturesBlock key={key} c={c} defaults={[
          { icon: "cash", title: t("perks.cod"), text: t("perks.codBody") }, { icon: "return", title: t("perks.returns"), text: t("perks.returnsBody") },
          { icon: "shield", title: t("perks.secure"), text: t("perks.secureBody") }, { icon: "truck", title: t("perks.delivery"), text: t("perks.deliveryBody") }]} />;
      case "image_text": return <ImageTextBlock key={key} c={c} title={title} />;
      case "testimonials": return <TestimonialsBlock key={key} c={c} title={title} quotes={await recentQuotes()} />;
      case "brands": return <BrandsBlock key={key} c={c} title={title} logos={await brandLogos()} />;
      case "gallery": return <GalleryBlock key={key} c={c} title={title} photos={await productPhotos()} />;
      case "newsletter": return <Newsletter key={key} variant={String(c.variant)} title={title} subtitle={String(c.subtitle ?? "")} image={String(c.image ?? "") || null} />;
      case "video": return <VideoBlock key={key} c={c} title={title} />;
      case "faq": return <FaqBlock key={key} title={title ?? tm("faqTitle")} faqs={(await getFaqs()).slice(0, Number(c.limit) || 6)} />;
      case "html":
        return <section key={key} className={c.width === "full" ? "mt-16 md:mt-24" : "container-x mt-16 md:mt-24"} dangerouslySetInnerHTML={{ __html: sanitizeLoose(String(c.html ?? "")) }} />;
      case "rich_text": return <RichTextBlock key={key} title={title} html={sanitizeRich(String(c.html ?? ""))} />;
      default: return null;
    }
  }));
  return <>{rendered}</>;
}
