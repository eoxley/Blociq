import InboxV2 from './InboxV2'

export const dynamic = 'force-dynamic'

export default function InboxPage() {
  return (
    <div className="space-y-6">
      {/* Hero Banner Header - Full Width */}
      <div className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white">Email Inbox</h1>
        </div>
      </div>
      
      {/* Inbox Content with Compact Layout */}
      <div className="inbox-compact">
        <InboxV2 />
      </div>
    </div>
  )
}
