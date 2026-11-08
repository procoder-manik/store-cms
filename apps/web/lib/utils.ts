import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats a number as Bangladeshi Taka, e.g. ৳1,250. Uses the en-IN grouping BD stores use. */
export function formatBDT(amount: number, locale: "en" | "bn" = "en") {
  const formatted = new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-IN", {
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
  return `৳${formatted}`;
}

export function discountPercent(price: number, compareAt?: number | null) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFC")
    // Keep letters, combining marks (Bangla vowel signs) and digits
    .replace(/[^\p{L}\p{M}\p{N}\s-]/gu, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .slice(0, 120);
}

export function absoluteUrl(path = "/") {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}
