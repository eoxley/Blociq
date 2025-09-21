'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Shield,
  AlertCircle,
  Building2,
  Calendar,
  FileText,
  User,
  MessageSquare
} from 'lucide-react'
import { BSAComplianceStatus, type BSAAnalysisResult } from '@/lib/compliance/bsa-analyzers'

interface BSAComplianceConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (confirmed: boolean, overrideData?: {
    status: BSAComplianceStatus
    reason: string
    notes?: string
  }) => void
  bsaAnalysis: BSAAnalysisResult
  documentInfo: {
    filename: string
    documentType: string
    buildingName: string
    assetName: string
    inspectionDate?: string
    nextDueDate?: string
  }
  isGoldenThread: boolean
}

const getStatusIcon = (status: BSAComplianceStatus) => {
  switch (status) {
    case 'compliant':
      return <CheckCircle className="w-5 h-5 text-green-600" />
    case 'non_compliant':
      return <XCircle className="w-5 h-5 text-red-600" />
    case 'remedial_action_pending':
      return <AlertTriangle className="w-5 h-5 text-orange-600" />
    case 'expired':
      return <Clock className="w-5 h-5 text-red-600" />
    case 'scheduled':
      return <Calendar className="w-5 h-5 text-blue-600" />
    case 'under_review':
      return <AlertCircle className="w-5 h-5 text-gray-600" />
    default:
      return <AlertCircle className="w-5 h-5 text-gray-600" />
  }
}

const getStatusColor = (status: BSAComplianceStatus) => {
  switch (status) {
    case 'compliant':
      return 'bg-green-50 border-green-200 text-green-800'
    case 'non_compliant':
      return 'bg-red-50 border-red-200 text-red-800'
    case 'remedial_action_pending':
      return 'bg-orange-50 border-orange-200 text-orange-800'
    case 'expired':
      return 'bg-red-50 border-red-200 text-red-800'
    case 'scheduled':
      return 'bg-blue-50 border-blue-200 text-blue-800'
    case 'under_review':
      return 'bg-gray-50 border-gray-200 text-gray-800'
    default:
      return 'bg-gray-50 border-gray-200 text-gray-800'
  }
}

const getRiskLevelColor = (riskLevel: string) => {
  switch (riskLevel) {
    case 'intolerable':
      return 'bg-red-100 text-red-800 border border-red-200'
    case 'tolerable':
      return 'bg-orange-100 text-orange-800 border border-orange-200'
    case 'broadly_acceptable':
      return 'bg-green-100 text-green-800 border border-green-200'
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-200'
  }
}

const BSAComplianceConfirmationModal: React.FC<BSAComplianceConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  bsaAnalysis,
  documentInfo,
  isGoldenThread
}) => {
  const [isOverriding, setIsOverriding] = useState(false)
  const [overrideStatus, setOverrideStatus] = useState<BSAComplianceStatus>(bsaAnalysis.status)
  const [overrideReason, setOverrideReason] = useState('')
  const [overrideNotes, setOverrideNotes] = useState('')

  const handleConfirm = () => {
    onConfirm(true)
  }

  const handleOverride = () => {
    if (!overrideReason.trim()) {
      alert('Please provide a reason for overriding the AI classification')
      return
    }

    onConfirm(false, {
      status: overrideStatus,
      reason: overrideReason,
      notes: overrideNotes
    })
  }

  const statusOptions: BSAComplianceStatus[] = [
    'compliant',
    'non_compliant',
    'remedial_action_pending',
    'expired',
    'scheduled',
    'under_review'
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="w-6 h-6 text-blue-600" />
            Building Safety Act Compliance Review
          </DialogTitle>
          <DialogDescription>
            Review and confirm the AI classification for this compliance document
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Golden Thread Indicator */}
          {isGoldenThread && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Building2 className="w-5 h-5" />
                <span className="font-semibold">Golden Thread Document</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                This document is part of the Building Safety Act Golden Thread for Higher Risk Buildings
              </p>
            </div>
          )}

          {/* Document Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Document Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Filename:</span>
                <p className="text-gray-700">{documentInfo.filename}</p>
              </div>
              <div>
                <span className="font-medium">Document Type:</span>
                <p className="text-gray-700">{documentInfo.documentType}</p>
              </div>
              <div>
                <span className="font-medium">Building:</span>
                <p className="text-gray-700">{documentInfo.buildingName}</p>
              </div>
              <div>
                <span className="font-medium">Asset:</span>
                <p className="text-gray-700">{documentInfo.assetName}</p>
              </div>
              {documentInfo.inspectionDate && (
                <div>
                  <span className="font-medium">Inspection Date:</span>
                  <p className="text-gray-700">{new Date(documentInfo.inspectionDate).toLocaleDateString('en-GB')}</p>
                </div>
              )}
              {documentInfo.nextDueDate && (
                <div>
                  <span className="font-medium">Next Due:</span>
                  <p className="text-gray-700">{new Date(documentInfo.nextDueDate).toLocaleDateString('en-GB')}</p>
                </div>
              )}
            </div>
          </div>

          {/* AI Classification */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">AI Classification Results</h3>

            {/* Status */}
            <div className="mb-4">
              <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${getStatusColor(bsaAnalysis.status)}`}>
                {getStatusIcon(bsaAnalysis.status)}
                <span className="font-medium capitalize">{bsaAnalysis.status.replace('_', ' ')}</span>
              </div>
            </div>

            {/* Risk Level */}
            <div className="mb-4">
              <span className="text-sm font-medium">Risk Level:</span>
              <div className={`inline-block ml-2 px-2 py-1 rounded text-sm ${getRiskLevelColor(bsaAnalysis.riskLevel)}`}>
                {bsaAnalysis.riskLevel.replace('_', ' ').toUpperCase()}
              </div>
            </div>

            {/* Priority */}
            <div className="mb-4">
              <span className="text-sm font-medium">Priority:</span>
              <span className={`ml-2 px-2 py-1 rounded text-sm ${
                bsaAnalysis.priority === 'high' ? 'bg-red-100 text-red-800' :
                bsaAnalysis.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                'bg-green-100 text-green-800'
              }`}>
                {bsaAnalysis.priority.toUpperCase()}
              </span>
            </div>

            {/* Findings */}
            {bsaAnalysis.findings.length > 0 && (
              <div className="mb-4">
                <span className="text-sm font-medium">Key Findings:</span>
                <ul className="mt-2 space-y-1">
                  {bsaAnalysis.findings.map((finding, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-orange-500 mt-1">•</span>
                      {finding}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Required */}
            {bsaAnalysis.actionRequired && (
              <div className="bg-orange-50 border border-orange-200 rounded p-3">
                <span className="text-sm font-medium text-orange-800">Action Required:</span>
                <p className="text-sm text-orange-700 mt-1">{bsaAnalysis.actionRequired}</p>
              </div>
            )}
          </div>

          {/* Override Section */}
          {!isOverriding ? (
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
              <div>
                <p className="font-medium">Classification looks incorrect?</p>
                <p className="text-sm text-gray-600">You can override the AI classification if needed</p>
              </div>
              <button
                onClick={() => setIsOverriding(true)}
                className="px-4 py-2 text-sm bg-yellow-100 text-yellow-800 rounded border border-yellow-200 hover:bg-yellow-200"
              >
                Override Classification
              </button>
            </div>
          ) : (
            <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-yellow-800">
                <User className="w-5 h-5" />
                Override AI Classification
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">New Status:</label>
                  <select
                    value={overrideStatus}
                    onChange={(e) => setOverrideStatus(e.target.value as BSAComplianceStatus)}
                    className="w-full p-2 border rounded-md"
                  >
                    {statusOptions.map(status => (
                      <option key={status} value={status}>
                        {status.replace('_', ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Reason for Override:</label>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="e.g., Missing information in AI analysis"
                    className="w-full p-2 border rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Additional Notes (Optional):</label>
                  <textarea
                    value={overrideNotes}
                    onChange={(e) => setOverrideNotes(e.target.value)}
                    placeholder="Any additional context or notes"
                    rows={3}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>

            {isOverriding ? (
              <>
                <button
                  onClick={() => setIsOverriding(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleOverride}
                  className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                >
                  Apply Override
                </button>
              </>
            ) : (
              <button
                onClick={handleConfirm}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Confirm Classification
              </button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BSAComplianceConfirmationModal