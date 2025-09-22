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
