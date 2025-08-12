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
      
      {/* Keyboard Shortcuts Help */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-blue-600">⌨️</span>
            Keyboard Shortcuts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-3">
              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">↑↓</kbd>
              <span className="text-gray-700">Navigate between emails</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">Enter</kbd>
              <span className="text-gray-700">Select email</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">Delete</kbd>
              <span className="text-gray-700">Delete selected email</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">Esc</kbd>
              <span className="text-gray-700">Close modals</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">Drag</kbd>
              <span className="text-gray-700">Move emails between folders</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Inbox Content with Compact Layout */}
      <div className="inbox-compact">
        <InboxV2 />
      </div>
    </div>
  )
}
