import { getLocale, getTranslations } from "next-intl/server";
import { Facebook, Instagram, Mail, MapPin, Phone, Youtube } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { cn } from "@/lib/utils";
import type { FooterId } from "@/lib/theme/presets";
import { FooterNewsletter } from "./footer-newsletter";
import type { HeaderCategory } from "./header";
import type { MenuItem } from "@/lib/data/menus";

interface Props {
  siteName: string; variant?: FooterId; tagline?: string; logo?: string | null;
  store?: { phone?: string; email?: string; address?: string };
  social?: { facebook?: string; instagram?: string; youtube?: string; tiktok?: string; whatsapp?: string };
  categories?: HeaderCategory[];
  menus?: { help?: MenuItem[]; company?: MenuItem[] };
}

const PAY = ["bKash", "Nagad", "Visa", "Mastercard", "Cash on delivery"];

export async function Footer({ siteName, variant = "columns", tagline, logo, store = {}, social = {}, categories = [], menus = {} }: Props) {
  const t = await getTranslations("footer");
  const locale = await getLocale();
  const year = new Date().getFullYear();
  const lab = (m: MenuItem) => (locale === "bn" && m.label_bn ? m.label_bn : m.label);
  const groups = [
    { title: t("help"), links: menus.help?.length ? menus.help.map((m) => [m.url, lab(m)]) : [["/track-order", t("track")], ["/faq", t("faq")], ["/pages/return-policy", t("returns")], ["/contact", t("contact")]] },
    { title: t("company"), links: menus.company?.length ? menus.company.map((m) => [m.url, lab(m)]) : [["/pages/about", t("about")], ["/blog", t("blog")], ["/catalog", t("catalog")], ["/pages/privacy-policy", t("privacy")], ["/pages/terms", t("terms")]] },
    ...(categories.length ? [{ title: t("shop"), links: categories.slice(0, 5).map((c) => [`/category/${c.slug}`, locale === "bn" && c.nameBn ? c.nameBn : c.name]) }] : []),
  ];
  const socials = [
    social.facebook && { href: social.facebook, icon: Facebook, label: "Facebook" },
    social.instagram && { href: social.instagram, icon: Instagram, label: "Instagram" },
    social.youtube && { href: social.youtube, icon: Youtube, label: "YouTube" },
  ].filter(Boolean) as { href: string; icon: typeof Facebook; label: string }[];

  const Wordmark = ({ className }: { className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    logo ? <img src={logo} alt={siteName} className={cn("h-8 w-auto", className)} /> : <p className={cn("headline text-[22px]", className)}>{siteName}</p>
  );
  const Contact = ({ muted }: { muted: string }) => (
    <ul className={cn("mt-4 space-y-2 text-[13px]", muted)}>
      {store.phone && <li className="flex items-center gap-2"><Phone className="h-4 w-4" /><a href={`tel:${store.phone}`}>{store.phone}</a></li>}
      {store.email && <li className="flex items-center gap-2"><Mail className="h-4 w-4" /><a href={`mailto:${store.email}`}>{store.email}</a></li>}
      {store.address && <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{store.address}</li>}
    </ul>
  );
  const Columns = ({ muted, strong }: { muted: string; strong: string }) => (
    <>
      {groups.map((g) => (
        <div key={g.title}>
          <p className={cn("text-[13px] font-semibold", strong)}>{g.title}</p>
          <ul className="mt-3 space-y-2">{g.links.map(([href, label]) => <li key={`${href}-${label}`}><Link href={href || "/"} className={cn("text-[13px] hover:underline", muted)}>{label}</Link></li>)}</ul>
        </div>
      ))}
    </>
  );
  const Socials = ({ className }: { className?: string }) => socials.length ? (
    <div className={cn("flex gap-2", className)}>{socials.map(({ href, icon: Icon, label }) => (
      <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} className="flex h-9 w-9 items-center justify-center rounded-full bg-fill hover:bg-accent hover:text-accent-contrast"><Icon className="h-4 w-4" /></a>
    ))}</div>
  ) : null;
  const Bottom = ({ className }: { className?: string }) => (
    <div className={cn("container-x flex flex-col gap-3 py-5 text-[12px] sm:flex-row sm:items-center sm:justify-between", className)}>
      <span>© {year} {siteName}. {t("rights")}</span>
      <span className="flex flex-wrap gap-1.5">{PAY.map((p) => <span key={p} className="rounded-md border border-current/20 px-2 py-0.5 opacity-80">{p}</span>)}</span>
    </div>
  );

  if (variant === "minimal") {
    return (
      <footer className="site-footer mt-24 border-t border-line pb-24 md:pb-0">
        <div className="container-x flex flex-col items-start gap-5 py-8 md:flex-row md:items-center md:justify-between">
          <Wordmark />
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-fg-muted">
            {groups.slice(0, 2).flatMap((g) => g.links).map(([href, label]) => <Link key={`${href}-${label}`} href={href || "/"} className="hover:text-fg">{label}</Link>)}
          </nav>
          <div className="flex items-center gap-2"><LocaleSwitcher /><ThemeToggle /></div>
        </div>
        <Bottom className="border-t border-line text-fg-subtle" />
      </footer>
    );
  }

  if (variant === "dark") {
    return (
      <footer className="site-footer mt-24 bg-[#0b0b0d] pb-24 text-[#f5f5f7] md:pb-0">
        <div className="container-x py-12">
          <div className="grid gap-6 rounded-[var(--radius-sheet)] bg-white/[0.06] p-6 md:grid-cols-2 md:items-center md:p-10">
            <div><p className="headline text-[26px] md:text-[32px]">{t("newsletterTitle")}</p><p className="mt-2 text-[14px] text-white/60">{t("newsletterBody")}</p></div>
            <FooterNewsletter dark />
          </div>
          <div className="mt-12 grid gap-10 md:grid-cols-5">
            <div className="md:col-span-2"><Wordmark className={logo ? "brightness-0 invert" : ""} />{tagline && <p className="mt-3 max-w-xs text-[13px] text-white/60">{tagline}</p>}<Contact muted="text-white/60" /></div>
            <Columns muted="text-white/60" strong="text-white" />
          </div>
        </div>
        <Bottom className="border-t border-white/10 text-white/50" />
      </footer>
    );
  }

  if (variant === "brand") {
    return (
      <footer className="site-footer mt-24 bg-accent pb-24 text-accent-contrast md:pb-0">
        <div className="container-x grid gap-10 py-12 md:grid-cols-5">
          <div className="md:col-span-2">{tagline && <p className="max-w-sm text-[15px] opacity-80">{tagline}</p>}<Contact muted="opacity-80" /><div className="mt-5"><FooterNewsletter /></div></div>
          <Columns muted="opacity-80" strong="" />
        </div>
        <div className="container-x overflow-hidden"><p className="headline select-none whitespace-nowrap text-[18vw] leading-[0.8] opacity-95 md:text-[14vw]" aria-hidden>{siteName}</p></div>
        <Bottom className="border-t border-current/15 opacity-80" />
      </footer>
    );
  }

  // columns
  return (
    <footer className="site-footer mt-24 border-t border-line bg-surface-2 pb-24 md:pb-0">
      <div className="container-x grid gap-10 py-12 md:grid-cols-6">
        <div className="md:col-span-2">
          <Wordmark />
          {tagline && <p className="mt-3 max-w-xs text-[13px] text-fg-muted">{tagline}</p>}
          <Contact muted="text-fg-muted" />
          <Socials className="mt-4" />
        </div>
        <Columns muted="text-fg-muted" strong="text-fg" />
        <div className="md:col-span-1">
          <p className="text-[13px] font-semibold">{t("settings")}</p>
          <div className="mt-3 flex flex-col items-start gap-2"><LocaleSwitcher /><ThemeToggle align="left" /></div>
        </div>
      </div>
      <Bottom className="border-t border-line text-fg-subtle" />
    </footer>
  );
}
