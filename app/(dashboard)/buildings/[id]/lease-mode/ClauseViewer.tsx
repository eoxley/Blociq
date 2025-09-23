'use client'

import React, { useState } from 'react'
import {
  ArrowLeft,
  FileText,
  Calendar,
  DollarSign,
  Shield,
  AlertTriangle,
  Building2,
  Home,
  Users,
  Clock,
  X
} from 'lucide-react'

interface Lease {
  id: string
  unit_number: string
  leaseholder_name: string
  start_date: string
  end_date: string
  status: string
  ground_rent: string
  service_charge_percentage: number
  analysis_json?: any
  responsibilities?: string[]
  restrictions?: string[]
  rights?: string[]
  scope?: string
  apportionment?: number
  created_at: string
  updated_at: string
}

interface ClauseViewerProps {
  lease: Lease
  buildingId: string
  onBack: () => void
}

export default function ClauseViewer({ lease, buildingId, onBack }: ClauseViewerProps) {
  const [activeTab, setActiveTab] = useState('overview')

  const analysis = lease.analysis_json || {}

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'details', label: 'Property Details', icon: Home },
    { id: 'sections', label: 'Detailed Sections', icon: FileText },
    { id: 'provisions', label: 'Other Provisions', icon: Shield },
  ]

  const renderOverview = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Executive Summary</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-gray-700 leading-relaxed">
            {analysis.executive_summary || 'No executive summary available. This lease analysis provides a comprehensive breakdown of all key terms, obligations, and rights contained within the lease agreement.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <h4 className="font-medium text-blue-900">Lease Term</h4>
          </div>
          <p className="text-sm text-blue-800">
            {lease.start_date && lease.end_date
              ? `${new Date(lease.start_date).getFullYear()} - ${new Date(lease.end_date).getFullYear()}`
              : 'Term not specified'}
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="h-5 w-5 text-green-600" />
            <h4 className="font-medium text-green-900">Leaseholder</h4>
          </div>
          <p className="text-sm text-green-800">
            {lease.leaseholder_name || 'Not specified'}
          </p>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <DollarSign className="h-5 w-5 text-yellow-600" />
            <h4 className="font-medium text-yellow-900">Ground Rent</h4>
          </div>
          <p className="text-sm text-yellow-800">
            {lease.ground_rent || 'Not specified'}
          </p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <DollarSign className="h-5 w-5 text-purple-600" />
            <h4 className="font-medium text-purple-900">Service Charge</h4>
          </div>
          <p className="text-sm text-purple-800">
            {lease.service_charge_percentage ? `${lease.service_charge_percentage}%` :
             lease.apportionment ? `${lease.apportionment}%` : 'Not specified'}
          </p>
        </div>
      </div>

      {/* Scope Information */}
      <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          {lease.scope === 'building' ? (
            <Building2 className="h-5 w-5 text-indigo-600" />
          ) : (
            <Home className="h-5 w-5 text-indigo-600" />
          )}
          <h4 className="font-medium text-indigo-900">
            {lease.scope === 'building' ? 'Building-wide Lease' : 'Unit-specific Lease'}
          </h4>
        </div>
        <p className="text-sm text-indigo-800">
          {lease.scope === 'building'
            ? 'This lease contains clauses that apply to all units in the building.'
            : `This lease is specific to ${lease.unit_number || 'a particular unit'}.`}
        </p>
      </div>
    </div>
  )

  const renderPropertyDetails = () => (
    <div className="space-y-6">
      {analysis.basic_property_details && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Property Details</h3>
          <div className="space-y-4">
            {analysis.basic_property_details.property_description && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Property Description</h4>
                <p className="text-gray-700 bg-gray-50 p-3 rounded">
                  {analysis.basic_property_details.property_description}
                </p>
              </div>
            )}

            {analysis.basic_property_details.lease_term && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Lease Term</h4>
                <p className="text-gray-700 bg-gray-50 p-3 rounded">
                  {analysis.basic_property_details.lease_term}
                </p>
              </div>
            )}

            {analysis.basic_property_details.parties && Array.isArray(analysis.basic_property_details.parties) && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Parties</h4>
                <ul className="space-y-2">
                  {analysis.basic_property_details.parties.map((party: string, index: number) => (
                    <li key={index} className="text-gray-700 bg-gray-50 p-3 rounded">
                      {party}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.basic_property_details.title_number && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Title Number</h4>
                <p className="text-gray-700 bg-gray-50 p-3 rounded">
                  {analysis.basic_property_details.title_number}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* If no analysis data, show basic lease info */}
      {!analysis.basic_property_details && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Lease Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Unit</h4>
              <p className="text-gray-700">{lease.unit_number}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Leaseholder</h4>
              <p className="text-gray-700">{lease.leaseholder_name}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Start Date</h4>
              <p className="text-gray-700">{new Date(lease.start_date).toLocaleDateString('en-GB')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">End Date</h4>
              <p className="text-gray-700">{new Date(lease.end_date).toLocaleDateString('en-GB')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderDetailedSections = () => (
    <div className="space-y-6">
      {analysis.detailed_sections && Array.isArray(analysis.detailed_sections) ? (
        analysis.detailed_sections.map((section: any, index: number) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">{section.section_title}</h4>
            {section.content && Array.isArray(section.content) && (
              <div className="space-y-2 mb-3">
                {section.content.map((item: string, itemIndex: number) => (
                  <p key={itemIndex} className="text-gray-700 text-sm leading-relaxed">
                    {item}
                  </p>
                ))}
              </div>
            )}
            {section.referenced_clauses && Array.isArray(section.referenced_clauses) && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Referenced Clauses:</p>
                <p className="text-xs text-gray-600">
                  {section.referenced_clauses.join(', ')}
                </p>
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 italic">No detailed sections available.</p>
          <p className="text-sm text-gray-400 mt-2">
            This lease may not have been processed for detailed analysis yet.
          </p>
        </div>
      )}
    </div>
  )

  const renderOtherProvisions = () => (
    <div className="space-y-6">
      {analysis.other_provisions && Array.isArray(analysis.other_provisions) ? (
        analysis.other_provisions.map((provision: any, index: number) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">
              {provision.title || provision.provision_title || `Provision ${index + 1}`}
            </h4>
            <p className="text-gray-700 text-sm leading-relaxed mb-2">
              {provision.description || provision.content}
            </p>
            {provision.referenced_clauses && Array.isArray(provision.referenced_clauses) && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Referenced Clauses:</p>
                <p className="text-xs text-gray-600">
                  {provision.referenced_clauses.join(', ')}
                </p>
              </div>
            )}
          </div>
        ))
      ) : (
        <div>
          {/* Quick Access to Arrays */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {lease.responsibilities && lease.responsibilities.length > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Responsibilities</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  {lease.responsibilities.slice(0, 3).map((item: string, index: number) => (
                    <li key={index}>{item.substring(0, 60)}...</li>
                  ))}
                  {lease.responsibilities.length > 3 && (
                    <li className="text-blue-600">+{lease.responsibilities.length - 3} more</li>
                  )}
                </ul>
              </div>
            )}

            {lease.restrictions && lease.restrictions.length > 0 && (
              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="font-medium text-red-900 mb-2">Restrictions</h4>
                <ul className="text-sm text-red-800 space-y-1">
                  {lease.restrictions.slice(0, 3).map((item: string, index: number) => (
                    <li key={index}>{item.substring(0, 60)}...</li>
                  ))}
                  {lease.restrictions.length > 3 && (
                    <li className="text-red-600">+{lease.restrictions.length - 3} more</li>
                  )}
                </ul>
              </div>
            )}

            {lease.rights && lease.rights.length > 0 && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Rights</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  {lease.rights.slice(0, 3).map((item: string, index: number) => (
                    <li key={index}>{item.substring(0, 60)}...</li>
                  ))}
                  {lease.rights.length > 3 && (
                    <li className="text-green-600">+{lease.rights.length - 3} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {(!lease.responsibilities || lease.responsibilities.length === 0) &&
           (!lease.restrictions || lease.restrictions.length === 0) &&
           (!lease.rights || lease.rights.length === 0) && (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 italic">No other provisions available.</p>
              <p className="text-sm text-gray-400 mt-2">
                Additional lease terms and conditions will appear here once processed.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      {analysis.disclaimer && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900 mb-1">Disclaimer</h4>
              <p className="text-sm text-yellow-800">{analysis.disclaimer}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview()
      case 'details':
        return renderPropertyDetails()
      case 'sections':
        return renderDetailedSections()
      case 'provisions':
        return renderOtherProvisions()
      default:
        return renderOverview()
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onBack}></div>

      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 h-[90vh] w-[90vw] max-w-4xl bg-white rounded-lg shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Lease Analysis - {lease.unit_number}
              </h2>
              <p className="text-sm text-gray-500">
                {lease.leaseholder_name} •
                Created {new Date(lease.created_at).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={onBack}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {renderContent()}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Last updated: {new Date(lease.updated_at).toLocaleString()}
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-xs text-gray-500">
                  Status: {lease.status || 'Active'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}