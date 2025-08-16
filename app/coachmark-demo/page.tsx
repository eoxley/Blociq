import AskBlocIQCoachmark from '@/components/AskBlocIQCoachmark'

export default function CoachmarkDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-teal-50/30 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4">
            BlocIQ Coachmark Demo
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Enhanced with vibrant BlocIQ branding and modern design
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
            <h2 className="text-xl font-semibold mb-4 text-slate-800">✨ Enhanced Features</h2>
            <ul className="space-y-3 text-slate-600">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <span><strong>Vibrant Branding:</strong> BlocIQ colors and gradients throughout</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-secondary rounded-full mt-2 flex-shrink-0" />
                <span><strong>Modern Design:</strong> Glassmorphism effects and smooth animations</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <span><strong>Enhanced Content:</strong> Feature highlights and clear value proposition</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-secondary rounded-full mt-2 flex-shrink-0" />
                <span><strong>Interactive Elements:</strong> Hover effects and micro-interactions</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <span><strong>Accessibility:</strong> Proper ARIA labels and keyboard navigation</span>
              </li>
            </ul>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
            <h2 className="text-xl font-semibold mb-4 text-slate-800">🎨 Design Elements</h2>
            <ul className="space-y-3 text-slate-600">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <span><strong>Gradient Backgrounds:</strong> Subtle color transitions</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-secondary rounded-full mt-2 flex-shrink-0" />
                <span><strong>Floating Elements:</strong> Decorative circles and sparkles</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <span><strong>Icon Integration:</strong> Brain icon and action arrows</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-secondary rounded-full mt-2 flex-shrink-0" />
                <span><strong>Typography:</strong> Gradient text and proper hierarchy</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <span><strong>Dark Mode:</strong> Seamless theme adaptation</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-slate-800">🚀 How to Use</h2>
          <div className="space-y-4 text-slate-600">
            <p>
              The enhanced coachmark automatically appears when you visit any page (except the AI assistant page, 
              landing page, and inbox). It will show for 7 days after being dismissed.
            </p>
            <p>
              To force show the coachmark for testing, you can pass <code className="bg-slate-100 px-2 py-1 rounded text-sm font-mono">forceShow={true}</code> 
              as a prop.
            </p>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
          <h2 className="text-xl font-semibold mb-4 text-slate-800">⚙️ Customization Options</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-600">
            <div>
              <p className="font-medium text-slate-700 mb-1">anchorSelector</p>
              <p className="text-sm">CSS selector for the target element (default: "#ask-blociq-fab")</p>
            </div>
            <div>
              <p className="font-medium text-slate-700 mb-1">storageKey</p>
              <p className="text-sm">LocalStorage key for persistence (default: "ask-blociq-coachmark-dismissed")</p>
            </div>
            <div>
              <p className="font-medium text-slate-700 mb-1">offsetX/offsetY</p>
              <p className="text-sm">Fallback positioning when anchor is not found</p>
            </div>
            <div>
              <p className="font-medium text-slate-700 mb-1">forceShow</p>
              <p className="text-sm">Bypass localStorage and always show (for testing)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Force show the enhanced coachmark for demo purposes */}
      <AskBlocIQCoachmark forceShow={true} />
    </div>
  )
}
