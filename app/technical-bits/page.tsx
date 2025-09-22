import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Code, Architecture, Users } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Technical Bits - BlocIQ Platform Architecture',
  description: 'Technical architecture and system overview of the BlocIQ property management platform',
}

export default function TechnicalBitsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link 
                href="/" 
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Home</span>
              </Link>
            </div>
            <div className="flex items-center space-x-2">
              <Code className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Technical Bits</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            BlocIQ Technical Architecture
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Comprehensive technical overview of the BlocIQ property management platform, 
            including system architecture, security implementation, and integration details.
          </p>
        </div>

        {/* Navigation Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Link 
            href="/technical-bits/architecture"
            className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-gray-200 hover:border-blue-300"
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <Architecture className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">System Architecture</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Detailed technical architecture diagram showing the complete system stack, 
              data flow, and integration points of the BlocIQ platform.
            </p>
            <div className="flex items-center text-blue-600 font-medium group-hover:text-blue-700">
              View Architecture
              <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
            </div>
          </Link>

          <Link 
            href="/technical-bits/overview"
            className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-gray-200 hover:border-purple-300"
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Platform Overview</h2>
            </div>
            <p className="text-gray-600 mb-4">
              High-level platform overview with user flows, core services, 
              and business value propositions for stakeholders.
            </p>
            <div className="flex items-center text-purple-600 font-medium group-hover:text-purple-700">
              View Overview
              <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
            </div>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Platform Highlights</h3>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">100%</div>
              <div className="text-gray-600">GDPR Compliant</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">EU</div>
              <div className="text-gray-600">Data Residency</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">AI</div>
              <div className="text-gray-600">Powered Automation</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">Real-time</div>
              <div className="text-gray-600">Data Sync</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
