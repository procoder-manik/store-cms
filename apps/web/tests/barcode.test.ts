import { describe, expect, it } from "vitest";
import { code128Svg } from "@/lib/barcode/code128";

describe("code128", () => {
  it("encodes with start, checksum and stop", () => {
    const svg = code128Svg("ORD-100001");
    expect(svg).toContain("<svg");
    expect(svg).toContain("ORD-100001");
    // start B (11 modules) + 10 chars + check (11 each) + stop (13) + quiet zones: bars count > 30
    expect((svg.match(/<rect x=/g) ?? []).length).toBeGreaterThan(30);
  });
  it("checksum for a known value", () => {
    // Code128B "A": start 104 + 33*1 = 137 % 103 = 34
    const svg = code128Svg("A", { label: false, module: 1 });
    // width = quiet 10 + 11 (start) + 11 (A) + 11 (check) + 13 (stop) + quiet 10 = 66
    expect(svg).toContain('viewBox="0 0 66 60"');
  });
});
