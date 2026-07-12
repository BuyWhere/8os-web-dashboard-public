/**
 * Theme foundation for the 8os account hub (light/dark).
 *
 * The single source of truth for the theme contract shared by the client
 * ThemeProvider, the Preferences UI, and the no-flash inline boot script.
 * Values are persisted BOTH to localStorage (instant, pre-hydration) and to
 * the user-prefs API (UserSettings.theme) so the choice follows the account.
 *
 * "system" means: follow prefers-color-scheme, live-updating. "light"/"dark"
 * are explicit overrides.
 */

export type ThemeChoice = 'light' | 'dark' | 'system'
/** The concrete theme actually applied to <html data-theme>. */
export type ResolvedTheme = 'light' | 'dark'

export const THEME_CHOICES: ThemeChoice[] = ['light', 'dark', 'system']

/** localStorage key — must match the inline boot script in the root layout. */
export const THEME_STORAGE_KEY = '8os-theme'

export function isThemeChoice(v: unknown): v is ThemeChoice {
  return v === 'light' || v === 'dark' || v === 'system'
}

/** Resolve a stored choice to the concrete theme, honoring the system pref. */
export function resolveTheme(choice: ThemeChoice, systemDark: boolean): ResolvedTheme {
  if (choice === 'system') return systemDark ? 'dark' : 'light'
  return choice
}

/**
 * The inline script string injected (dangerouslySetInnerHTML) into <head>
 * BEFORE first paint. It reads the persisted choice + the OS preference and
 * sets data-theme on <html> synchronously, so there is no light→dark flash on
 * load. Kept dependency-free and tiny on purpose.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{
var k='${THEME_STORAGE_KEY}';
var c=localStorage.getItem(k);
if(c!=='light'&&c!=='dark'&&c!=='system'){c='system';}
var d=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;
var t=c==='system'?(d?'dark':'light'):c;
document.documentElement.setAttribute('data-theme',t);
document.documentElement.style.colorScheme=t;
}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`
