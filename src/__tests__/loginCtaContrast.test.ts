import { readFileSync } from "fs";
import { join } from "path";

/** Relative luminance (WCAG 2.x). */
function lum(hex: string): number {
  const h = hex.replace("#", "");
  const rgb = [0, 1, 2].map((i) => {
    const c = parseInt(h.slice(i * 2, i * 2 + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function contrast(fg: string, bg: string): number {
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => x - y);
  return (b + 0.05) / (a + 0.05);
}

describe("OS-7709 login Continue CTA contrast", () => {
  const src = readFileSync(
    join(__dirname, "../app/(auth)/login/page.tsx"),
    "utf8",
  );

  it("pins cream text on dark gold (AA 4.5:1), not brown on ochre", () => {
    expect(src).toMatch(/const GOLD = "#755521"/);
    expect(src).toMatch(/const CREAM = "#FAFAF8"/);
    expect(src).toMatch(/formButtonPrimary:[\s\S]*backgroundColor: GOLD/);
    expect(src).toMatch(/formButtonPrimary:[\s\S]*color: CREAM/);
    expect(contrast("#FAFAF8", "#755521")).toBeGreaterThanOrEqual(4.5);
  });

  it("hints identifier-first next step is password", () => {
    expect(src).toContain("Next you'll enter your password.");
    expect(src).toContain("overflow: hidden");
  });
});
