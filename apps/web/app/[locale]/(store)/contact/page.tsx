import { getTranslations, setRequestLocale } from "next-intl/server";
import { Mail, MapPin, Phone } from "lucide-react";
import { getSetting } from "@/lib/data/catalog";
import { ContactForm, type ContactConfig } from "./contact-form";

export async function generateMetadata() {
  const t = await getTranslations("misc");
  return { title: t("contactTitle"), alternates: { canonical: "/contact" } };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("misc");
  const store = await getSetting<{ email?: string; phone?: string; address?: string }>("store");
  return (
    <div className="container-x py-12 md:py-20">
      <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div>
          <h1 className="headline text-[36px] md:text-[48px]">{t("contactTitle")}</h1>
          <p className="mt-3 text-fg-muted">{t("contactBody")}</p>
          <ul className="mt-8 space-y-4 text-[15px]">
            {store?.phone && <li className="flex gap-3"><Phone className="h-5 w-5 text-accent" /><a href={`tel:${store.phone}`}>{store.phone}</a></li>}
            {store?.email && <li className="flex gap-3"><Mail className="h-5 w-5 text-accent" /><a href={`mailto:${store.email}`}>{store.email}</a></li>}
            {store?.address && <li className="flex gap-3"><MapPin className="h-5 w-5 text-accent" />{store.address}</li>}
          </ul>
        </div>
        <ContactForm config={(await getSetting<ContactConfig>("contact_form")) ?? undefined} />
      </div>
    </div>
  );
}
