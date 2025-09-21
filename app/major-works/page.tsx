'use client'

import React, { useState } from 'react'
import { HardHat, Upload, Calendar, FileText, DollarSign } from 'lucide-react'
import MajorWorksUploadModal from '@/components/major-works/MajorWorksUploadModal'

export default function MajorWorksPage() {
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
    // In real app, refresh the major works list
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <HardHat className="h-8 w-8 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Major Works Management</h1>
              <p className="text-gray-600">Section 20 consultation documents and project tracking</p>
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
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
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Intelligent OCR</h3>
            </div>
            <p className="text-sm text-gray-600">
              Reuses Lease Lab OCR pipeline for accurate text extraction from Section 20 documents.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <HardHat className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Stage Detection</h3>
            </div>
            <p className="text-sm text-gray-600">
              AI automatically classifies Notice of Intention, Estimates, Contract Awards, and more.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Outlook Integration</h3>
            </div>
            <p className="text-sm text-gray-600">
              Auto-creates calendar events for deadlines and drafts emails for leaseholders.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Cost Extraction</h3>
            </div>
            <p className="text-sm text-gray-600">
              Extracts contractor names, estimated costs, and leaseholder contribution thresholds.
            </p>
          </div>
        </div>

        {/* Document Types */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Supported Document Types</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                stage: 'Notice of Intention',
                description: 'Initial notice to leaseholders about proposed works (Stage 1)',
                timeline: '90-day consultation window',
                color: 'blue'
              },
              {
                stage: 'Statement of Estimates',
                description: 'Detailed costs and contractor quotes (Stage 2)',
                timeline: 'Leaseholder summary required',
                color: 'green'
              },
              {
                stage: 'Award of Contract',
                description: 'Notification of selected contractor (Stage 3)',
                timeline: 'Works commencement scheduling',
                color: 'purple'
              },
              {
                stage: 'Works Order',
                description: 'Formal instruction to commence works',
                timeline: 'Active monitoring phase',
                color: 'orange'
              },
              {
                stage: 'Completion Certificate',
                description: 'Works completed notification',
                timeline: 'Final account preparation',
                color: 'indigo'
              },
              {
                stage: 'Final Account',
                description: 'Final costs and leaseholder charges',
                timeline: 'Project closure',
                color: 'pink'
              }
            ].map((docType) => (
              <div key={docType.stage} className="border border-gray-200 rounded-lg p-4">
                <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium bg-${docType.color}-100 text-${docType.color}-800 mb-2`}>
                  {docType.stage}
                </div>
                <p className="text-sm text-gray-900 mb-1">{docType.description}</p>
                <p className="text-xs text-gray-500">{docType.timeline}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Process Flow */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Process</h2>
          <div className="space-y-4">
            {[
              {
                step: 1,
                title: 'Document Upload',
                description: 'Upload PDF, Word, or image files to building_documents bucket with major_works prefix'
              },
              {
                step: 2,
                title: 'OCR & AI Analysis',
                description: 'Intelligent text extraction and Major Works-specific classification with metadata extraction'
              },
              {
                step: 3,
                title: 'Database Integration',
                description: 'Save to building_documents table and link to major_works_projects for tracking'
              },
              {
                step: 4,
                title: 'User Confirmation',
                description: 'Review AI classification with confidence score and confirm or mark for manual review'
              },
              {
                step: 5,
                title: 'Automation Triggers',
                description: 'Create Outlook calendar events, draft emails, and update project timelines'
              },
              {
                step: 6,
                title: 'Audit Trail',
                description: 'Log all actions in major_works_logs with full audit trail and user confirmations'
              }
            ].map((processStep) => (
              <div key={processStep.step} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  {processStep.step}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{processStep.title}</h3>
                  <p className="text-sm text-gray-600">{processStep.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <MajorWorksUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        buildingId={selectedBuilding}
        buildingName={buildings.find(b => b.id === selectedBuilding)?.name}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  )
}