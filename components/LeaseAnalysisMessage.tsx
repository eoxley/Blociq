"use client"

import React, { useState } from 'react'
import { FileText, MapPin, Users, DollarSign, Calendar, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react'

interface LeaseAnalysisMessageProps {
  leaseData: any
  fileName: string
  onStartQA: () => void
}

export default function LeaseAnalysisMessage({ leaseData, fileName, onStartQA }: LeaseAnalysisMessageProps) {
  const [showFullAnalysis, setShowFullAnalysis] = useState(false)

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden max-w-2xl">
      {/* Compact Header */}
      <div className="bg-gray-50 px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-600" />
            <div>
              <h3 className="font-semibold text-gray-900">LEASE ANALYSIS</h3>
              <p className="text-sm text-gray-600">{fileName}</p>
            </div>
          </div>
          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-medium">
            High Confidence ({leaseData.confidence || 85}%)
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Generated: {leaseData.generatedDate} • {leaseData.executiveSummary?.length || 0} characters
        </div>
      </div>

      {/* Executive Summary Preview */}
      <div className="p-4">
        <p className="text-gray-700 text-sm leading-relaxed mb-4">
          {leaseData.executiveSummary || "This lease agreement analysis will appear here once the document is processed."}
        </p>

        {/* Key Details Cards */}
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-100 rounded p-3">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              Property Details
            </h4>
            <div className="text-sm text-gray-700">
              <div><strong>Address:</strong> {leaseData.basicDetails?.property || "Property address will be extracted"}</div>
              {leaseData.basicDetails?.titleNumber && (
                <div><strong>Title Number:</strong> {leaseData.basicDetails.titleNumber}</div>
              )}
            </div>
          </div>

          <div className="bg-green-50 border border-green-100 rounded p-3">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              Key Parties
            </h4>
            <div className="text-sm text-gray-700 space-y-1">
              <div><strong>Lessor:</strong> {leaseData.basicDetails?.parties?.lessor || "Lessor details will be extracted"}</div>
              <div><strong>Lessee:</strong> {leaseData.basicDetails?.parties?.lessee || "Lessee details will be extracted"}</div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-100 rounded p-3">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-yellow-600" />
              Lease Terms
            </h4>
            <div className="text-sm text-gray-700">
              <div><strong>Term:</strong> {leaseData.basicDetails?.leaseTerm || "Term details will be extracted"}</div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-100 rounded p-3">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              Financial Terms
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
              <div>
                <div><strong>Ground Rent</strong></div>
                <div className="text-lg font-bold text-green-600">
                  {leaseData.financialTerms?.groundRent || "£XXX per year"}
                </div>
              </div>
              <div>
                <div><strong>Service Charge</strong></div>
                <div className="font-semibold">
                  {leaseData.financialTerms?.serviceCharge || "Variable"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Expandable Full Analysis */}
        {showFullAnalysis && leaseData.sections && leaseData.sections.length > 0 && (
          <div className="mt-4 space-y-3 border-t pt-4">
            <h4 className="font-semibold text-gray-900 mb-3">Detailed Analysis</h4>
            {leaseData.sections.map((section: any, index: number) => (
              <div key={section.id || index} className="border border-gray-200 rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{section.icon || '📋'}</span>
                  <h5 className="font-medium text-gray-900">{section.title}</h5>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{section.content}</p>
                {section.clauses && section.clauses.length > 0 && (
                  <div className="mt-2 text-xs text-gray-400">
                    <strong>Referenced Clauses:</strong> {section.clauses.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions Footer */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="text-white">
            <p className="font-medium text-sm">Ready to explore this lease further?</p>
            <p className="text-xs text-blue-100">
              Ask specific questions about repairs, rent, obligations, and more.
            </p>
          </div>
          <div className="flex gap-2">
            {leaseData.sections && leaseData.sections.length > 0 && (
              <button
                onClick={() => setShowFullAnalysis(!showFullAnalysis)}
                className="bg-white/20 text-white px-3 py-2 rounded text-sm hover:bg-white/30 transition-colors flex items-center gap-1"
              >
                {showFullAnalysis ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    Show Details
                  </>
                )}
              </button>
            )}
            <button
              onClick={onStartQA}
              className="bg-white text-blue-600 px-4 py-2 rounded text-sm font-medium hover:bg-blue-50 transition-colors flex items-center gap-2"
            >
              <MessageCircle className="h-3 w-3" />
              Start Q&A
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
