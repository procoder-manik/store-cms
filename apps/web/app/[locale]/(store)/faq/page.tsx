import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronDown } from "lucide-react";
import { getFaqs } from "@/lib/data/catalog";
import { JsonLd, graph } from "@/lib/seo/jsonld";

export const revalidate = 300;
export async function generateMetadata() {
  const t = await getTranslations("misc");
  return { title: t("faqTitle"), alternates: { canonical: "/faq" } };
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("misc");
  const faqs = await getFaqs();
  return (
    <div className="container-x py-12 md:py-20">
      <JsonLd data={graph({ "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) })} />
      <div className="mx-auto max-w-3xl">
        <h1 className="headline text-[36px] md:text-[48px]">{t("faqTitle")}</h1>
        <div className="mt-8 divide-y divide-[var(--border)] overflow-hidden rounded-[20px] bg-surface shadow-card">
          {faqs.map((f) => (
            <details key={f.id} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-medium">
                {f.question}<ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">{f.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
