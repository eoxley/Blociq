import InboxV2 from './InboxV2'

export const dynamic = 'force-dynamic'

export default function InboxPage() {
  return (
    <div className="space-y-6">
      {/* Simple Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Email Inbox</h1>
        <p className="text-gray-600 mt-2">Manage your Outlook emails with the new v2 interface</p>
      </div>
      
      {/* Inbox Content with Compact Layout */}
      <div className="inbox-compact">
        <InboxV2 />
      </div>
    </div>
  )
}
