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
          
          {/* Mermaid Diagram */}
          <div className="bg-gray-50 rounded-lg p-6 overflow-x-auto">
            <div className="mermaid">
              graph LR
                %% User Layer
                subgraph "👥 BlocIQ Users"
                    A[Property Managers<br/>🏢 Portfolio Management<br/>Building Oversight]
                    B[Leaseholders<br/>🏠 Tenant Portal<br/>Digital Access]
                    C[Investors<br/>📊 Analytics Dashboard<br/>ROI Tracking]
                end
                
                %% Main Platform
                subgraph "📱 BlocIQ Platform"
                    D[Web Application<br/>📋 Document Management<br/>💬 Communication Hub<br/>📊 Compliance Tracking<br/>🤖 AI-Powered Automation]
                end
                
                %% External Services
                subgraph "🔧 BlocIQ Integrated Services"
                    E[🗄️ Supabase Database<br/>EU Hosted<br/>Secure Storage<br/>Real-time Sync]
                    F[📧 Microsoft Outlook<br/>Email Integration<br/>Calendar Sync<br/>OAuth 2.0]
                    G[🤖 OpenAI GPT-4<br/>Document Analysis<br/>Content Generation<br/>GDPR-Safe Processing]
                    H[📄 Google Document AI<br/>OCR Text Extraction<br/>EU Processing<br/>Lease Analysis]
                    I[📬 SendGrid Email<br/>Delivery Service<br/>SMTP Services<br/>GDPR Compliant]
                end
                
                %% Data Security
                subgraph "🛡️ BlocIQ Security & Compliance"
                    J[🔒 GDPR Compliant<br/>• EU Data Residency<br/>• Agency Data Isolation<br/>• Secure Authentication<br/>• Audit Logging<br/>• AES-256 Encryption]
                end
                
                %% Connections
                A --> D
                B --> D
                C --> D
                
                D --> E
                D --> F
                D --> G
                D --> H
                D --> I
                
                E -.-> J
                F -.-> J
                G -.-> J
                H -.-> J
                I -.-> J
                
                %% BlocIQ Brand Styling
                classDef userClass fill:#e3f2fd,stroke:#1976d2,stroke-width:3px,color:#000,font-weight:bold,font-family:'Segoe UI',Arial
                classDef platformClass fill:#f3e5f5,stroke:#7b1fa2,stroke-width:3px,color:#000,font-weight:bold,font-family:'Segoe UI',Arial
                classDef serviceClass fill:#e8f5e8,stroke:#388e3c,stroke-width:2px,color:#000,font-family:'Segoe UI',Arial
                classDef securityClass fill:#ffebee,stroke:#d32f2f,stroke-width:3px,color:#000,font-weight:bold,font-family:'Segoe UI',Arial
                
                class A,B,C userClass
                class D platformClass
                class E,F,G,H,I serviceClass
                class J securityClass
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

        {/* Market Opportunity */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Market Opportunity</h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">UK Property Management Market</h4>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span><strong>Market Size:</strong> £2.5bn+ property management services market</span>
                </li>
                <li className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span><strong>Digital Transformation:</strong> Increasing demand for technology solutions</span>
                </li>
                <li className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span><strong>Regulatory Pressure:</strong> Growing compliance requirements driving automation</span>
                </li>
                <li className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span><strong>Cost Efficiency:</strong> Need for operational efficiency and cost reduction</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Target Segments</h4>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span><strong>Property Management Companies:</strong> 500+ buildings under management</span>
                </li>
                <li className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span><strong>Leasehold Properties:</strong> Individual building management</span>
                </li>
                <li className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span><strong>Real Estate Investors:</strong> Portfolio management and oversight</span>
                </li>
                <li className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span><strong>Managing Agents:</strong> Streamlined tenant and building services</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Brand Kit Section */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">BlocIQ Brand Kit Integration</h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Brand Color Palette</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-600 rounded"></div>
                  <span className="text-sm text-gray-600">Primary Blue: #1976d2 (Trust, Professional)</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-600 rounded"></div>
                  <span className="text-sm text-gray-600">Secondary Purple: #7b1fa2 (Innovation, Premium)</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-600 rounded"></div>
                  <span className="text-sm text-gray-600">Success Green: #388e3c (Growth, Efficiency)</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-600 rounded"></div>
                  <span className="text-sm text-gray-600">Warning Orange: #f57c00 (Information, Value)</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-red-600 rounded"></div>
                  <span className="text-sm text-gray-600">Error Red: #d32f2f (Protection, Compliance)</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Brand Messaging Framework</h4>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <span><strong>Trust & Security:</strong> GDPR-compliant, EU data residency</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <span><strong>Innovation:</strong> AI-powered automation and analysis</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <span><strong>Efficiency:</strong> Streamlined workflows and cost reduction</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                  <span><strong>Transparency:</strong> Clear data handling and user access</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <span><strong>Professional:</strong> Enterprise-grade security and compliance</span>
                </li>
              </ul>
            </div>
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
