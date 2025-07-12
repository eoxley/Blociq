'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calendar, DollarSign, Shield, FileText, Mail, ChevronDown, ChevronUp, ExternalLink, Brain, AlertTriangle, Clock } from 'lucide-react'

type Building = {
  id: string
  name: string
  address: string
  service_charge_year_end?: string
  section_20_threshold?: number
  insurance_renewal_date?: string
  property_account_balance?: number
  ews1_status?: string
  fire_door_survey?: string
  gas_eicr_status?: string
}

type Email = {
  id: string
  subject: string
  sender: string
  preview: string
  created_at: string
}

interface BuildingDetailClientProps {
  building: Building
  recentEmails: Email[]
}

export default function BuildingDetailClient({ building, recentEmails }: BuildingDetailClientProps) {
  const [complianceExpanded, setComplianceExpanded] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Building Overview Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link 
            href="/buildings" 
            className="flex items-center gap-2 text-[#0F5D5D] hover:text-teal-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Buildings
          </Link>
        </div>
        
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-3xl font-bold text-[#0F5D5D] mb-2">
            {building.name}
          </h1>
          <p className="text-lg text-gray-600">
            {building.address}
          </p>
        </div>
      </div>

      {/* BlocAI Summary Box */}
      <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-xl shadow-lg p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 bg-teal-600 rounded-lg">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#0F5D5D]">BlocAI Summary</h2>
            <p className="text-sm text-gray-600">Key insights and recommendations</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Upcoming Events */}
          <div className="bg-white rounded-lg p-4 border border-teal-100">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-teal-600" />
              <h3 className="font-medium text-gray-900">Upcoming Events</h3>
            </div>
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-orange-600">3 urgent items</span> require attention this month. 
              Insurance renewal due in 23 days, and fire safety inspection scheduled for next week.
            </p>
          </div>

          {/* Compliance Status */}
          <div className="bg-white rounded-lg p-4 border border-teal-100">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-teal-600" />
              <h3 className="font-medium text-gray-900">Compliance Status</h3>
            </div>
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-red-600">1 overdue item:</span> Fire door survey is 15 days past due. 
              EWS1 certificate and gas inspection are current.
            </p>
          </div>

          {/* Email Sentiment */}
          <div className="bg-white rounded-lg p-4 border border-teal-100">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="h-4 w-4 text-teal-600" />
              <h3 className="font-medium text-gray-900">Email Sentiment</h3>
            </div>
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-yellow-600">2 urgent emails</span> from residents this week. 
              One complaint about heating system, one inquiry about service charges.
            </p>
          </div>
        </div>

        {/* Action Items */}
        <div className="mt-4 pt-4 border-t border-teal-200">
          <h4 className="font-medium text-[#0F5D5D] mb-2">Recommended Actions:</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li className="flex items-center gap-2">
              <AlertTriangle className="h-3 w-3 text-red-500" />
              Schedule fire door survey immediately (overdue)
            </li>
            <li className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-orange-500" />
              Contact insurance provider for renewal quotes
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-3 w-3 text-blue-500" />
              Respond to urgent resident emails within 24 hours
            </li>
          </ul>
        </div>
      </div>

      {/* Key Dates & Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="h-6 w-6 text-teal-600" />
            <h3 className="font-semibold text-[#0F5D5D]">Service Charge Year End</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {building.service_charge_year_end ? formatDate(building.service_charge_year_end) : '31 March 2025'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <DollarSign className="h-6 w-6 text-teal-600" />
            <h3 className="font-semibold text-[#0F5D5D]">Section 20 Threshold</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {building.section_20_threshold ? formatCurrency(building.section_20_threshold) : '£250'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="h-6 w-6 text-teal-600" />
            <h3 className="font-semibold text-[#0F5D5D]">Insurance Renewal</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {building.insurance_renewal_date ? formatDate(building.insurance_renewal_date) : '15 August 2025'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <DollarSign className="h-6 w-6 text-teal-600" />
            <h3 className="font-semibold text-[#0F5D5D]">Account Balance</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {building.property_account_balance ? formatCurrency(building.property_account_balance) : '£23,500'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Compliance Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div 
            className="flex items-center justify-between cursor-pointer mb-4"
            onClick={() => setComplianceExpanded(!complianceExpanded)}
          >
            <h2 className="text-xl font-semibold text-[#0F5D5D] flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Compliance
            </h2>
            {complianceExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </div>

          {complianceExpanded && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-500 rounded-lg">
                    <span className="text-white text-lg">📄</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Document Management</h3>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Coming Soon</span>
                  </div>
                </div>
                
                <div className="text-gray-600 text-sm mb-4">
                  <p className="mb-2">🎯 <strong>What's coming:</strong></p>
                  <ul className="space-y-1 text-sm">
                    <li>• Secure document upload and storage</li>
                    <li>• PDF viewer and annotation tools</li>
                    <li>• Version control and audit trails</li>
                    <li>• Automated compliance tracking</li>
                  </ul>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="text-center">
                      <div className="text-2xl mb-2">🏢</div>
                      <h4 className="font-medium text-gray-900 text-sm">EWS1 Certificate</h4>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        {building.ews1_status || 'Pass'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="text-center">
                      <div className="text-2xl mb-2">🚪</div>
                      <h4 className="font-medium text-gray-900 text-sm">Fire Door Survey</h4>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                        {building.fire_door_survey || 'Pending'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="text-center">
                      <div className="text-2xl mb-2">⚡</div>
                      <h4 className="font-medium text-gray-900 text-sm">Gas/EICR Inspection</h4>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        {building.gas_eicr_status || 'Valid'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 bg-white rounded-lg p-4 border border-blue-200">
                  <div className="text-center py-4">
                    <div className="text-3xl mb-2">🚧</div>
                    <h4 className="font-medium text-gray-900 mb-2">Document Upload System</h4>
                    <p className="text-gray-600 text-sm">
                      Upload, view, and manage compliance documents with full version control and audit trails.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Emails Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-5 w-5 text-teal-600" />
            <h2 className="text-xl font-semibold text-[#0F5D5D]">Recent Emails</h2>
          </div>

          {recentEmails.length > 0 ? (
            <div className="space-y-3">
              {recentEmails.map((email) => (
                <div key={email.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900 text-sm">
                      {email.subject}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {new Date(email.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    From: {email.sender}
                  </p>
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {email.preview}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No recent emails for this building</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 