import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * OS-7907: tablet must not show both desktop header nav AND a floating
 * in-page hamburger. The FAB + header hamburger share the 640px cutoff
 * used by `.header-nav-links` in globals.css.
 */
describe('OS-7907 features tablet nav / FAB', () => {
  const globals = readFileSync(resolve(__dirname, '../globals.css'), 'utf8');
  const header = readFileSync(resolve(__dirname, '../../components/Header.tsx'), 'utf8');

  it('shows the in-page FAB only at max-width 640px', () => {
    const idx = globals.indexOf('.sidebar-mobile-toggle {');
    const after = globals.slice(idx);
    const media = after.match(/@media \(max-width: (\d+)px\) \{[\s\S]*?\.sidebar-mobile-toggle \{/);
    expect(media?.[1]).toBe('640');
  });

  it('shows the marketing header hamburger only at max-width 640px', () => {
    expect(header).toMatch(
      /@media \(max-width: 640px\) \{[\s\S]*header\.marketing-header button\.header-hamburger/
    );
    expect(header).not.toMatch(
      /@media \(max-width: 768px\) \{[\s\S]*header\.marketing-header button\.header-hamburger/
    );
  });
});
