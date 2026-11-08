import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const CART_COOKIE = "cart_sid";

export interface CartLine {
  id: string; productId: string; variantId: string | null; quantity: number;
  title: string; variantTitle: string | null; slug: string; image: string | null;
  price: number; compareAtPrice: number | null; available: number | null; ok: boolean;
}
export interface CartView { id: string | null; lines: CartLine[]; count: number; subtotal: number }

async function currentUserId() {
  const { data } = await (await createClient()).auth.getUser();
  return data.user?.id ?? null;
}

/** Finds the visitor's cart (by user, else by cookie). Creates one only when `create` is true. */
export async function findCart(create = false): Promise<string | null> {
  const admin = createAdminClient();
  const userId = await currentUserId();
  const jar = await cookies();
  if (userId) {
    const { data } = await admin.from("carts").select("id").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (data) return data.id as string;
    if (!create) return null;
    const { data: created } = await admin.from("carts").insert({ user_id: userId }).select("id").single();
    return created!.id as string;
  }
  let sid = jar.get(CART_COOKIE)?.value;
  if (sid) {
    const { data } = await admin.from("carts").select("id").eq("session_id", sid).is("user_id", null).maybeSingle();
    if (data) return data.id as string;
  }
  if (!create) return null;
  sid = randomBytes(24).toString("base64url");
  jar.set(CART_COOKIE, sid, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 60 });
  const { data: created } = await admin.from("carts").insert({ session_id: sid }).select("id").single();
  return created!.id as string;
}

export async function readCart(cartId?: string | null): Promise<CartView> {
  const id = cartId === undefined ? await findCart(false) : cartId;
  if (!id) return { id: null, lines: [], count: 0, subtotal: 0 };
  const { data } = await createAdminClient()
    .from("cart_items")
    .select("id,quantity,product_id,variant_id,products(title,slug,price,compare_at_price,stock,status,track_inventory,allow_backorder,product_media(url,type,sort_order)),product_variants(option_values,price,compare_at_price,stock,image_url,is_active)")
    .eq("cart_id", id).eq("saved_for_later", false).order("created_at");
  const lines: CartLine[] = ((data ?? []) as unknown as Record<string, unknown>[]).flatMap((row) => {
    const p = row.products as Record<string, unknown> | null;
    if (!p) return [];
    const v = row.product_variants as Record<string, unknown> | null;
    const media = ((p.product_media as { url: string; type: string; sort_order: number }[]) ?? []).filter((m) => m.type === "image").sort((a, b) => a.sort_order - b.sort_order);
    const tracked = (p.track_inventory as boolean) && !(p.allow_backorder as boolean);
    const stock = v ? (v.stock as number) : (p.stock as number);
    const active = p.status === "published" && (!v || (v.is_active as boolean));
    return [{
      id: row.id as string, productId: row.product_id as string, variantId: (row.variant_id as string) ?? null, quantity: row.quantity as number,
      title: p.title as string, slug: p.slug as string,
      variantTitle: v ? Object.values(v.option_values as Record<string, string>).join(" / ") : null,
      image: (v?.image_url as string) || media[0]?.url || null,
      price: Number(v ? v.price : p.price), compareAtPrice: (v ? v.compare_at_price : p.compare_at_price) == null ? null : Number(v ? v.compare_at_price : p.compare_at_price),
      available: tracked ? Math.max(0, stock) : null,
      ok: active && (!tracked || stock >= (row.quantity as number)),
    }];
  });
  return {
    id, lines,
    count: lines.reduce((s, l) => s + l.quantity, 0),
    subtotal: lines.filter((l) => l.ok).reduce((s, l) => s + l.price * l.quantity, 0),
  };
}

/** Moves a guest cart into the user's cart after sign-in. */
export async function mergeGuestCart(userId: string) {
  const jar = await cookies();
  const sid = jar.get(CART_COOKIE)?.value;
  if (!sid) return;
  const admin = createAdminClient();
  const { data: guest } = await admin.from("carts").select("id,cart_items(product_id,variant_id,quantity)").eq("session_id", sid).is("user_id", null).maybeSingle();
  jar.delete(CART_COOKIE);
  if (!guest) return;
  const items = (guest.cart_items as { product_id: string; variant_id: string | null; quantity: number }[]) ?? [];
  const { data: userCart } = await admin.from("carts").select("id").eq("user_id", userId).limit(1).maybeSingle();
  if (!userCart) {
    await admin.from("carts").update({ user_id: userId, session_id: null }).eq("id", guest.id);
    return;
  }
  for (const it of items) {
    const { data: existing } = await admin.from("cart_items").select("id,quantity").eq("cart_id", userCart.id)
      .eq("product_id", it.product_id).filter("variant_id", it.variant_id ? "eq" : "is", it.variant_id ?? null).maybeSingle();
    if (existing) await admin.from("cart_items").update({ quantity: Math.min(99, (existing.quantity as number) + it.quantity) }).eq("id", existing.id);
    else await admin.from("cart_items").insert({ cart_id: userCart.id, ...it });
  }
  await admin.from("carts").delete().eq("id", guest.id);
}
