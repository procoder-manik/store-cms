/**
 * Permission catalogue. Keys are stored in the `permissions` table (seeded) and
 * checked with has_permission() in SQL and can() in TypeScript.
 */
export const MODULES = [
  "dashboard", "products", "categories", "inventory", "orders", "customers", "reviews",
  "coupons", "marketing", "content", "media", "seo", "shipping", "payments", "emails",
  "reports", "imports", "chatbot", "users", "roles", "settings", "audit", "code",
] as const;
export const ACTIONS = ["view", "create", "update", "delete", "export"] as const;

export type Module = (typeof MODULES)[number];
export type Action = (typeof ACTIONS)[number];
export type PermissionKey = `${Module}.${Action}`;
