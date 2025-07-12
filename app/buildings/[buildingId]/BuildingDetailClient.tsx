'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calendar, DollarSign, Shield, FileText, Mail, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'

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
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">EWS1 Status</h3>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    {building.ews1_status || 'Pass'}
                  </span>
                </div>
                <a 
                  href="#" 
                  className="text-teal-600 hover:text-teal-700 text-sm flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  View EWS1 Certificate
                </a>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">Fire Door Survey</h3>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                    {building.fire_door_survey || 'Pending'}
                  </span>
                </div>
                <a 
                  href="#" 
                  className="text-teal-600 hover:text-teal-700 text-sm flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Fire Door Report
                </a>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">Gas/EICR Inspection</h3>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    {building.gas_eicr_status || 'Valid'}
                  </span>
                </div>
                <a 
                  href="#" 
                  className="text-teal-600 hover:text-teal-700 text-sm flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Inspection Certificates
                </a>
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