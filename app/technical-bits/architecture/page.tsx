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
          
          {/* Mermaid Diagram */}
          <div className="bg-gray-50 rounded-lg p-6 overflow-x-auto">
            <div className="mermaid">
              flowchart TD
                %% User Interface Layer
                subgraph "👥 BlocIQ User Interface Layer"
                    A[Property Manager<br/>🏢 Building Management<br/>Portfolio Oversight]
                    B[Leaseholder<br/>🏠 Tenant Portal<br/>Digital Access]
                    C[Investor<br/>📊 Portfolio View<br/>Analytics Dashboard]
                end
                
                %% Application Layer
                subgraph "📱 BlocIQ Application Layer"
                    D[Next.js Frontend<br/>React Components<br/>TypeScript<br/>Responsive UI]
                    E[API Routes<br/>Server Actions<br/>Authentication<br/>Middleware]
                end
                
                %% Core Services
                subgraph "🔧 BlocIQ Core Services"
                    F[🗄️ Supabase Backend<br/>PostgreSQL Database<br/>Real-time Subscriptions<br/>File Storage<br/>Authentication]
                    G[📧 Microsoft Graph API<br/>Outlook Integration<br/>Calendar Management<br/>Email Processing<br/>OAuth 2.0]
                    H[🤖 OpenAI GPT-4<br/>Document Analysis<br/>AI Drafting<br/>Content Generation<br/>GDPR-Safe Processing]
                    I[📄 Google Document AI<br/>OCR Processing<br/>Text Extraction<br/>EU Endpoints<br/>Lease Analysis]
                    J[📬 SendGrid<br/>Email Delivery<br/>SMTP Services<br/>Template Management<br/>GDPR Compliant]
                end
                
                %% Data Layer
                subgraph "📊 BlocIQ Data Model"
                    K[🏢 Buildings<br/>Property Information<br/>Management Data<br/>Location Details]
                    L[🏠 Units<br/>Individual Properties<br/>Lease Details<br/>Tenant Information]
                    M[👥 Leaseholders<br/>Tenant Data<br/>Contact Information<br/>Communication History]
                    N[💬 Communications<br/>Email History<br/>Message Threads<br/>Document Attachments]
                    O[📋 Compliance<br/>Safety Documents<br/>Certificates<br/>Regulatory Records]
                    P[📄 Leases<br/>Legal Documents<br/>Terms & Conditions<br/>Renewal Tracking]
                end
                
                %% Security & Compliance
                subgraph "🛡️ BlocIQ Security & Compliance"
                    Q[🔒 GDPR Compliance<br/>• EU/UK Data Residency<br/>• Right to be Forgotten<br/>• Data Minimization<br/>• Consent Management<br/>• Privacy by Design]
                    R[🔐 Row Level Security<br/>• Agency Data Isolation<br/>• User Permission Matrix<br/>• Audit Logging<br/>• Access Controls]
                    S[🔑 OAuth 2.0 Security<br/>• Microsoft Integration<br/>• Secure Token Exchange<br/>• Multi-Factor Auth<br/>• Session Management]
                end
                
                %% Connections
                A --> D
                B --> D
                C --> D
                
                D --> E
                E --> F
                E --> G
                E --> H
                E --> I
                E --> J
                
                F --> K
                F --> L
                F --> M
                F --> N
                F --> O
                F --> P
                
                F -.-> Q
                F -.-> R
                G -.-> S
                
                %% BlocIQ Brand Styling
                classDef userClass fill:#e3f2fd,stroke:#1976d2,stroke-width:3px,color:#000,font-weight:bold,font-family:'Segoe UI',Arial
                classDef appClass fill:#f3e5f5,stroke:#7b1fa2,stroke-width:3px,color:#000,font-weight:bold,font-family:'Segoe UI',Arial
                classDef serviceClass fill:#e8f5e8,stroke:#388e3c,stroke-width:2px,color:#000,font-family:'Segoe UI',Arial
                classDef dataClass fill:#fff3e0,stroke:#f57c00,stroke-width:2px,color:#000,font-family:'Segoe UI',Arial
                classDef securityClass fill:#ffebee,stroke:#d32f2f,stroke-width:3px,color:#000,font-weight:bold,font-family:'Segoe UI',Arial
                
                class A,B,C userClass
                class D,E appClass
                class F,G,H,I,J serviceClass
                class K,L,M,N,O,P dataClass
                class Q,R,S securityClass
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

        {/* Brand Kit Section */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">BlocIQ Brand Kit Integration</h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Brand Colors</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-600 rounded"></div>
                  <span className="text-sm text-gray-600">Primary Blue: #1976d2 (User Interface)</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-600 rounded"></div>
                  <span className="text-sm text-gray-600">Secondary Purple: #7b1fa2 (Platform Core)</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-600 rounded"></div>
                  <span className="text-sm text-gray-600">Success Green: #388e3c (Services)</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-600 rounded"></div>
                  <span className="text-sm text-gray-600">Warning Orange: #f57c00 (Data Layer)</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-red-600 rounded"></div>
                  <span className="text-sm text-gray-600">Error Red: #d32f2f (Security)</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Typography</h4>
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  <strong>Font Family:</strong> Segoe UI, Arial
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Font Weights:</strong> Bold for headers, Regular for content
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Visual Hierarchy:</strong> Clear distinction between system layers
                </div>
              </div>
            </div>
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
