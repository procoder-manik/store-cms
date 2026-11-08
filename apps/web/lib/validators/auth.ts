import { z } from "zod";

/** Bangladeshi mobile: 01[3-9]XXXXXXXX, optional +88 / 88 prefix. Normalised to 01XXXXXXXXX. */
export const bdPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, "").replace(/^\+?88/, ""))
  .refine((v) => /^01[3-9]\d{8}$/.test(v), "phone");

export const password = z
  .string()
  .min(8, "password")
  .max(72, "password")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "password");

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("email"),
  password: z.string().min(1, "password"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "name").max(80, "name"),
  email: z.string().trim().toLowerCase().email("email"),
  phone: bdPhone,
  password,
});

export const emailOnly = z.object({ email: z.string().trim().toLowerCase().email("email") });
export const newPasswordSchema = z.object({ password });

/** Only allow same-site relative redirects. */
export function safeNext(next: string | null | undefined, fallback = "/account") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
