import InboxDashboard from '@/components/inbox_v2/InboxDashboard'

export const dynamic = 'force-dynamic'
// Force Vercel build trigger

export default function InboxPage() {
  return (
    <div className="min-h-screen">
      <InboxDashboard 
        onRefresh={() => window.location.reload()}
        onNavigateToInbox={() => {}}
        onNavigateToEmail={() => {}}
      />
    </div>
  )
}
