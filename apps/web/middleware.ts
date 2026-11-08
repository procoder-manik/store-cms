import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/middleware";

const intl = createIntlMiddleware(routing);

// Redirects managed in Admin > SEO, cached per server instance for 60 seconds
let redirectCache: { at: number; map: Map<string, { to: string; code: number }> } | null = null;
async function redirects() {
  if (redirectCache && Date.now() - redirectCache.at < 60_000) return redirectCache.map;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const map = new Map<string, { to: string; code: number }>();
  if (url && key) {
    try {
      const res = await fetch(`${url}/rest/v1/redirects?select=from_path,to_path,code`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
      if (res.ok) for (const r of (await res.json()) as { from_path: string; to_path: string; code: number }[]) map.set(r.from_path.replace(/\/$/, "") || "/", { to: r.to_path, code: r.code });
    } catch { /* keep site up if the lookup fails */ }
  }
  redirectCache = { at: Date.now(), map };
  return map;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  if (!isAdmin) {
    // Redirects are written without the language prefix; the Bangla site keeps its /bn prefix
    const bn = /^\/bn(\/|$)/.test(pathname);
    const plain = (bn ? pathname.replace(/^\/bn/, "") : pathname).replace(/\/$/, "") || "/";
    const hit = (await redirects()).get(plain);
    if (hit) {
      const to = bn && hit.to.startsWith("/") ? `/bn${hit.to}` : hit.to;
      const target = to.startsWith("http") ? to : new URL(to, request.url).toString();
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (url && key) {
        fetch(`${url}/rest/v1/rpc/count_redirect_hit`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_from: plain }) }).catch(() => {});
      }
      return NextResponse.redirect(target, hit.code === 302 ? 302 : 301);
    }
  }

  // Admin area is not localised. Storefront goes through next-intl.
  const base = isAdmin ? NextResponse.next({ request }) : intl(request);
  const { response, user } = await updateSession(request, base);
  const ref = request.nextUrl.searchParams.get("ref");
  if (!isAdmin && ref && /^[A-Za-z0-9]{4,12}$/.test(ref) && !request.cookies.get("ref")) {
    response.cookies.set("ref", ref.toUpperCase(), { maxAge: 30 * 86400, httpOnly: true, sameSite: "lax", path: "/" });
  }

  if (isAdmin && !pathname.startsWith("/admin/login") && !user) {
    const login = request.nextUrl.clone();
    login.pathname = "/admin/login";
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|icon|apple-icon|.*\\..*).*)"],
};
