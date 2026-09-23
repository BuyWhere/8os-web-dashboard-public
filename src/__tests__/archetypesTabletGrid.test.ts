import { readFileSync } from "fs";
import { join } from "path";

describe("OS-7908 /archetypes tablet comparison grid", () => {
  const css = readFileSync(
    join(__dirname, "../components/ArchetypesPageClient.module.css"),
    "utf8",
  );
  const src = readFileSync(
    join(__dirname, "../components/ArchetypesPageClient.tsx"),
    "utf8",
  );

  it("uses a CSS 2-column grid from 640px so 768px tablet is side-by-side", () => {
    expect(css).toMatch(/grid-template-columns:\s*1fr/);
    expect(css).toMatch(/@media\s*\(min-width:\s*640px\)/);
    expect(css).toMatch(/repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  });

  it("does not collapse the grid with a JS innerWidth < 900 cutoff", () => {
    expect(src).not.toMatch(/innerWidth\s*<\s*900/);
    expect(src).toMatch(/className=\{styles\.grid\}/);
  });
});
