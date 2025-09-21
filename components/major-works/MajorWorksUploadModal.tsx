'use client'

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Upload,
  X,
  FileText,
  Image,
  AlertCircle,
  CheckCircle,
  Loader2,
  Building2,
  HardHat,
  Calendar,
  Mail,
  DollarSign,
  Clock,
  Users,
  Bell
} from 'lucide-react'
import { toast } from 'sonner'

interface MajorWorksUploadModalProps {
  isOpen: boolean
  onClose: () => void
  buildingId: string
  buildingName?: string
  onUploadComplete?: (result: any) => void
}

interface UploadFile {
  file: File
  id: string
  progress: number
  status: 'pending' | 'uploading' | 'analyzing' | 'confirming' | 'completed' | 'failed'
  error?: string
  analysis?: MajorWorksAnalysis
}

interface MajorWorksAnalysis {
  stage: string
  building_name?: string
  estimated_cost?: number
  contractors: string[]
  leaseholder_thresholds?: number
  works_description?: string
  consultation_period_days?: number
  start_date?: string
  completion_date?: string
  confidence: number
}

interface UploadResult {
  success: boolean
  document: {
    id: string
    filename: string
    public_url: string
    file_size: number
  }
  analysis: MajorWorksAnalysis
  project: {
    id: string | null
    linked: boolean
  }
  outlook_integration: any
  next_steps: string[]
}

const MajorWorksUploadModal: React.FC<MajorWorksUploadModalProps> = ({
  isOpen,
  onClose,
  buildingId,
  buildingName,
  onUploadComplete
}) => {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [currentResult, setCurrentResult] = useState<UploadResult | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    rejectedFiles.forEach(({ file, errors }) => {
      errors.forEach((error: any) => {
        if (error.code === 'file-too-large') {
          toast.error(`File "${file.name}" is too large. Maximum size is 50MB`)
        } else if (error.code === 'file-invalid-type') {
          toast.error(`File "${file.name}" is not supported. Use PDF, Word, or image files.`)
        } else {
          toast.error(`File "${file.name}" was rejected: ${error.message}`)
        }
      })
    })

    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      file,
      id: `${file.name}-${Date.now()}`,
      progress: 0,
      status: 'pending'
    }))

    setUploadFiles(prev => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxFiles: 1, // Major Works typically one document at a time
    maxSize: 52428800, // 50MB
    disabled: isUploading
  })

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id))
  }

  const uploadFile = async (uploadFile: UploadFile) => {
    try {
      setUploadFiles(prev => prev.map(f =>
        f.id === uploadFile.id
          ? { ...f, status: 'uploading', progress: 10 }
          : f
      ))

      const formData = new FormData()
      formData.append('file', uploadFile.file)
      formData.append('buildingId', buildingId)
      formData.append('originalFilename', uploadFile.file.name)

      const xhr = new XMLHttpRequest()

      return new Promise<UploadResult>((resolve, reject) => {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 50) // Upload is 50% of total
            setUploadFiles(prev => prev.map(f =>
              f.id === uploadFile.id
                ? { ...f, progress }
                : f
            ))
          }
        }

        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              const result: UploadResult = JSON.parse(xhr.responseText)

              setUploadFiles(prev => prev.map(f =>
                f.id === uploadFile.id
                  ? {
                    ...f,
                    status: 'analyzing',
                    progress: 75,
                    analysis: result.analysis
                  }
                  : f
              ))

              // Simulate analysis completion
              setTimeout(() => {
                setUploadFiles(prev => prev.map(f =>
                  f.id === uploadFile.id
                    ? { ...f, status: 'confirming', progress: 100 }
                    : f
                ))
                resolve(result)
              }, 2000)

            } catch (error) {
              reject(new Error('Invalid response from server'))
            }
          } else {
            try {
              const errorResponse = JSON.parse(xhr.responseText)
              reject(new Error(errorResponse.error || `Upload failed with status ${xhr.status}`))
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`))
            }
          }
        }

        xhr.onerror = () => {
          reject(new Error('Network error during upload'))
        }

        xhr.open('POST', '/api/major-works/upload')
        xhr.send(formData)
      })
    } catch (error) {
      setUploadFiles(prev => prev.map(f =>
        f.id === uploadFile.id
          ? {
            ...f,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Upload failed'
          }
          : f
      ))
      throw error
    }
  }

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return

    setIsUploading(true)

    try {
      const uploadFile = uploadFiles[0]
      const result = await uploadFile(uploadFile)

      setCurrentResult(result)
      setShowConfirmation(true)

    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const confirmClassification = async (confirmed: boolean) => {
    if (!currentResult) return

    try {
      // Send confirmation to backend
      await fetch('/api/major-works/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: currentResult.document.id,
          user_confirmed: confirmed,
          analysis: currentResult.analysis
        })
      })

      if (confirmed) {
        setUploadFiles(prev => prev.map(f => ({ ...f, status: 'completed' })))
        toast.success('Major Works document uploaded and classified successfully!')
        onUploadComplete?.(currentResult)
      } else {
        // Allow user to manually reclassify
        toast.info('Classification rejected. Document saved for manual review.')
      }

      // Reset form
      setUploadFiles([])
      setCurrentResult(null)
      setShowConfirmation(false)

    } catch (error) {
      toast.error('Failed to confirm classification')
    }
  }

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'Notice of Intention':
        return <Bell className="h-5 w-5 text-blue-500" />
      case 'Statement of Estimates':
        return <DollarSign className="h-5 w-5 text-green-500" />
      case 'Award of Contract':
        return <CheckCircle className="h-5 w-5 text-purple-500" />
      case 'Works Order':
        return <HardHat className="h-5 w-5 text-orange-500" />
      default:
        return <FileText className="h-5 w-5 text-gray-500" />
    }
  }

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return 'TBC'
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'uploading':
      case 'analyzing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      case 'confirming':
        return <Clock className="h-5 w-5 text-yellow-500" />
      default:
        return <FileText className="h-5 w-5 text-gray-400" />
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <HardHat className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Upload Major Works Document</h2>
              <p className="text-sm text-gray-500">
                {buildingName || `Building ${buildingId}`} • Section 20 consultation documents
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {!showConfirmation ? (
            <>
              {/* Upload Dropzone */}
              <div
                {...getRootProps()}
                className={`
                  relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 mb-6
                  ${isDragActive
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
                  }
                  ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <input {...getInputProps()} />

                <div className="flex flex-col items-center gap-4">
                  <div className="p-3 bg-white rounded-full shadow-sm">
                    <Upload className={`h-8 w-8 ${isDragActive ? 'text-orange-500' : 'text-gray-400'}`} />
                  </div>

                  <div>
                    <p className="text-lg font-medium text-gray-900 mb-1">
                      {isDragActive ? 'Drop Major Works document here' : 'Upload Major Works Document'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Section 20 notices, estimates, contracts, and works orders
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Supports: PDF, Word documents, images • Max 50MB
                    </p>
                  </div>
                </div>
              </div>

              {/* File Queue */}
              {uploadFiles.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Document to Upload
                  </h3>

                  {uploadFiles.map((uploadFile) => (
                    <div
                      key={uploadFile.id}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border"
                    >
                      <div className="flex-shrink-0">
                        {uploadFile.file.type.startsWith('image/') ? (
                          <Image className="h-6 w-6 text-blue-500" />
                        ) : (
                          <FileText className="h-6 w-6 text-red-500" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {uploadFile.file.name}
                          </p>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(uploadFile.status)}
                            <span className="text-xs text-gray-500 capitalize">
                              {uploadFile.status === 'analyzing' ? 'AI analyzing...' : uploadFile.status}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-gray-500 mb-2">
                          {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB • {uploadFile.file.type || 'Unknown type'}
                        </p>

                        {/* Progress Bar */}
                        {(uploadFile.status === 'uploading' || uploadFile.status === 'analyzing') && (
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div
                              className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadFile.progress}%` }}
                            />
                          </div>
                        )}

                        {uploadFile.error && (
                          <p className="text-xs text-red-600 mt-1">
                            ⚠️ {uploadFile.error}
                          </p>
                        )}
                      </div>

                      {uploadFile.status === 'pending' && (
                        <button
                          onClick={() => removeFile(uploadFile.id)}
                          className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Remove file"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-500">
                  {uploadFiles.length > 0 && 'Ready to upload and analyze'}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleUpload}
                    disabled={isUploading || uploadFiles.length === 0}
                    className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Upload & Analyze
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Confirmation Modal */
            currentResult && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="p-3 bg-orange-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    {getStageIcon(currentResult.analysis.stage)}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    AI Classification Complete
                  </h3>
                  <p className="text-gray-600">
                    Please confirm the AI analysis is correct before filing the document.
                  </p>
                </div>

                {/* Analysis Results */}
                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Document Stage</label>
                      <div className="flex items-center gap-2 mt-1">
                        {getStageIcon(currentResult.analysis.stage)}
                        <span className="text-sm text-gray-900">{currentResult.analysis.stage}</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">AI Confidence</label>
                      <p className="text-sm text-gray-900 mt-1">{currentResult.analysis.confidence}%</p>
                    </div>

                    {currentResult.analysis.estimated_cost && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Estimated Cost</label>
                        <p className="text-sm text-gray-900 mt-1">
                          {formatCurrency(currentResult.analysis.estimated_cost)}
                        </p>
                      </div>
                    )}

                    {currentResult.analysis.consultation_period_days && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Consultation Period</label>
                        <p className="text-sm text-gray-900 mt-1">
                          {currentResult.analysis.consultation_period_days} days
                        </p>
                      </div>
                    )}
                  </div>

                  {currentResult.analysis.works_description && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Works Description</label>
                      <p className="text-sm text-gray-900 mt-1">{currentResult.analysis.works_description}</p>
                    </div>
                  )}

                  {currentResult.analysis.contractors.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Contractors</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {currentResult.analysis.contractors.map((contractor, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {contractor}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Next Steps */}
                {currentResult.next_steps.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Recommended Next Steps</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      {currentResult.next_steps.map((step, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Outlook Integration Info */}
                {currentResult.outlook_integration && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-green-600" />
                      <h4 className="text-sm font-medium text-green-900">Outlook Integration</h4>
                    </div>
                    <div className="text-sm text-green-800 space-y-1">
                      {currentResult.outlook_integration.calendar_events?.length > 0 && (
                        <p>✓ {currentResult.outlook_integration.calendar_events.length} calendar event(s) will be created</p>
                      )}
                      {currentResult.outlook_integration.email_drafts?.length > 0 && (
                        <p>✓ {currentResult.outlook_integration.email_drafts.length} email draft(s) prepared</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Confirmation Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Is this classification correct?
                  </p>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => confirmClassification(false)}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Needs Review
                    </button>

                    <button
                      onClick={() => confirmClassification(true)}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Accept & File
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

export default MajorWorksUploadModal