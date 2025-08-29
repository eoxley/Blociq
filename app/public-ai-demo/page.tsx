import PublicAskBlocIQWidget from '@/components/PublicAskBlocIQWidget';

export default function PublicAIDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Demo Page Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Meet <span className="bg-gradient-to-r from-pink-500 via-teal-500 to-blue-500 bg-clip-text text-transparent">BlocIQ</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Your AI-powered property management assistant
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-teal-500 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <span className="text-white font-bold text-xl">🏢</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Property Management</h3>
              <p className="text-gray-600 text-sm">Get expert advice on building management, maintenance, and operations</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-purple-500 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <span className="text-white font-bold text-xl">📋</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">UK Compliance</h3>
              <p className="text-gray-600 text-sm">Navigate building regulations, safety requirements, and legal obligations</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <span className="text-white font-bold text-xl">💬</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Leaseholder Relations</h3>
              <p className="text-gray-600 text-sm">Improve communication and resolve issues with professional guidance</p>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Try BlocIQ Now</h2>
            <p className="text-gray-600 mb-6">
              Click the pulsating brain icon in the bottom right corner to start chatting with our AI assistant. 
              No signup required for this demo!
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">✨ What you can ask:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• "How do I handle a leak between flats?"</li>
                  <li>• "What's required for a Section 20 notice?"</li>
                  <li>• "Help me draft a maintenance email"</li>
                  <li>• "What are fire safety requirements?"</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">🔐 Security Notice:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Public demo - general advice only</li>
                  <li>• No access to private building data</li>
                  <li>• No document upload in demo mode</li>
                  <li>• Full features available with signup</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Public AI Widget */}
      <PublicAskBlocIQWidget 
        autoShow={true} 
        autoShowDelay={2000} 
      />
    </div>
  );
}