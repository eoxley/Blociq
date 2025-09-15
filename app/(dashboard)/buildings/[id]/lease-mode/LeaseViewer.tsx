'use client'

import React, { useState } from 'react'
import {
  ArrowLeft,
  Download,
  FileText,
  Calendar,
  User,
  DollarSign,
  Shield,
  FileCheck,
  Building,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface Building {
  id: string
  name: string
  address?: string
}

interface Lease {
  id: string
  unit_number: string
  leaseholder_name: string
  start_date: string
  end_date: string
  status: 'active' | 'expired' | 'terminated'
  ground_rent: string
  service_charge_percentage: number
  responsibilities: string[]
  restrictions: string[]
  rights: string[]
  file_path: string
  ocr_text?: string
  metadata?: any
  created_at: string
  updated_at: string
}

interface LeaseViewerProps {
  lease: Lease
  building: Building
  onBack: () => void
}

export default function LeaseViewer({ lease, building, onBack }: LeaseViewerProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'clauses' | 'financials' | 'restrictions'>('summary')

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: string) => {
    if (amount === 'peppercorn' || amount === 'Peppercorn') {
      return 'Peppercorn'
    }
    return `£${amount}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100'
      case 'expired':
        return 'text-red-600 bg-red-100'
      case 'terminated':
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const tabs = [
    { id: 'summary', label: 'Summary', icon: <FileText className="h-4 w-4" /> },
    { id: 'clauses', label: 'Clauses', icon: <FileCheck className="h-4 w-4" /> },
    { id: 'financials', label: 'Financials', icon: <DollarSign className="h-4 w-4" /> },
    { id: 'restrictions', label: 'Restrictions', icon: <Shield className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {lease.unit_number} - {lease.leaseholder_name}
            </h1>
            <p className="text-gray-600">{building.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(lease.status)}`}>
            {lease.status}
          </span>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Lease Summary</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Leaseholder</p>
                    <p className="text-lg font-semibold text-gray-900">{lease.leaseholder_name}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Building className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Unit</p>
                    <p className="text-lg font-semibold text-gray-900">{lease.unit_number}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Term</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatDate(lease.start_date)} - {formatDate(lease.end_date)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Ground Rent</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(lease.ground_rent)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Service Charge</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {lease.service_charge_percentage}%
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Last Updated</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatDate(lease.updated_at)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'clauses' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Key Clauses</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Responsibilities</h3>
                <ul className="space-y-2">
                  {lease.responsibilities.map((responsibility, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{responsibility}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Rights</h3>
                <ul className="space-y-2">
                  {lease.rights.map((right, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{right}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'financials' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Financial Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Ground Rent</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(lease.ground_rent)}
                </p>
                <p className="text-sm text-gray-500 mt-1">Annual payment</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Service Charge</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {lease.service_charge_percentage}%
                </p>
                <p className="text-sm text-gray-500 mt-1">Of total service costs</p>
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-blue-900 mb-2">Payment Information</h3>
              <p className="text-blue-800">
                Ground rent and service charges are typically paid annually. 
                Please refer to the full lease document for specific payment terms and conditions.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'restrictions' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Restrictions & Conditions</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Restrictions</h3>
                <ul className="space-y-2">
                  {lease.restrictions.map((restriction, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{restriction}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-yellow-900 mb-2">Important Notes</h3>
                <p className="text-yellow-800">
                  Please ensure you comply with all restrictions and conditions outlined in the lease. 
                  Failure to comply may result in breach of lease terms.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
