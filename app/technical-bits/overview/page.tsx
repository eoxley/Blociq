import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Users, Download, TrendingUp } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Platform Overview - BlocIQ Technical Bits',
  description: 'High-level platform overview with user flows and business value propositions',
}

export default function OverviewPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link 
                href="/technical-bits" 
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Technical Bits</span>
              </Link>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-purple-600" />
              <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            BlocIQ Platform Overview
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            High-level platform overview with user flows, core services, 
            and business value propositions for stakeholders.
          </p>
        </div>

        {/* Platform Overview Diagram */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Platform Flow Diagram</h2>
            <p className="text-gray-600">
              This diagram shows the high-level platform flow including users, 
              core services, and integrated systems with full BlocIQ branding.
            </p>
          </div>
          
          {/* Platform Flow Diagram */}
          <div className="bg-gray-50 rounded-lg p-6 overflow-x-auto">
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600">
                High-level platform flow showing users, core services, and integrated systems
              </p>
            </div>
            
            {/* Visual Flow Representation */}
            <div className="space-y-8">
              {/* Users Layer */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center">
                <h4 className="text-xl font-bold text-blue-800 mb-4 flex items-center justify-center">
                  👥 BlocIQ Users
                </h4>
                <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="font-semibold text-gray-800 text-lg">Property Managers</div>
                    <div className="text-sm text-gray-600 mt-1">🏢 Portfolio Management, Building Oversight</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="font-semibold text-gray-800 text-lg">Leaseholders</div>
                    <div className="text-sm text-gray-600 mt-1">🏠 Tenant Portal, Digital Access</div>
                  </div>
                </div>
              </div>

              {/* Arrow Down */}
              <div className="flex justify-center">
                <div className="text-4xl text-gray-400">⬇️</div>
              </div>

              {/* Main Platform */}
              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 text-center">
                <h4 className="text-xl font-bold text-purple-800 mb-4 flex items-center justify-center">
                  📱 BlocIQ Platform
                </h4>
                <div className="bg-white p-6 rounded-lg border shadow-sm max-w-4xl mx-auto">
                  <div className="font-semibold text-gray-800 text-lg mb-4">Web Application</div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div className="flex flex-col items-center space-y-1">
                      <span className="text-2xl">📋</span>
                      <span>Document Management</span>
                    </div>
                    <div className="flex flex-col items-center space-y-1">
                      <span className="text-2xl">💬</span>
                      <span>Communication Hub</span>
                    </div>
                    <div className="flex flex-col items-center space-y-1">
                      <span className="text-2xl">📊</span>
                      <span>Compliance Tracking</span>
                    </div>
                    <div className="flex flex-col items-center space-y-1">
                      <span className="text-2xl">🤖</span>
                      <span>AI-Powered Automation</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Arrow Down */}
              <div className="flex justify-center">
                <div className="text-4xl text-gray-400">⬇️</div>
              </div>

              {/* Integrated Services */}
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center">
                <h4 className="text-xl font-bold text-green-800 mb-4 flex items-center justify-center">
                  🔧 BlocIQ Integrated Services
                </h4>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="font-semibold text-gray-800">🗄️ Supabase Database</div>
                    <div className="text-sm text-gray-600 mt-1">EU Hosted, Secure Storage, Real-time Sync</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="font-semibold text-gray-800">📧 Microsoft Outlook</div>
                    <div className="text-sm text-gray-600 mt-1">Email Integration, Calendar Sync, OAuth 2.0</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="font-semibold text-gray-800">🤖 OpenAI GPT-4</div>
                    <div className="text-sm text-gray-600 mt-1">Document Analysis, Content Generation</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="font-semibold text-gray-800">📄 Google Document AI</div>
                    <div className="text-sm text-gray-600 mt-1">OCR Text Extraction, EU Processing</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="font-semibold text-gray-800">📬 SendGrid Email</div>
                    <div className="text-sm text-gray-600 mt-1">Delivery Service, SMTP Services</div>
                  </div>
                </div>
              </div>

              {/* Arrow Down */}
              <div className="flex justify-center">
                <div className="text-4xl text-gray-400">⬇️</div>
              </div>

              {/* Security & Compliance */}
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 text-center">
                <h4 className="text-xl font-bold text-red-800 mb-4 flex items-center justify-center">
                  🛡️ BlocIQ Security & Compliance
                </h4>
                <div className="bg-white p-6 rounded-lg border shadow-sm max-w-4xl mx-auto">
                  <div className="font-semibold text-gray-800 text-lg mb-4">🔒 GDPR Compliant</div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div className="flex items-center justify-center space-x-2">
                      <span>•</span>
                      <span>EU Data Residency</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <span>•</span>
                      <span>Agency Data Isolation</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <span>•</span>
                      <span>Secure Authentication</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <span>•</span>
                      <span>Audit Logging</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <span>•</span>
                      <span>AES-256 Encryption</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Value Propositions */}
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">For Property Managers</h3>
            </div>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <span>Automated Document Processing with AI</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <span>Streamlined Communication Hub</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <span>Built-in Regulatory Compliance</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <span>Cost Reduction through Automation</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">For Leaseholders</h3>
            </div>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <span>Transparent Access to Property Information</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <span>Digital Portal for Easy Access</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <span>Direct Communication with Management</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <span>Real-time Updates and Notifications</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">For Investors</h3>
            </div>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <span>Portfolio Oversight Dashboard</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <span>Risk Management & Compliance Monitoring</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <span>Performance Analytics & Insights</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <span>Regulatory Assurance & Reporting</span>
              </li>
            </ul>
          </div>
        </div>



        {/* Navigation */}
        <div className="mt-8 flex justify-center space-x-4">
          <Link 
            href="/technical-bits/architecture"
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="h-5 w-5" />
            <span>View System Architecture</span>
          </Link>
          <Link 
            href="/"
            className="inline-flex items-center space-x-2 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
