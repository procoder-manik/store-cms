"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Heart, Menu, Phone, Search, ShoppingBag, User, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { cn } from "@/lib/utils";
import type { HeaderId } from "@/lib/theme/presets";
import { SearchBox } from "./search-box";
import { useCart } from "./cart/cart-provider";

export interface HeaderCategory { slug: string; name: string; nameBn: string | null }
export interface HeaderMenuItem { label: string; label_bn?: string; url: string; new_tab?: boolean; children?: HeaderMenuItem[] }
interface Props { siteName: string; logo?: string | null; variant?: HeaderId; categories?: HeaderCategory[]; phone?: string | null; menu?: HeaderMenuItem[] }

function Logo({ siteName, logo, className }: { siteName: string; logo?: string | null; className?: string }) {
  return (
    <Link href="/" className={cn("flex shrink-0 items-center text-[20px] font-semibold tracking-tight headline", className)} aria-label={siteName}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {logo ? <img src={logo} alt={siteName} className="h-8 w-auto" /> : siteName}
    </Link>
  );
}

function IconLink({ href, label, children, className }: { href: string; label: string; children: React.ReactNode; className?: string }) {
  return <Link href={href} aria-label={label} className={cn("flex h-10 w-10 items-center justify-center rounded-full hover:bg-fill", className)}>{children}</Link>;
}

function CartButton() {
  const t = useTranslations("nav");
  const { count, openCart } = useCart();
  return (
    <button onClick={openCart} aria-label={`${t("cart")} (${count})`} className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-fill">
      <ShoppingBag className="h-5 w-5" />
      {count > 0 && <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold text-accent-contrast">{count > 99 ? "99+" : count}</span>}
    </button>
  );
}

/** Slide-in menu for phones (and for the Minimal header on every screen). */
function Drawer({ open, onClose, siteName, logo, categories, menu = [] }: { open: boolean; onClose: () => void; siteName: string; logo?: string | null; categories: HeaderCategory[]; menu?: HeaderMenuItem[] }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", esc); };
  }, [open, onClose]);
  if (typeof document === "undefined") return null;
  const links: [string, string][] = menu.length
    ? [...menu.flatMap((m) => [[m.url, (locale === "bn" && m.label_bn) || m.label] as [string, string], ...(m.children ?? []).map((c) => [c.url, `${(locale === "bn" && c.label_bn) || c.label}`] as [string, string])]), ["/account", t("account")]]
    : [["/shop", t("shop")], ["/deals", t("deals")], ["/categories", t("categories")], ["/account/wishlist", t("wishlist")], ["/account", t("account")]];
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]">
          <motion.div className="absolute inset-0 bg-black/30" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.aside role="dialog" aria-modal="true" aria-label="Menu" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="glass absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col border-y-0 border-l-0 shadow-float">
            <div className="flex items-center justify-between px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
              <Logo siteName={siteName} logo={logo} />
              <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-fill"><X className="h-4 w-4" /></button>
            </div>
            <div className="px-5 pb-3"><SearchBox /></div>
            <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Main">
              <ul>{links.map(([href, label]) => (
                <li key={href}><Link href={href} onClick={onClose} className="flex items-center justify-between rounded-[12px] px-3 py-3 text-[16px] font-medium hover:bg-fill">{label}<ChevronRight className="h-4 w-4 text-fg-subtle" /></Link></li>
              ))}</ul>
              {!menu.length && categories.length > 0 && (
                <>
                  <p className="mt-4 px-3 text-[12px] font-semibold text-fg-subtle">{t("categories")}</p>
                  <ul className="mt-1">{categories.map((c) => (
                    <li key={c.slug}><Link href={`/category/${c.slug}`} onClick={onClose} className="block rounded-[12px] px-3 py-2.5 text-[15px] text-fg-muted hover:bg-fill hover:text-fg">{locale === "bn" && c.nameBn ? c.nameBn : c.name}</Link></li>
                  ))}</ul>
                </>
              )}
            </nav>
            <div className="flex items-center justify-between border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <LocaleSwitcher />
              <ThemeToggle align="right" />
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function Header({ siteName, logo, variant = "glass", categories = [], phone, menu = [] }: Props) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [drawer, setDrawer] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setDrawer(false), [pathname]);
  const catName = (c: HeaderCategory) => (locale === "bn" && c.nameBn ? c.nameBn : c.name);
  const label = (m: HeaderMenuItem) => (locale === "bn" && m.label_bn ? m.label_bn : m.label);
  const defaultNav: HeaderMenuItem[] = [{ label: t("shop"), url: "/shop" }, { label: t("categories"), url: "/categories" }, { label: t("deals"), url: "/deals" }];
  const navItems = menu.length ? menu : defaultNav;
  const external = (u: string) => /^(https?:|mailto:|tel:)/.test(u);
  const NavLink = ({ m, className }: { m: HeaderMenuItem; className?: string }) => external(m.url)
    ? <a href={m.url} target={m.new_tab ? "_blank" : undefined} rel={m.new_tab ? "noopener noreferrer" : undefined} className={className}>{label(m)}</a>
    : <Link href={m.url || "/"} className={className}>{label(m)}</Link>;
  /** Link with an optional hover and focus dropdown. */
  const NavItem = ({ m, className }: { m: HeaderMenuItem; className: string }) => !m.children?.length ? <NavLink m={m} className={className} /> : (
    <div className="group/dd relative">
      <NavLink m={m} className={cn(className, "inline-flex items-center gap-1")} />
      <div className="invisible absolute left-0 top-full z-50 min-w-[200px] pt-2 opacity-0 transition-all duration-150 group-focus-within/dd:visible group-focus-within/dd:opacity-100 group-hover/dd:visible group-hover/dd:opacity-100">
        <div className="glass rounded-[16px] p-1.5 shadow-float">{m.children.map((c) => <NavLink key={c.url + c.label} m={c} className="block rounded-[10px] px-3 py-2 text-[14px] text-fg-muted hover:bg-fill hover:text-fg" />)}</div>
      </div>
    </div>
  );

  const burger = (always = false) => (
    <button onClick={() => setDrawer(true)} aria-label="Menu" className={cn("flex h-10 w-10 items-center justify-center rounded-full hover:bg-fill", !always && "lg:hidden")}>
      <Menu className="h-5 w-5" />
    </button>
  );
  const tools = (
    <div className="flex items-center gap-0.5">
      <LocaleSwitcher className="hidden md:inline-flex" />
      <ThemeToggle className="hidden sm:block" />
      <IconLink href="/search" label={t("search")} className="md:hidden"><Search className="h-5 w-5" /></IconLink>
      <IconLink href="/account/wishlist" label={t("wishlist")} className="hidden md:flex"><Heart className="h-5 w-5" /></IconLink>
      <IconLink href="/account" label={t("account")} className="hidden md:flex"><User className="h-5 w-5" /></IconLink>
      <CartButton />
    </div>
  );
  const drawerEl = <Drawer open={drawer} onClose={() => setDrawer(false)} siteName={siteName} logo={logo} categories={categories} menu={menu} />;

  if (variant === "centered") {
    return (
      <header className={cn("site-header sticky top-0 z-40 bg-surface/95 backdrop-blur transition-shadow", scrolled && "shadow-card")}>
        <div className="container-x grid h-16 grid-cols-[1fr_auto_1fr] items-center">
          <div className="flex items-center gap-1">{burger()}<SearchBox className="hidden w-full max-w-[260px] lg:block" /></div>
          <Logo siteName={siteName} logo={logo} className="text-[24px] md:text-[28px]" />
          <div className="flex justify-end">{tools}</div>
        </div>
        <nav aria-label="Main" className="hidden border-t border-line lg:block">
          <ul className="container-x no-scrollbar flex h-11 items-center justify-center gap-7 overflow-x-auto text-[14px]">
            {navItems.map((m) => <li key={m.url + m.label}><NavItem m={m} className="text-fg-muted hover:text-fg" /></li>)}
            {!menu.length && categories.slice(0, 6).map((c) => <li key={c.slug}><Link href={`/category/${c.slug}`} className="whitespace-nowrap text-fg-muted hover:text-fg">{catName(c)}</Link></li>)}
          </ul>
        </nav>
        {drawerEl}
      </header>
    );
  }

  if (variant === "bold") {
    return (
      <header className="site-header sticky top-0 z-40">
        <div className="hidden bg-accent text-accent-contrast md:block">
          <div className="container-x flex h-9 items-center justify-between text-[12px]">
            <span className="flex items-center gap-1.5">{phone && <><Phone className="h-3.5 w-3.5" />{phone}</>}</span>
            <span className="flex items-center gap-5"><Link href="/track-order" className="hover:underline">{t("track")}</Link><Link href="/pages/shipping-policy" className="hover:underline">{t("delivery")}</Link></span>
          </div>
        </div>
        <div className={cn("bg-surface transition-shadow", scrolled && "shadow-card")}>
          <div className="container-x flex h-16 items-center gap-3 md:h-[72px] md:gap-6">
            {burger()}
            <Logo siteName={siteName} logo={logo} />
            <SearchBox className="hidden flex-1 md:block [&_input]:h-11" />
            <div className="ml-auto md:ml-0">{tools}</div>
          </div>
          <nav aria-label="Categories" className="hidden border-t border-line lg:block">
            <ul className="container-x no-scrollbar flex h-11 items-center gap-6 overflow-x-auto text-[14px] font-medium">
              <li><Link href="/shop" className="flex items-center gap-1.5 text-accent"><Menu className="h-4 w-4" />{t("allCategories")}</Link></li>
              {menu.length
                ? menu.map((m) => <li key={m.url + m.label}><NavItem m={m} className="whitespace-nowrap text-fg-muted hover:text-fg" /></li>)
                : categories.slice(0, 9).map((c) => <li key={c.slug}><Link href={`/category/${c.slug}`} className="whitespace-nowrap text-fg-muted hover:text-fg">{catName(c)}</Link></li>)}
              <li className="ml-auto"><Link href="/deals" className="whitespace-nowrap text-sale">{t("deals")}</Link></li>
            </ul>
          </nav>
        </div>
        {drawerEl}
      </header>
    );
  }

  if (variant === "minimal") {
    return (
      <header className={cn("site-header sticky top-0 z-40 transition-colors duration-300", scrolled ? "glass border-x-0 border-t-0" : "border-b border-transparent")}>
        <div className="container-x flex h-14 items-center gap-2 md:h-16">
          {burger(true)}
          <Logo siteName={siteName} logo={logo} />
          <div className="ml-auto">{tools}</div>
        </div>
        {drawerEl}
      </header>
    );
  }

  // glass (default)
  return (
    <header className={cn("site-header sticky top-0 z-40 transition-colors duration-300", scrolled ? "glass border-x-0 border-t-0" : "border-b border-transparent")}>
      <div className="container-x flex h-14 items-center gap-2 md:h-16 md:gap-4">
        {burger()}
        <Logo siteName={siteName} logo={logo} />
        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Main">
          {navItems.map((m) => <NavItem key={m.url + m.label} m={m} className="rounded-full px-3 py-1.5 text-[14px] text-fg-muted hover:bg-fill hover:text-fg" />)}
        </nav>
        <SearchBox className="ml-auto hidden w-full max-w-xs md:block" />
        <div className="ml-auto md:ml-1">{tools}</div>
      </div>
      {drawerEl}
    </header>
  );
}
