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

              {/* Arrow Down */}
              <div className="flex justify-center">
                <div className="text-4xl text-gray-400">⬇️</div>
              </div>

              {/* AI Security & Data Protection */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-8">
                <h4 className="text-2xl font-bold text-blue-800 mb-6 flex items-center justify-center">
                  🔐 BlocIQ AI Security & Data Protection Framework
                </h4>
                <div className="space-y-6">
                  
                  {/* Controlled API Usage */}
                  <div className="bg-white rounded-lg p-6 border-l-4 border-blue-500 shadow-sm">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-2xl">🛡️</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h5 className="text-lg font-bold text-blue-800 mb-2">1. Controlled API Usage</h5>
                        <p className="text-gray-700 mb-3">
                          OpenAI GPT-4 and Google Document AI are called strictly through BlocIQ's backend API routes.
                        </p>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <ul className="text-sm text-gray-600 space-y-1">
                            <li>• <strong>Proxied Requests:</strong> No raw credentials or client data flow directly to AI services</li>
                            <li>• <strong>Data Minimisation:</strong> Only minimum data required (e.g., text from a lease, not entire portfolios)</li>
                            <li>• <strong>Secure Wrapping:</strong> All AI calls are wrapped in BlocIQ's secure backend layer</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Data Separation & Ring-fencing */}
                  <div className="bg-white rounded-lg p-6 border-l-4 border-purple-500 shadow-sm">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-2xl">🔒</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h5 className="text-lg font-bold text-purple-800 mb-2">2. Data Separation & Ring-fencing</h5>
                        <p className="text-gray-700 mb-3">
                          Each BlocIQ client has its data partitioned in Supabase with Row-Level Security (RLS).
                        </p>
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <ul className="text-sm text-gray-600 space-y-1">
                            <li>• <strong>Partitioned Data:</strong> Each building's data is completely isolated</li>
                            <li>• <strong>AI Context Limitation:</strong> AI only sees the current record being worked on</li>
                            <li>• <strong>No Cross-Agency Bleed:</strong> One block's leaseholders cannot access another's data</li>
                            <li>• <strong>Permission Filtering:</strong> All data access is filtered by user permissions</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* GDPR & UK Compliance */}
                  <div className="bg-white rounded-lg p-6 border-l-4 border-green-500 shadow-sm">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-2xl">🇬🇧</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h5 className="text-lg font-bold text-green-800 mb-2">3. GDPR & UK Compliance</h5>
                        <p className="text-gray-700 mb-3">
                          All processing follows GDPR by design principles with UK-centric legal frameworks.
                        </p>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <ul className="text-sm text-gray-600 space-y-1">
                            <li>• <strong>Purpose Limitation:</strong> AI only processes text for specific tasks (summarise, classify, extract)</li>
                            <li>• <strong>Data Minimisation:</strong> Only relevant snippets sent, not full personal records</li>
                            <li>• <strong>Right to Erasure:</strong> All AI logs stored in Supabase for audit/deletion per GDPR</li>
                            <li>• <strong>UK-Centric:</strong> Data stays in GDPR-compliant regions (UK/EU servers)</li>
                            <li>• <strong>UK Legal Logic:</strong> Section 20, BSA, RICS frameworks prevent US tenancy "leakage"</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* No Model Training */}
                  <div className="bg-white rounded-lg p-6 border-l-4 border-orange-500 shadow-sm">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                          <span className="text-2xl">🚫</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h5 className="text-lg font-bold text-orange-800 mb-2">4. No Model Training on Your Data</h5>
                        <p className="text-gray-700 mb-3">
                          Neither OpenAI GPT-4 API nor Google Document AI use your data for model training.
                        </p>
                        <div className="bg-orange-50 p-4 rounded-lg">
                          <ul className="text-sm text-gray-600 space-y-1">
                            <li>• <strong>Ephemeral Processing:</strong> Prompts and documents are processed and discarded</li>
                            <li>• <strong>No Training Data:</strong> Your data never becomes part of AI model training</li>
                            <li>• <strong>Controlled Storage:</strong> Only BlocIQ-chosen logs stored in Supabase for review</li>
                            <li>• <strong>Data Sovereignty:</strong> You maintain full control over your data lifecycle</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Audit & Transparency */}
                  <div className="bg-white rounded-lg p-6 border-l-4 border-red-500 shadow-sm">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                          <span className="text-2xl">📊</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h5 className="text-lg font-bold text-red-800 mb-2">5. Audit & Transparency</h5>
                        <p className="text-gray-700 mb-3">
                          Every AI call is logged in ai_logs with full audit trail and accountability.
                        </p>
                        <div className="bg-red-50 p-4 rounded-lg">
                          <ul className="text-sm text-gray-600 space-y-1">
                            <li>• <strong>Complete Logging:</strong> Timestamp, building context, and user ID for every AI call</li>
                            <li>• <strong>Full Audit Trail:</strong> What was asked, what AI replied, building/unit context</li>
                            <li>• <strong>GDPR Accountability:</strong> Full traceability for compliance challenges</li>
                            <li>• <strong>Client Transparency:</strong> Review all AI interactions through BlocIQ interface</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6 mt-6">
                    <div className="text-center">
                      <h6 className="text-lg font-bold mb-2">✨ BlocIQ's Secure AI Bubble</h6>
                      <p className="text-blue-100">
                        BlocIQ isn't "just sending data to OpenAI or Google." It's wrapping those calls in a secure, 
                        UK-based, GDPR-compliant bubble. The AI is powerful, but the ring-fence is the Supabase + 
                        backend API logic that ensures only the right, minimal, permitted data is ever exposed.
                      </p>
                    </div>
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
