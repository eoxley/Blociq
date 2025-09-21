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
  FileIcon,
  Calendar,
  Clock,
  Users,
  DollarSign,
  Mail,
  Shield,
  Gavel,
  ClipboardList,
  Settings,
  TrendingUp,
  MessageSquare
} from 'lucide-react'
import { toast } from 'sonner'

interface GeneralDocumentUploadModalProps {
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
  analysis?: GeneralDocumentAnalysis
}

interface GeneralDocumentAnalysis {
  document_type: string
  document_date?: string
  expiry_date?: string
  parties_involved: string[]
  keywords: string[]
  summary: string
  confidence: number
  metadata: Record<string, any>
}

interface UploadResult {
  success: boolean
  document: {
    id: string
    filename: string
    public_url: string
    file_size: number
  }
  analysis: GeneralDocumentAnalysis
  outlook_integration: any
  next_steps: string[]
}

const DOCUMENT_TYPE_INFO = {
  insurance_policy: {
    label: 'Insurance Policy',
    icon: Shield,
    color: 'blue',
    description: 'Building insurance, liability policies'
  },
  meeting_minutes: {
    label: 'Meeting Minutes',
    icon: ClipboardList,
    color: 'green',
    description: 'Board meetings, AGM, EGM minutes'
  },
  contract: {
    label: 'Contract',
    icon: Gavel,
    color: 'purple',
    description: 'Service agreements, maintenance contracts'
  },
  general_correspondence: {
    label: 'General Correspondence',
    icon: MessageSquare,
    color: 'gray',
    description: 'Letters, emails, notices'
  },
  maintenance_report: {
    label: 'Maintenance Report',
    icon: Settings,
    color: 'orange',
    description: 'Inspection reports, repair assessments'
  },
  financial_statement: {
    label: 'Financial Statement',
    icon: TrendingUp,
    color: 'indigo',
    description: 'Accounts, budgets, financial reports'
  },
  legal_notice: {
    label: 'Legal Notice',
    icon: Gavel,
    color: 'red',
    description: 'Court orders, legal correspondence'
  },
  survey_report: {
    label: 'Survey Report',
    icon: ClipboardList,
    color: 'cyan',
    description: 'Building surveys, condition assessments'
  },
  contractor_quote: {
    label: 'Contractor Quote',
    icon: DollarSign,
    color: 'yellow',
    description: 'Quotes, estimates, proposals'
  },
  other: {
    label: 'Other',
    icon: FileText,
    color: 'gray',
    description: 'Unclassified document'
  }
}

const GeneralDocumentUploadModal: React.FC<GeneralDocumentUploadModalProps> = ({
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
  const [userOverride, setUserOverride] = useState<{
    document_type: string
    expiry_date?: string
    contractor?: string
  } | null>(null)

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    rejectedFiles.forEach(({ file, errors }) => {
      errors.forEach((error: any) => {
        if (error.code === 'file-too-large') {
          toast.error(`File "${file.name}" is too large. Maximum size is 50MB`)
        } else if (error.code === 'file-invalid-type') {
          toast.error(`File "${file.name}" is not supported. Use PDF, Word, Excel, text, or image files.`)
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
      'text/plain': ['.txt'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1, // One document at a time for focused classification
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

        xhr.open('POST', '/api/documents/general/upload')
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
      await fetch('/api/documents/general/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: currentResult.document.id,
          user_confirmed: confirmed,
          ai_classification: currentResult.analysis.document_type,
          user_override: userOverride
        })
      })

      if (confirmed || userOverride) {
        setUploadFiles(prev => prev.map(f => ({ ...f, status: 'completed' })))
        toast.success(userOverride
          ? `Document reclassified as ${DOCUMENT_TYPE_INFO[userOverride.document_type as keyof typeof DOCUMENT_TYPE_INFO]?.label} and filed successfully!`
          : 'Document classified and filed successfully!'
        )
        onUploadComplete?.(currentResult)
      } else {
        toast.info('Document marked for manual review.')
      }

      // Reset form
      setUploadFiles([])
      setCurrentResult(null)
      setShowConfirmation(false)
      setUserOverride(null)

    } catch (error) {
      toast.error('Failed to confirm classification')
    }
  }

  const handleOverride = () => {
    if (!currentResult) return

    // Set default override to current analysis but allow user to change
    setUserOverride({
      document_type: currentResult.analysis.document_type,
      expiry_date: currentResult.analysis.expiry_date || undefined
    })
  }

  const getDocumentTypeIcon = (documentType: string) => {
    const info = DOCUMENT_TYPE_INFO[documentType as keyof typeof DOCUMENT_TYPE_INFO]
    if (!info) return <FileText className="h-5 w-5" />

    const IconComponent = info.icon
    return <IconComponent className="h-5 w-5" />
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

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not specified'
    try {
      return new Date(dateString).toLocaleDateString('en-GB')
    } catch {
      return dateString
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Upload General Document</h2>
              <p className="text-sm text-gray-500">
                {buildingName || `Building ${buildingId}`} • AI-powered document classification
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
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
                  }
                  ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <input {...getInputProps()} />

                <div className="flex flex-col items-center gap-4">
                  <div className="p-3 bg-white rounded-full shadow-sm">
                    <Upload className={`h-8 w-8 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
                  </div>

                  <div>
                    <p className="text-lg font-medium text-gray-900 mb-1">
                      {isDragActive ? 'Drop document here' : 'Upload General Document'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Insurance policies, contracts, minutes, correspondence, and more
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Supports: PDF, Word, Excel, text files, images • Max 50MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Supported Document Types */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Supported Document Types</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                  {Object.entries(DOCUMENT_TYPE_INFO).slice(0, -1).map(([key, info]) => (
                    <div key={key} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
                      <info.icon className={`h-3 w-3 text-${info.color}-500`} />
                      <span className="text-gray-700">{info.label}</span>
                    </div>
                  ))}
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
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
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
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                  <div className="p-3 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    {getDocumentTypeIcon(userOverride?.document_type || currentResult.analysis.document_type)}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    AI Classification Complete
                  </h3>
                  <p className="text-gray-600">
                    Please confirm the classification is correct or override if needed.
                  </p>
                </div>

                {/* Analysis Results */}
                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Document Type</label>
                      <div className="flex items-center gap-2 mt-1">
                        {getDocumentTypeIcon(currentResult.analysis.document_type)}
                        <span className="text-sm text-gray-900">
                          {DOCUMENT_TYPE_INFO[currentResult.analysis.document_type as keyof typeof DOCUMENT_TYPE_INFO]?.label || currentResult.analysis.document_type}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">AI Confidence</label>
                      <p className="text-sm text-gray-900 mt-1">{currentResult.analysis.confidence}%</p>
                    </div>

                    {currentResult.analysis.document_date && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Document Date</label>
                        <p className="text-sm text-gray-900 mt-1">
                          {formatDate(currentResult.analysis.document_date)}
                        </p>
                      </div>
                    )}

                    {currentResult.analysis.expiry_date && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Expiry Date</label>
                        <p className="text-sm text-gray-900 mt-1">
                          {formatDate(currentResult.analysis.expiry_date)}
                        </p>
                      </div>
                    )}
                  </div>

                  {currentResult.analysis.summary && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Summary</label>
                      <p className="text-sm text-gray-900 mt-1">{currentResult.analysis.summary}</p>
                    </div>
                  )}

                  {currentResult.analysis.parties_involved.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Parties Involved</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {currentResult.analysis.parties_involved.map((party, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {party}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentResult.analysis.keywords.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Keywords</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {currentResult.analysis.keywords.map((keyword, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Override Section */}
                {userOverride && (
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <h4 className="text-sm font-medium text-yellow-900 mb-3">Override Classification</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Document Type</label>
                        <select
                          value={userOverride.document_type}
                          onChange={(e) => setUserOverride({...userOverride, document_type: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                          {Object.entries(DOCUMENT_TYPE_INFO).map(([key, info]) => (
                            <option key={key} value={key}>{info.label}</option>
                          ))}
                        </select>
                      </div>
                      {(userOverride.document_type === 'insurance_policy' || userOverride.document_type === 'contract') && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">Expiry Date (optional)</label>
                          <input
                            type="date"
                            value={userOverride.expiry_date || ''}
                            onChange={(e) => setUserOverride({...userOverride, expiry_date: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          />
                        </div>
                      )}
                    </div>
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
                      {currentResult.outlook_integration.calendar_event_id && (
                        <p>✓ Calendar event created for reminders</p>
                      )}
                      {currentResult.outlook_integration.task_id && (
                        <p>✓ Task created for review</p>
                      )}
                      {currentResult.outlook_integration.email_draft_id && (
                        <p>✓ Email draft prepared</p>
                      )}
                    </div>
                  </div>
                )}

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

                {/* Confirmation Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Is this classification correct?
                  </div>

                  <div className="flex items-center gap-3">
                    {!userOverride ? (
                      <>
                        <button
                          onClick={handleOverride}
                          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          Override
                        </button>

                        <button
                          onClick={() => confirmClassification(true)}
                          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Accept & File
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setUserOverride(null)}
                          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          Cancel Override
                        </button>

                        <button
                          onClick={() => confirmClassification(false)}
                          className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Save Override
                        </button>
                      </>
                    )}
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

export default GeneralDocumentUploadModal