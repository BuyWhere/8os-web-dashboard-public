import { redirect } from 'next/navigation'

// OS-5916: /help is not a product surface. Send to /contact.
export default function HelpPage() {
  redirect('/contact')
}
