"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard, Package, FolderTree, ShoppingCart, Users, Star, TicketPercent, Megaphone,
  FileText, Image as ImageIcon, Search, Truck, CreditCard, Mail, BarChart3, Download, Bot,
  ShieldCheck, Settings, ScrollText, Menu, X, Palette, LayoutTemplate, Files, Newspaper, Rocket,
  BadgeCheck, Tags, PanelsTopLeft, ListTree, Code2, Braces, Redo2, HeartPulse, ChevronDown, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: LucideIcon; perm: string; hint?: string };
type Group = { id: string; label: string; icon: LucideIcon; items: Item[] };

/** Admin menu, grouped like WordPress. Also used by the quick search. */
export const ADMIN_GROUPS: (Item | Group)[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, perm: "dashboard.view" },
  { id: "shop", label: "Shop", icon: ShoppingCart, items: [
    { href: "/admin/orders", label: "Orders", icon: ShoppingCart, perm: "orders.view" },
    { href: "/admin/products", label: "Products", icon: Package, perm: "products.view" },
    { href: "/admin/categories", label: "Categories", icon: FolderTree, perm: "categories.view" },
    { href: "/admin/brands", label: "Brands", icon: BadgeCheck, perm: "products.view" },
    { href: "/admin/tags", label: "Tags", icon: Tags, perm: "products.view" },
    { href: "/admin/coupons", label: "Coupons", icon: TicketPercent, perm: "coupons.view" },
    { href: "/admin/reviews", label: "Reviews and questions", icon: Star, perm: "reviews.view" },
    { href: "/admin/imports", label: "Import products", icon: Download, perm: "imports.view" },
  ] },
  { href: "/admin/customers", label: "Customers", icon: Users, perm: "customers.view" },
  { id: "content", label: "Content", icon: Files, items: [
    { href: "/admin/pages", label: "Pages", icon: Files, perm: "content.view" },
    { href: "/admin/posts", label: "Posts", icon: Newspaper, perm: "content.view" },
    { href: "/admin/landing", label: "Landing pages", icon: Rocket, perm: "content.view" },
    { href: "/admin/media", label: "Media library", icon: ImageIcon, perm: "media.view" },
    { href: "/admin/content", label: "FAQ and forms", icon: FileText, perm: "content.view" },
  ] },
  { id: "design", label: "Design", icon: Palette, items: [
    { href: "/admin/appearance", label: "Themes and style", icon: Palette, perm: "settings.view" },
    { href: "/admin/builder", label: "Page builder", icon: LayoutTemplate, perm: "content.view" },
    { href: "/admin/templates", label: "Page templates", icon: PanelsTopLeft, perm: "content.view" },
    { href: "/admin/menus", label: "Menus", icon: ListTree, perm: "content.view" },
    { href: "/admin/custom-code", label: "Custom code", icon: Code2, perm: "code.update" },
  ] },
  { id: "marketing", label: "Marketing", icon: Megaphone, items: [
    { href: "/admin/marketing", label: "Banners, popups, sales", icon: Megaphone, perm: "marketing.view" },
    { href: "/admin/emails", label: "Emails", icon: Mail, perm: "emails.view" },
    { href: "/admin/chatbot", label: "AI chatbot", icon: Bot, perm: "chatbot.view" },
  ] },
  { id: "seo", label: "SEO and tracking", icon: Search, items: [
    { href: "/admin/seo", label: "SEO settings", icon: Search, perm: "seo.view" },
    { href: "/admin/seo?tab=schema", label: "Schema markup", icon: Braces, perm: "seo.view" },
    { href: "/admin/seo?tab=redirects", label: "Redirects and 404s", icon: Redo2, perm: "seo.view" },
    { href: "/admin/seo?tab=tracking", label: "Analytics and pixels", icon: BarChart3, perm: "seo.view" },
  ] },
  { href: "/admin/reports", label: "Reports", icon: BarChart3, perm: "reports.view" },
  { id: "settings", label: "Settings", icon: Settings, items: [
    { href: "/admin/settings", label: "General and checkout", icon: Settings, perm: "settings.view" },
    { href: "/admin/shipping", label: "Shipping zones", icon: Truck, perm: "shipping.view" },
    { href: "/admin/payments", label: "Payments", icon: CreditCard, perm: "payments.view" },
    { href: "/admin/users", label: "Staff and roles", icon: ShieldCheck, perm: "users.view" },
    { href: "/admin/audit", label: "Activity log", icon: ScrollText, perm: "audit.view" },
    { href: "/admin/health", label: "Site health", icon: HeartPulse, perm: "dashboard.view" },
  ] },
];
export const isGroup = (x: Item | Group): x is Group => "items" in x;
export const flatNav = () => ADMIN_GROUPS.flatMap((g) => (isGroup(g) ? g.items : [g]));

function NavList({ permissions, onNavigate }: { permissions: string[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const all = permissions.includes("*");
  const allowed = (i: Item) => all || permissions.includes(i.perm);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  useEffect(() => { try { setOpen(JSON.parse(localStorage.getItem("admin_nav") ?? "{}")); } catch { /* ignore */ } }, []);
  const toggle = (id: string) => setOpen((o) => { const n = { ...o, [id]: !(o[id] ?? false) }; try { localStorage.setItem("admin_nav", JSON.stringify(n)); } catch { /* ignore */ } return n; });
  const activeHref = (href: string) => { const base = href.split("?")[0]!; return base === "/admin" ? pathname === "/admin" : pathname === base || pathname.startsWith(`${base}/`); };
  const link = (it: Item, nested = false) => {
    const active = activeHref(it.href) && !(it.href.includes("?") ? false : false);
    return (
      <li key={it.href}>
        <Link href={it.href} onClick={onNavigate} aria-current={active ? "page" : undefined}
          className={cn("flex items-center gap-3 rounded-[10px] px-3 text-[14px] transition-colors", nested ? "h-8 pl-11 text-[13px]" : "h-10 lg:h-9",
            active ? (nested ? "font-semibold text-accent" : "bg-accent text-accent-contrast") : "text-fg-muted hover:bg-fill hover:text-fg")}>
          {!nested && <it.icon className="h-4 w-4" />}{it.label}
        </Link>
      </li>
    );
  };
  return (
    <ul className="space-y-0.5">
      {ADMIN_GROUPS.map((g) => {
        if (!isGroup(g)) return allowed(g) ? link(g) : null;
        const items = g.items.filter(allowed);
        if (!items.length) return null;
        const hasActive = items.some((i) => activeHref(i.href));
        const isOpen = open[g.id] ?? hasActive;
        return (
          <li key={g.id}>
            <button type="button" onClick={() => toggle(g.id)} aria-expanded={isOpen}
              className={cn("flex h-10 w-full items-center gap-3 rounded-[10px] px-3 text-left text-[14px] transition-colors hover:bg-fill lg:h-9", hasActive ? "font-semibold text-fg" : "text-fg-muted hover:text-fg")}>
              <g.icon className={cn("h-4 w-4", hasActive && "text-accent")} /><span className="flex-1">{g.label}</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && <ul className="mb-1 mt-0.5 space-y-0.5">{items.map((i) => link(i, true))}</ul>}
          </li>
        );
      })}
    </ul>
  );
}

export function AdminSidebar({ permissions, siteName }: { permissions: string[]; siteName: string }) {
  return (
    <aside className="glass sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-y-0 border-l-0 lg:flex">
      <div className="px-5 py-5 text-[17px] font-semibold tracking-tight">{siteName} <span className="text-fg-subtle font-normal">Admin</span></div>
      <nav className="no-scrollbar flex-1 overflow-y-auto px-3 pb-6" aria-label="Admin">
        <NavList permissions={permissions} />
      </nav>
    </aside>
  );
}

/** Menu button and slide-in drawer for phones and tablets, where the sidebar is hidden. */
export function AdminMobileNav({ permissions, siteName }: { permissions: string[]; siteName: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);
  return (
    <div className="lg:hidden">
      <button onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-fill">
        <Menu className="h-5 w-5" />
      </button>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50">
            <motion.div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.aside role="dialog" aria-modal="true" aria-label="Admin menu" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="glass absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col border-y-0 border-l-0 shadow-float">
              <div className="flex items-center justify-between px-5 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))]">
                <span className="text-[17px] font-semibold tracking-tight">{siteName} <span className="font-normal text-fg-subtle">Admin</span></span>
                <button onClick={() => setOpen(false)} aria-label="Close menu" className="flex h-8 w-8 items-center justify-center rounded-full bg-fill"><X className="h-4 w-4" /></button>
              </div>
              <nav className="no-scrollbar flex-1 overflow-y-auto px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]" aria-label="Admin">
                <NavList permissions={permissions} onNavigate={() => setOpen(false)} />
              </nav>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
