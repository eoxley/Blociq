import AskBlocIQCoachmark from '@/components/AskBlocIQCoachmark'

export default function CoachmarkDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          BlocIQ Coachmark Demo
        </h1>
        
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Features</h2>
          <ul className="space-y-2 text-gray-600">
            <li>✨ <strong>Wiggle Animation:</strong> The bubble does a gentle "nudge" when it first appears</li>
            <li>🔄 <strong>Bouncing Arrow:</strong> The pointer slowly bounces to draw attention to the Brain widget</li>
            <li>🎨 <strong>Dark Mode Support:</strong> Automatically adapts to light/dark themes</li>
            <li>💾 <strong>Persistent:</strong> Remembers dismissal for 7 days</li>
            <li>♿ <strong>Accessible:</strong> Proper ARIA labels and keyboard navigation</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">How to Use</h2>
          <div className="space-y-4 text-gray-600">
            <p>
              The coachmark will automatically appear when you visit any page (except the AI assistant page, 
              landing page, and inbox). It will show for 7 days after being dismissed.
            </p>
            <p>
              To force show the coachmark for testing, you can pass <code className="bg-gray-100 px-2 py-1 rounded">forceShow={true}</code> 
              as a prop.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Customization</h2>
          <div className="space-y-2 text-gray-600">
            <p><strong>anchorSelector:</strong> CSS selector for the target element (default: "#ask-blociq-fab")</p>
            <p><strong>storageKey:</strong> LocalStorage key for persistence (default: "ask-blociq-coachmark-dismissed")</p>
            <p><strong>offsetX/offsetY:</strong> Fallback positioning when anchor is not found</p>
            <p><strong>forceShow:</strong> Bypass localStorage and always show (for testing)</p>
          </div>
        </div>
      </div>

      {/* Force show the coachmark for demo purposes */}
      <AskBlocIQCoachmark forceShow={true} />
    </div>
  )
}
