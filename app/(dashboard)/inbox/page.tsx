import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function InboxPage() {
  // Redirect to the enhanced inbox overview  
  redirect('/inbox-overview')
}
