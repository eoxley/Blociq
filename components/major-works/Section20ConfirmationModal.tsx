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
  Building2,
  Calendar,
  FileText,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  Tool
} from 'lucide-react'
import { Section20Stage, Section20AnalysisResult } from '@/lib/major-works/section20-analyzers'

interface Section20ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (confirmed: boolean, overrideData?: {
    stage: Section20Stage
    projectTitle?: string
    reason: string
    notes?: string
  }) => void
  section20Analysis: Section20AnalysisResult
  documentInfo: {
    filename: string
    buildingName: string
    projectTitle?: string
  }
  projectInfo?: {
    id?: string
    isNew: boolean
  }
  outlookIntegration?: {
    calendarEventCreated: boolean
    taskCreated: boolean
    emailDraftCreated: boolean
  }
}

const getStageIcon = (stage: Section20Stage) => {
  switch (stage) {
    case 'notice_of_intention':
      return <FileText className="w-5 h-5 text-blue-600" />
    case 'statement_of_estimates':
      return <DollarSign className="w-5 h-5 text-green-600" />
    case 'award_of_contract':
      return <Tool className="w-5 h-5 text-purple-600" />
    default:
      return <AlertTriangle className="w-5 h-5 text-gray-600" />
  }
}

const getStageColor = (stage: Section20Stage) => {
  switch (stage) {
    case 'notice_of_intention':
      return 'bg-blue-50 border-blue-200 text-blue-800'
    case 'statement_of_estimates':
      return 'bg-green-50 border-green-200 text-green-800'
    case 'award_of_contract':
      return 'bg-purple-50 border-purple-200 text-purple-800'
    default:
      return 'bg-gray-50 border-gray-200 text-gray-800'
  }
}

const getStageTitle = (stage: Section20Stage) => {
  switch (stage) {
    case 'notice_of_intention':
      return 'Notice of Intention (Stage 1)'
    case 'statement_of_estimates':
      return 'Statement of Estimates (Stage 2)'
    case 'award_of_contract':
      return 'Award of Contract (Stage 3)'
    case 'works_order':
      return 'Works Order'
    default:
      return 'General Major Works Document'
  }
}

const Section20ConfirmationModal: React.FC<Section20ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  section20Analysis,
  documentInfo,
  projectInfo,
  outlookIntegration
}) => {
  const [isOverriding, setIsOverriding] = useState(false)
  const [overrideStage, setOverrideStage] = useState<Section20Stage>(section20Analysis.stage)
  const [overrideProjectTitle, setOverrideProjectTitle] = useState(section20Analysis.projectTitle || '')
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
      stage: overrideStage,
      projectTitle: overrideProjectTitle || undefined,
      reason: overrideReason,
      notes: overrideNotes
    })
  }

  const stageOptions: Section20Stage[] = [
    'notice_of_intention',
    'statement_of_estimates',
    'award_of_contract',
    'works_order',
    'other'
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building2 className="w-6 h-6 text-blue-600" />
            Section 20 Major Works Analysis Review
          </DialogTitle>
          <DialogDescription>
            Review and confirm the AI analysis of this Major Works document
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
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
                <span className="font-medium">Building:</span>
                <p className="text-gray-700">{documentInfo.buildingName}</p>
              </div>
              <div className="col-span-2">
                <span className="font-medium">Project Title:</span>
                <p className="text-gray-700">{section20Analysis.projectTitle || 'Not specified'}</p>
              </div>
            </div>
          </div>

          {/* AI Classification */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">AI Classification Results</h3>

            {/* Stage Classification */}
            <div className="mb-4">
              <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${getStageColor(section20Analysis.stage)}`}>
                {getStageIcon(section20Analysis.stage)}
                <span className="font-medium">{getStageTitle(section20Analysis.stage)}</span>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Confidence: {section20Analysis.confidence}%
              </div>
            </div>

            {/* Project Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {section20Analysis.estimatedCost && (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <div className="flex items-center gap-2 text-green-800 font-medium">
                    <DollarSign className="w-4 h-4" />
                    Estimated Cost
                  </div>
                  <p className="text-lg font-bold text-green-900">
                    £{section20Analysis.estimatedCost.toLocaleString()}
                  </p>
                </div>
              )}

              {section20Analysis.contractors.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <div className="flex items-center gap-2 text-blue-800 font-medium">
                    <Users className="w-4 h-4" />
                    Contractors Detected
                  </div>
                  <p className="text-lg font-bold text-blue-900">
                    {section20Analysis.contractors.length}
                  </p>
                </div>
              )}
            </div>

            {/* Contractors List */}
            {section20Analysis.contractors.length > 0 && (
              <div className="mb-4">
                <span className="text-sm font-medium">Contractors:</span>
                <ul className="mt-2 space-y-1">
                  {section20Analysis.contractors.map((contractor, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <div>
                        <span className="font-medium">{contractor.name}</span>
                        {contractor.estimatedCost && (
                          <span className="text-green-600 ml-2">
                            £{contractor.estimatedCost.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Timeline Information */}
            {(section20Analysis.timeline.consultationDeadline || section20Analysis.timeline.worksStartDate) && (
              <div className="mb-4">
                <span className="text-sm font-medium">Key Dates:</span>
                <div className="mt-2 space-y-1">
                  {section20Analysis.timeline.consultationDeadline && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-orange-500" />
                      <span>Consultation Deadline: {new Date(section20Analysis.timeline.consultationDeadline).toLocaleDateString('en-GB')}</span>
                    </div>
                  )}
                  {section20Analysis.timeline.worksStartDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-green-500" />
                      <span>Works Start: {new Date(section20Analysis.timeline.worksStartDate).toLocaleDateString('en-GB')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Compliance Information */}
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <span className="text-sm font-medium text-yellow-800">Section 20 Compliance:</span>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className={`w-4 h-4 ${section20Analysis.compliance.section20Required ? 'text-green-500' : 'text-gray-400'}`} />
                  <span>Section 20 Consultation {section20Analysis.compliance.section20Required ? 'Required' : 'Not Required'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className={`w-4 h-4 ${section20Analysis.compliance.noticePeriodCompliant ? 'text-green-500' : 'text-gray-400'}`} />
                  <span>Notice Period Compliant</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className={`w-4 h-4 ${section20Analysis.compliance.estimatesRequired ? 'text-green-500' : 'text-gray-400'}`} />
                  <span>Estimates Required</span>
                </div>
              </div>
            </div>
          </div>

          {/* Project Information */}
          {projectInfo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-blue-800">Project Information</h3>
              <div className="text-sm">
                {projectInfo.isNew ? (
                  <p className="text-blue-700">✅ New Major Works project will be created</p>
                ) : (
                  <p className="text-blue-700">🔗 Document will be linked to existing project</p>
                )}
              </div>
            </div>
          )}

          {/* Outlook Integration Status */}
          {outlookIntegration && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2 text-green-800">Outlook Integration</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className={`w-4 h-4 ${outlookIntegration.calendarEventCreated ? 'text-green-500' : 'text-gray-400'}`} />
                  <span>Calendar Event</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className={`w-4 h-4 ${outlookIntegration.taskCreated ? 'text-green-500' : 'text-gray-400'}`} />
                  <span>Management Task</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className={`w-4 h-4 ${outlookIntegration.emailDraftCreated ? 'text-green-500' : 'text-gray-400'}`} />
                  <span>Email Draft</span>
                </div>
              </div>
            </div>
          )}

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
                <MessageSquare className="w-5 h-5" />
                Override AI Classification
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">New Stage:</label>
                  <select
                    value={overrideStage}
                    onChange={(e) => setOverrideStage(e.target.value as Section20Stage)}
                    className="w-full p-2 border rounded-md"
                  >
                    {stageOptions.map(stage => (
                      <option key={stage} value={stage}>
                        {getStageTitle(stage)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Project Title (Optional):</label>
                  <input
                    type="text"
                    value={overrideProjectTitle}
                    onChange={(e) => setOverrideProjectTitle(e.target.value)}
                    placeholder="e.g., Roof Repairs and External Decoration"
                    className="w-full p-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Reason for Override:</label>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="e.g., AI missed key indicators in document"
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
                Confirm & File Document
              </button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default Section20ConfirmationModal