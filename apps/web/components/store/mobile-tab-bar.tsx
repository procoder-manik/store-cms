"use client";
import { Home, LayoutGrid, Search, ShoppingBag, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** iOS-style bottom tab bar, phones only. */
export function MobileTabBar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const tabs = [
    { href: "/", icon: Home, label: t("home") },
    { href: "/categories", icon: LayoutGrid, label: t("categories") },
    { href: "/search", icon: Search, label: t("search") },
    { href: "/cart", icon: ShoppingBag, label: t("cart") },
    { href: "/account", icon: User, label: t("account") },
  ];
  return (
    <nav aria-label="Tabs"
      className="site-tabbar glass fixed inset-x-0 bottom-0 z-40 border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="grid grid-cols-5">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined}
                className={cn("flex h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-medium",
                  active ? "text-accent" : "text-fg-subtle")}>
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
