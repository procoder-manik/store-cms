import type { ReactNode } from "react";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { MobileTabBar } from "@/components/store/mobile-tab-bar";
import { CartProvider } from "@/components/store/cart/cart-provider";
import { readCart } from "@/lib/cart/server";
import { configured, getBanners, getSetting, getTopCategories } from "@/lib/data/catalog";
import { getAppearance } from "@/lib/theme/server";
import { AppearanceProvider } from "@/components/theme/appearance-context";
import type { CheckoutFields } from "@/components/store/checkout/checkout-form";
import { createAdminClient } from "@/lib/supabase/admin";
import { PopupHost, type PopupData } from "@/components/store/popup";
import { Link } from "@/i18n/navigation";
import { ChatWidget } from "@/components/store/chat/chat-widget";
import { SiteSchema } from "@/components/store/site-schema";
import { getMenu } from "@/lib/data/menus";
import { aiReady } from "@/lib/ai/chat";
import { CompareBar } from "@/components/store/compare";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { enabledPaymentMethods } from "@/lib/payments";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "Lumen";

async function chatConfig() {
  if (!configured() || !(await aiReady().catch(() => false))) return null;
  const { data } = await createAdminClient().from("settings").select("value").eq("key", "chatbot").maybeSingle();
  const c = (data?.value ?? {}) as { enabled?: boolean; name?: string; welcome_en?: string; welcome_bn?: string };
  if (c.enabled === false) return null;
  const bn = (await getLocale()) === "bn";
  return { name: c.name || "Lumi", welcome: (bn ? c.welcome_bn : c.welcome_en) || (bn ? "হ্যালো! কীভাবে সাহায্য করতে পারি?" : "Hi! How can I help you today?") };
}

async function marketing() {
  if (!configured()) return { announcements: [], popups: [] as PopupData[] };
  const supabase = await createClient();
  const [announcements, { data: popups }] = await Promise.all([getBanners("announcement"), supabase.from("popups").select("*").limit(5)]);
  const couponIds = (popups ?? []).map((p) => p.coupon_id).filter(Boolean) as string[];
  const { data: coupons } = couponIds.length ? await createAdminClient().from("coupons").select("id,code").in("id", couponIds) : { data: [] };
  return {
    announcements,
    popups: (popups ?? []).map((p) => ({ ...p, coupon: coupons?.find((c) => c.id === p.coupon_id)?.code ?? null })) as PopupData[],
  };
}

async function visitor() {
  if (!configured()) return { count: 0, isGuest: true, defaults: undefined };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const cart = await readCart().catch(() => ({ count: 0 }));
  if (!data.user) return { count: cart.count, isGuest: true, defaults: undefined };
  const [{ data: profile }, { data: addr }] = await Promise.all([
    supabase.from("profiles").select("full_name,phone,email").eq("id", data.user.id).single(),
    supabase.from("addresses").select("district,upazila,address_line,name,phone").eq("user_id", data.user.id).order("is_default", { ascending: false }).limit(1).maybeSingle(),
  ]);
  return {
    count: cart.count, isGuest: false,
    defaults: {
      name: addr?.name ?? profile?.full_name ?? "", phone: addr?.phone ?? profile?.phone ?? "", email: profile?.email ?? data.user.email ?? "",
      district: addr?.district ?? "", upazila: addr?.upazila ?? "", address: addr?.address_line ?? "",
    },
  };
}

async function maintenance() {
  if (!configured()) return false;
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("value").eq("key", "store").maybeSingle();
  if (!(data?.value as { maintenance?: boolean } | undefined)?.maintenance) return false;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return true;
  const { data: p } = await supabase.from("profiles").select("is_staff").eq("id", auth.user.id).single();
  return !p?.is_staff;
}

export default async function StoreLayout({ children }: { children: ReactNode }) {
  if (await maintenance()) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-5 text-center">
        <p className="text-[19px] font-semibold tracking-tight">{siteName}</p>
        <h1 className="headline mt-6 text-[34px] md:text-[48px]">We are getting something new ready</h1>
        <p className="mt-3 max-w-md text-fg-muted">The store is closed for a short update. Please check back soon.</p>
        <p className="mt-1 max-w-md text-fg-muted">স্টোরটি কিছুক্ষণের জন্য আপডেট হচ্ছে। একটু পরে আবার আসুন।</p>
      </main>
    );
  }
  const [appearance, cats, store, social] = await Promise.all([
    getAppearance(), getTopCategories(12).catch(() => []),
    getSetting<{ name?: string; tagline?: string; phone?: string; email?: string; address?: string; logo_url?: string | null }>("store").catch(() => null),
    getSetting<Record<string, string>>("social").catch(() => null),
  ]);
  const checkoutFields = (await getSetting<CheckoutFields>("checkout_fields").catch(() => null)) ?? {};
  const [headerMenu, footHelp, footCompany] = await Promise.all([getMenu("header"), getMenu("footer_help"), getMenu("footer_company")]);
  const navCats = cats.map((c) => ({ slug: c.slug, name: c.name, nameBn: c.nameBn }));
  const [v, methods, m, chatCfg] = await Promise.all([visitor(), configured() ? enabledPaymentMethods().catch(() => ["cod" as const]) : Promise.resolve(["cod" as const]), marketing(), chatConfig()]);
  const bar = m.announcements[0];
  return (
    <AppearanceProvider card={appearance.card} header={appearance.header}>
    <CartProvider initialCount={v.count} isGuest={v.isGuest} defaults={v.defaults} methods={methods} fields={checkoutFields}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2">
        Skip to content
      </a>
      {bar?.title && (
        <div className="site-announce bg-fg px-4 py-2 text-center text-[13px] text-background">
          {bar.link_url ? <Link href={bar.link_url} className="hover:underline">{bar.title}</Link> : bar.title}
        </div>
      )}
      <SiteSchema />
      <Header siteName={store?.name || siteName} logo={store?.logo_url} variant={appearance.header} categories={navCats} phone={store?.phone} menu={headerMenu} />
      <main id="main" className="pb-16 md:pb-0">{children}</main>
      <Footer siteName={store?.name || siteName} variant={appearance.footer} tagline={store?.tagline} logo={store?.logo_url} store={store ?? {}} social={social ?? {}} categories={navCats} menus={{ help: footHelp, company: footCompany }} />
      <MobileTabBar />
      <CompareBar />
      {m.popups.length > 0 && <PopupHost popups={m.popups} />}
      {chatCfg && <ChatWidget name={chatCfg.name} welcome={chatCfg.welcome} />}
    </CartProvider>
    </AppearanceProvider>
  );
}
