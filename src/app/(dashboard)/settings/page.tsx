import { redirect } from 'next/navigation'

/**
 * /settings — the account hub entry. There is no standalone /settings screen;
 * the profile-avatar dropdown (AccountMenu) is the entry point and every
 * account surface lives under a /settings/* tab. Landing on /settings sends
 * the user to Profile, the first tab of the unified account area.
 */
export default function SettingsIndexPage() {
  redirect('/settings/profile')
}
