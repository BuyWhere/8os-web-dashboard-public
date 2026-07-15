/**
 * Theme foundation for the 8os account hub (light / dark / auto).
 *
 * The single source of truth for the theme contract shared by the client
 * ThemeProvider, the Preferences UI, and the no-flash inline boot script.
 * Values are persisted BOTH to localStorage (instant, pre-hydration) and to
 * the user-prefs API (UserSettings.theme) so the choice follows the account.
 *
 * Choices:
 *  - "light" / "dark" — explicit overrides.
 *  - "auto"   — follow the time of day: light during the day, dark at night,
 *               using the user's own device clock (which is in their local
 *               timezone). Flips live at the day/night boundary, no reload.
 *  - "system" — legacy: follow the OS prefers-color-scheme. Still honored for
 *               anyone who previously picked it, but "auto" is the default.
 */

export type ThemeChoice = 'light' | 'dark' | 'auto' | 'system'
/** The concrete theme actually applied to <html data-theme>. */
export type ResolvedTheme = 'light' | 'dark'

/** The choices surfaced in the UI (system is legacy, not shown). */
export const THEME_CHOICES: ThemeChoice[] = ['light', 'dark', 'auto']

/** The default when nothing is stored — automatic day/night. */
export const DEFAULT_THEME_CHOICE: ThemeChoice = 'auto'

/** localStorage key — must match the inline boot script in the root layout. */
export const THEME_STORAGE_KEY = '8os-theme'

/** Day starts at 06:00 and ends at 18:00 (local). Outside that → dark. */
export const DAY_START_HOUR = 6
export const DAY_END_HOUR = 18

export function isThemeChoice(v: unknown): v is ThemeChoice {
  return v === 'light' || v === 'dark' || v === 'auto' || v === 'system'
}

/** True when the given local hour falls in the daytime window. */
export function isDaytimeHour(hour: number): boolean {
  return hour >= DAY_START_HOUR && hour < DAY_END_HOUR
}

/**
 * Resolve a stored choice to the concrete theme.
 * - `auto` uses `now` (the device clock, in the user's local tz).
 * - `system` uses the OS `prefers-color-scheme` (passed in as `systemDark`).
 */
export function resolveTheme(
  choice: ThemeChoice,
  systemDark: boolean,
  now: Date = new Date(),
): ResolvedTheme {
  if (choice === 'auto') return isDaytimeHour(now.getHours()) ? 'light' : 'dark'
  if (choice === 'system') return systemDark ? 'dark' : 'light'
  return choice
}

/**
 * The inline script string injected (dangerouslySetInnerHTML) into <head>
 * BEFORE first paint. It reads the persisted choice + the OS preference + the
 * local clock and sets data-theme on <html> synchronously, so there is no
 * light↔dark flash on load. Kept dependency-free and tiny on purpose.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{
var k='${THEME_STORAGE_KEY}';
var c=localStorage.getItem(k);
if(c!=='light'&&c!=='dark'&&c!=='auto'&&c!=='system'){c='${DEFAULT_THEME_CHOICE}';}
var d=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;
var h=new Date().getHours();
var day=h>=${DAY_START_HOUR}&&h<${DAY_END_HOUR};
var t=c==='light'||c==='dark'?c:(c==='auto'?(day?'light':'dark'):(d?'dark':'light'));
document.documentElement.setAttribute('data-theme',t);
document.documentElement.style.colorScheme=t;
}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`
