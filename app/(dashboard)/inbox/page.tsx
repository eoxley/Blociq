import InboxV2 from './InboxV2'

export const dynamic = 'force-dynamic'

export default function InboxPage() {
  return (
    <div className="space-y-6">
      {/* Hero Banner Header - Full Width */}
      <div className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 py-16 px-6 mt-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Email Inbox</h1>
          <p className="text-xl text-teal-100 max-w-2xl mx-auto">
            Manage your Outlook emails with intelligent AI-powered features
          </p>
        </div>
      </div>
      
      {/* Inbox Content with Compact Layout */}
      <div className="inbox-compact">
        <InboxV2 />
      </div>
    </div>
  )
}
