'use client'

import React, { useState, useRef } from 'react'
import { Upload, FileText, AlertCircle, CheckCircle, X, Loader2 } from 'lucide-react'

interface ComplianceDocumentUploaderProps {
  buildingId: string
  assetId?: string
  onUploadComplete: () => void
  className?: string
}

interface ClassificationResult {
  asset_id: string
  asset_name: string
  confidence: number
  doc_type: string
}

export default function ComplianceDocumentUploader({ 
  buildingId, 
  assetId, 
  onUploadComplete,
  className = '' 
}: ComplianceDocumentUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [classificationResult, setClassificationResult] = useState<ClassificationResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Step 1: Upload file to get URL
      const formData = new FormData()
      formData.append('file', file)
      formData.append('building_id', buildingId)
      if (assetId) {
        formData.append('asset_id', assetId)
      }

      const uploadResponse = await fetch('/api/compliance/documents/upload', {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file')
      }

      const uploadResult = await uploadResponse.json()
      setUploadProgress(50)

      // Step 2: AI Classification (if no specific asset_id provided)
      if (!assetId) {
        const classificationResponse = await fetch('/api/ai/classify-compliance-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_url: uploadResult.document.file_url,
            file_name: file.name,
            building_id: buildingId
          })
        })

        if (classificationResponse.ok) {
          const classification = await classificationResponse.json()
          setClassificationResult(classification)
          setShowModal(true)
        } else {
          // If classification fails, proceed with default
          await finalizeUpload(uploadResult.document.id, 'Certificate', null)
        }
      } else {
        // If asset_id is provided, no classification needed
        await finalizeUpload(uploadResult.document.id, 'Certificate', assetId)
      }

    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload document. Please try again.')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const finalizeUpload = async (documentId: string, docType: string, assetId?: string) => {
    try {
      const response = await fetch('/api/compliance/documents/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
          compliance_asset_id: assetId || classificationResult?.asset_id,
          doc_type: docType,
          classified_by_ai: !!classificationResult
        })
      })

      if (!response.ok) {
        throw new Error('Failed to finalize document')
      }

      setUploadProgress(100)
      onUploadComplete()
      setShowModal(false)
      setClassificationResult(null)

    } catch (error) {
      console.error('Finalization error:', error)
      alert('Failed to finalize document. Please try again.')
    }
  }

  const handleModalConfirm = () => {
    if (classificationResult && selectedFile) {
      finalizeUpload('temp-id', classificationResult.doc_type, classificationResult.asset_id)
    }
  }

  const handleModalCancel = () => {
    setShowModal(false)
    setClassificationResult(null)
    setSelectedFile(null)
    setIsUploading(false)
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <>
      <div className={`relative ${className}`}>
        <label className="cursor-pointer">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
          <div className="flex items-center gap-2 px-3 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors">
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Uploading... {uploadProgress}%</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Upload Document</span>
              </>
            )}
          </div>
        </label>

        {/* Progress bar */}
        {isUploading && (
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-teal-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Classification Modal */}
      {showModal && classificationResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Confirm Document Classification</h3>
              <button
                onClick={handleModalCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    {selectedFile?.name}
                  </p>
                  <p className="text-xs text-blue-700">
                    AI Classification: {classificationResult.confidence}% confidence
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Suggested Compliance Asset
                  </label>
                  <div className="p-2 bg-gray-50 rounded border">
                    <p className="text-sm font-medium">{classificationResult.asset_name}</p>
                    <p className="text-xs text-gray-500">Asset ID: {classificationResult.asset_id}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Type
                  </label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    defaultValue={classificationResult.doc_type}
                  >
                    <option value="Certificate">Certificate</option>
                    <option value="Report">Report</option>
                    <option value="Inspection Report">Inspection Report</option>
                    <option value="Test Certificate">Test Certificate</option>
                    <option value="Section 20 Notice">Section 20 Notice</option>
                    <option value="Quote/Estimate">Quote/Estimate</option>
                    <option value="Invoice">Invoice</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {classificationResult.confidence < 80 && (
                  <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <p className="text-sm text-yellow-800">
                      Low confidence classification. Please review and confirm.
                    </p>
                  </div>
                )}

                {classificationResult.confidence >= 80 && (
                  <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <p className="text-sm text-green-800">
                      High confidence classification.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleModalCancel}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleModalConfirm}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Accept & File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 