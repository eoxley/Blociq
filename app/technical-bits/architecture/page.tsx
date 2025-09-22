import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Building2, Download } from 'lucide-react'

export const metadata: Metadata = {
  title: 'System Architecture - BlocIQ Technical Bits',
  description: 'Detailed technical architecture diagram of the BlocIQ property management platform',
}

export default function ArchitecturePage() {
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
              <Building2 className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">System Architecture</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            BlocIQ System Architecture
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Comprehensive technical architecture showing the complete system stack, 
            data flow, and integration points of the BlocIQ platform.
          </p>
        </div>

        {/* Architecture Diagram */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">System Architecture Flow</h2>
            <p className="text-gray-600">
              This diagram shows the complete technical architecture including user interfaces, 
              application layers, core services, data models, and security implementation.
            </p>
          </div>
          
          {/* Architecture Diagram */}
          <div className="bg-gray-50 rounded-lg p-6 overflow-x-auto">
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600">
                Interactive system architecture diagram showing complete BlocIQ platform stack
              </p>
            </div>
            
            {/* Visual Architecture Representation */}
            <div className="space-y-8">
              {/* User Layer */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center">
                <h4 className="text-xl font-bold text-blue-800 mb-4 flex items-center justify-center">
                  👥 BlocIQ User Interface Layer
                </h4>
                <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="font-semibold text-gray-800 text-lg">Property Manager</div>
                    <div className="text-sm text-gray-600 mt-1">🏢 Building Management, Portfolio Oversight</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="font-semibold text-gray-800 text-lg">Leaseholder</div>
                    <div className="text-sm text-gray-600 mt-1">🏠 Tenant Portal, Digital Access</div>
                  </div>
                </div>
              </div>

              {/* Arrow Down */}
              <div className="flex justify-center">
                <div className="text-4xl text-gray-400">⬇️</div>
              </div>

              {/* Application Layer */}
              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 text-center">
                <h4 className="text-xl font-bold text-purple-800 mb-4 flex items-center justify-center">
                  📱 BlocIQ Application Layer
                </h4>
                <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="font-semibold text-gray-800 text-lg">Next.js Frontend</div>
                    <div className="text-sm text-gray-600 mt-1">React Components, TypeScript, Responsive UI</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="font-semibold text-gray-800 text-lg">API Routes</div>
                    <div className="text-sm text-gray-600 mt-1">Server Actions, Authentication, Middleware</div>
                  </div>
                </div>
              </div>

              {/* Arrow Down */}
              <div className="flex justify-center">
                <div className="text-4xl text-gray-400">⬇️</div>
              </div>

              {/* Core Services */}
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center">
                <h4 className="text-xl font-bold text-green-800 mb-4 flex items-center justify-center">
                  🔧 BlocIQ Core Services
                </h4>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="font-semibold text-gray-800">🗄️ Supabase Backend</div>
                    <div className="text-sm text-gray-600 mt-1">PostgreSQL, Real-time, File Storage</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="font-semibold text-gray-800">📧 Microsoft Graph</div>
                    <div className="text-sm text-gray-600 mt-1">Outlook Integration, OAuth 2.0</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="font-semibold text-gray-800">🤖 OpenAI GPT-4</div>
                    <div className="text-sm text-gray-600 mt-1">Document Analysis, AI Drafting</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="font-semibold text-gray-800">📄 Google Document AI</div>
                    <div className="text-sm text-gray-600 mt-1">OCR Processing, EU Endpoints</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="font-semibold text-gray-800">📬 SendGrid</div>
                    <div className="text-sm text-gray-600 mt-1">Email Delivery, GDPR Compliant</div>
                  </div>
                </div>
              </div>

              {/* Arrow Down */}
              <div className="flex justify-center">
                <div className="text-4xl text-gray-400">⬇️</div>
              </div>

              {/* Data Model */}
              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6 text-center">
                <h4 className="text-xl font-bold text-orange-800 mb-4 flex items-center justify-center">
                  📊 BlocIQ Data Model
                </h4>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="font-semibold text-gray-800">🏢 Buildings</div>
                    <div className="text-sm text-gray-600 mt-1">Property Information, Management Data</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="font-semibold text-gray-800">🏠 Units</div>
                    <div className="text-sm text-gray-600 mt-1">Individual Properties, Lease Details</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="font-semibold text-gray-800">👥 Leaseholders</div>
                    <div className="text-sm text-gray-600 mt-1">Tenant Data, Contact Information</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="font-semibold text-gray-800">💬 Communications</div>
                    <div className="text-sm text-gray-600 mt-1">Email History, Message Threads</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="font-semibold text-gray-800">📋 Compliance</div>
                    <div className="text-sm text-gray-600 mt-1">Safety Documents, Certificates</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="font-semibold text-gray-800">📄 Leases</div>
                    <div className="text-sm text-gray-600 mt-1">Legal Documents, Terms & Conditions</div>
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
                <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="font-semibold text-gray-800">🔒 GDPR Compliance</div>
                    <div className="text-sm text-gray-600 mt-1">EU/UK Data Residency, Privacy by Design</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="font-semibold text-gray-800">🔐 Row Level Security</div>
                    <div className="text-sm text-gray-600 mt-1">Agency Data Isolation, Access Controls</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="font-semibold text-gray-800">🔑 OAuth 2.0 Security</div>
                    <div className="text-sm text-gray-600 mt-1">Microsoft Integration, Multi-Factor Auth</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Specifications */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Platform Stack</h3>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span><strong>Frontend:</strong> Next.js 14, React 18, TypeScript</span>
              </li>
              <li className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span><strong>Backend:</strong> Supabase (PostgreSQL, Auth, Storage)</span>
              </li>
              <li className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span><strong>AI Services:</strong> OpenAI GPT-4, Google Document AI</span>
              </li>
              <li className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span><strong>Communication:</strong> Microsoft Graph, SendGrid</span>
              </li>
              <li className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span><strong>Hosting:</strong> Vercel (EU region), Supabase (EU region)</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Security Features</h3>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span><strong>Data Encryption:</strong> AES-256 at rest and in transit</span>
              </li>
              <li className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span><strong>Authentication:</strong> OAuth 2.0 with Microsoft Azure AD</span>
              </li>
              <li className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span><strong>Authorization:</strong> Row Level Security (RLS)</span>
              </li>
              <li className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span><strong>Compliance:</strong> GDPR, UK Data Protection Act 2018</span>
              </li>
              <li className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span><strong>Audit:</strong> Comprehensive logging and monitoring</span>
              </li>
            </ul>
          </div>
        </div>


        {/* Download Section */}
        <div className="mt-8 text-center">
          <Link 
            href="/technical-bits/overview"
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="h-5 w-5" />
            <span>View Platform Overview</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
