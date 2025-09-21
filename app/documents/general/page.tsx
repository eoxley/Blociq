'use client'

import React, { useState } from 'react'
import {
  FileIcon,
  Upload,
  Shield,
  ClipboardList,
  Gavel,
  MessageSquare,
  Settings,
  TrendingUp,
  DollarSign,
  Calendar,
  Mail,
  CheckCircle,
  Clock
} from 'lucide-react'
import GeneralDocumentUploadModal from '@/components/documents/GeneralDocumentUploadModal'

export default function GeneralDocumentsPage() {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedBuilding, setSelectedBuilding] = useState('1')

  // Mock building data - in real app this would come from API
  const buildings = [
    { id: '1', name: 'Ashwood Tower', address: '123 High Street, London' },
    { id: '2', name: 'Maple Court', address: '456 Park Avenue, London' },
    { id: '3', name: 'Oak Gardens', address: '789 Garden Road, London' }
  ]

  const handleUploadComplete = (result: any) => {
    console.log('Upload completed:', result)
    setShowUploadModal(false)
    // In real app, refresh the documents list
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">General Document Management</h1>
              <p className="text-gray-600">AI-powered document classification and organization</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Building
              </label>
              <select
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name} - {building.address}
                  </option>
                ))}
              </select>
            </div>
            <div className="pt-6">
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload Document
              </button>
            </div>
          </div>
        </div>

        {/* Feature Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileIcon className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Smart Classification</h3>
            </div>
            <p className="text-sm text-gray-600">
              AI automatically categorizes documents into insurance, contracts, minutes, and more.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Auto Reminders</h3>
            </div>
            <p className="text-sm text-gray-600">
              Creates Outlook calendar events for renewals, reviews, and important deadlines.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Mail className="h-5 w-5 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Email Drafts</h3>
            </div>
            <p className="text-sm text-gray-600">
              Auto-generates email drafts for meeting minutes and important communications.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-gray-900">User Confirmation</h3>
            </div>
            <p className="text-sm text-gray-600">
              Review and override AI classifications with full audit trail.
            </p>
          </div>
        </div>

        {/* Document Types */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Supported Document Types</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                type: 'Insurance Policy',
                icon: Shield,
                description: 'Building insurance, liability policies with auto-renewal reminders',
                automation: 'Calendar events for expiry dates',
                color: 'blue'
              },
              {
                type: 'Meeting Minutes',
                icon: ClipboardList,
                description: 'Board meetings, AGM, EGM minutes with automatic distribution',
                automation: 'Email drafts to directors',
                color: 'green'
              },
              {
                type: 'Contract',
                icon: Gavel,
                description: 'Service agreements, maintenance contracts with review tracking',
                automation: 'Review tasks and reminders',
                color: 'purple'
              },
              {
                type: 'Correspondence',
                icon: MessageSquare,
                description: 'General letters, emails, and notices with filing',
                automation: 'Automated categorization',
                color: 'gray'
              },
              {
                type: 'Maintenance Report',
                icon: Settings,
                description: 'Inspection reports and repair assessments with follow-ups',
                automation: 'Action item tracking',
                color: 'orange'
              },
              {
                type: 'Financial Statement',
                icon: TrendingUp,
                description: 'Accounts, budgets, and financial reports with summaries',
                automation: 'Director notifications',
                color: 'indigo'
              },
              {
                type: 'Legal Notice',
                icon: Gavel,
                description: 'Court orders and legal correspondence with priority tracking',
                automation: 'Urgent review alerts',
                color: 'red'
              },
              {
                type: 'Survey Report',
                icon: ClipboardList,
                description: 'Building surveys and condition assessments with action plans',
                automation: 'Maintenance scheduling',
                color: 'cyan'
              },
              {
                type: 'Contractor Quote',
                icon: DollarSign,
                description: 'Quotes and estimates with comparison tools',
                automation: 'Quote comparison tasks',
                color: 'yellow'
              }
            ].map((docType) => (
              <div key={docType.type} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 bg-${docType.color}-100 rounded-lg`}>
                    <docType.icon className={`h-5 w-5 text-${docType.color}-600`} />
                  </div>
                  <h3 className="font-medium text-gray-900">{docType.type}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-2">{docType.description}</p>
                <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  {docType.automation}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Process Flow */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Process Flow</h2>
          <div className="space-y-4">
            {[
              {
                step: 1,
                title: 'Document Upload',
                description: 'Upload to building_documents bucket with /general/ path structure',
                icon: Upload
              },
              {
                step: 2,
                title: 'OCR Text Extraction',
                description: 'Reuses Lease Lab OCR pipeline for intelligent text extraction',
                icon: FileIcon
              },
              {
                step: 3,
                title: 'AI Classification',
                description: 'Flexible AI analysis to classify document type and extract metadata',
                icon: Settings
              },
              {
                step: 4,
                title: 'User Confirmation',
                description: 'Review AI classification with option to override and correct',
                icon: CheckCircle
              },
              {
                step: 5,
                title: 'Outlook Integration',
                description: 'Auto-create calendar events, tasks, and email drafts based on document type',
                icon: Calendar
              },
              {
                step: 6,
                title: 'Audit Trail',
                description: 'Complete logging in document_logs with AI suggestions and user confirmations',
                icon: ClipboardList
              }
            ].map((processStep) => (
              <div key={processStep.step} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  {processStep.step}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <processStep.icon className="h-4 w-4 text-gray-500" />
                    <h3 className="font-medium text-gray-900">{processStep.title}</h3>
                  </div>
                  <p className="text-sm text-gray-600">{processStep.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Outlook Integration Details */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Outlook Integration Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium text-gray-900">Calendar Events</h3>
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Insurance renewal reminders (30 & 7 days before)</li>
                <li>• Contract review deadlines</li>
                <li>• Document expiry notifications</li>
                <li>• General review reminders</li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <h3 className="font-medium text-gray-900">Tasks</h3>
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Contract review tasks (14-day default)</li>
                <li>• Quote comparison tasks (7-day default)</li>
                <li>• Maintenance follow-up actions</li>
                <li>• Priority review assignments</li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-green-600" />
                <h3 className="font-medium text-gray-900">Email Drafts</h3>
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Meeting minutes distribution to directors</li>
                <li>• AI-generated professional summaries</li>
                <li>• Document availability notifications</li>
                <li>• Attachment preparation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <GeneralDocumentUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        buildingId={selectedBuilding}
        buildingName={buildings.find(b => b.id === selectedBuilding)?.name}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  )
}