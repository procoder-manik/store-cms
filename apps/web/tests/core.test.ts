import { describe, expect, it } from "vitest";
import { bdPhone, safeNext, password } from "@/lib/validators/auth";
import { discountPercent, formatBDT, slugify } from "@/lib/utils";
import { toBDT, type ImportPricing } from "@/lib/importers/pricing";
import { importedSchema } from "@/lib/importers/schema";
import { productSchema } from "@/lib/validators/product";
import { ALL_DISTRICTS, divisionOf } from "@/lib/data/bd-locations";

describe("Bangladesh phone numbers", () => {
  it("normalises common formats", () => {
    expect(bdPhone.parse("01712345678")).toBe("01712345678");
    expect(bdPhone.parse("+8801712345678")).toBe("01712345678");
    expect(bdPhone.parse("8801812-345 678")).toBe("01812345678");
  });
  it("rejects invalid numbers", () => {
    expect(bdPhone.safeParse("01212345678").success).toBe(false);
    expect(bdPhone.safeParse("0171234567").success).toBe(false);
  });
});

describe("redirect safety", () => {
  it("only allows same-site paths", () => {
    expect(safeNext("/account/orders")).toBe("/account/orders");
    expect(safeNext("//evil.com")).toBe("/account");
    expect(safeNext("https://evil.com")).toBe("/account");
    expect(safeNext("/\\evil")).toBe("/account");
  });
});

describe("passwords", () => {
  it("needs a letter, a number and 8 characters", () => {
    expect(password.safeParse("abc12345").success).toBe(true);
    expect(password.safeParse("abcdefgh").success).toBe(false);
    expect(password.safeParse("a1").success).toBe(false);
  });
});

describe("formatting", () => {
  it("formats Taka with Indian grouping", () => {
    expect(formatBDT(125000)).toBe("৳1,25,000");
    expect(formatBDT(1250.6)).toBe("৳1,251");
  });
  it("calculates discounts", () => {
    expect(discountPercent(800, 1000)).toBe(20);
    expect(discountPercent(1000, 800)).toBe(0);
    expect(discountPercent(500, null)).toBe(0);
  });
  it("makes clean slugs", () => {
    expect(slugify("96 Light Cherry Blossom  Lights!")).toBe("96-light-cherry-blossom-lights");
    expect(slugify("শাড়ি কালেকশন")).toBe("শাড়ি-কালেকশন");
  });
});

describe("import pricing", () => {
  const p: ImportPricing = { rates: { USD: 122, CAD: 88, BDT: 1 }, markup_percent: 60, markup_fixed: 0, rounding: "nearest_10", default_status: "draft", max_images: 12, copy_video: true };
  it("converts and adds markup", () => {
    expect(toBDT(10, "USD", p)).toBe(1950);
    expect(toBDT(10, "USD", p, false)).toBe(1220);
  });
  it("rounds to 9 endings", () => {
    expect(toBDT(12.99, "CAD", { ...p, rounding: "ends_9" })).toBe(1829);
  });
});

describe("schemas", () => {
  it("accepts a typical imported product", () => {
    const r = importedSchema.safeParse({ source: "temu", sourceUrl: "https://www.temu.com/x.html", title: "Cherry lights", price: "12.99", currency: "cad", images: ["https://img.kwcdn.com/a.jpg"] });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.currency).toBe("CAD");
  });
  it("rejects a product without a title", () => {
    expect(productSchema.safeParse({ title: "", status: "draft", price: 10 }).success).toBe(false);
  });
});

describe("locations", () => {
  it("has all 64 districts", () => {
    expect(ALL_DISTRICTS.length).toBe(64);
    expect(divisionOf("Sylhet")).toBe("Sylhet");
    expect(divisionOf("Gazipur")).toBe("Dhaka");
  });
});
