import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function InboxPage() {
  // Redirect to the new inbox overview
  redirect('/inbox-overview')
}
