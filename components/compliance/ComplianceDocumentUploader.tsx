'use client'

import React, { useState, useRef } from 'react'
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Calendar,
  User,
  Building2,
  Shield,
  Clock,
  RefreshCw,
  Zap,
  AlertCircle,
  Info
} from 'lucide-react'
import { toast } from 'sonner'

interface DocumentSummary {
  classification: string
  summary: string
  confidence: number
  inspectionDate?: string
  nextDueDate?: string
  contractorName?: string
  propertyAddress?: string
  certificateNumber?: string
  overallCondition?: string
  recommendations?: string[]
  observations?: string[]
  contractorContact?: string
}

interface ComplianceDocumentUploaderProps {
  buildingId: string
  buildingName: string
  onUploadSuccess: (result: any) => void
  onClose: () => void
}

export default function ComplianceDocumentUploader({ 
  buildingId, 
  buildingName, 
  onUploadSuccess, 
  onClose 
}: ComplianceDocumentUploaderProps) {
  const [isDragActive, setIsDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentSummary, setDocumentSummary] = useState<DocumentSummary | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const [isCreatingAsset, setIsCreatingAsset] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true)
    } else if (e.type === 'dragleave') {
      setIsDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a PDF file')
      return
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size too large. Please upload files smaller than 10MB.')
      return
    }

    setError(null)
    setSelectedFile(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const uploadAndAnalyze = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      // Get auth token
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Please log in to upload documents')
      }

      setUploadProgress(25)

      // Upload file and analyze using the general upload-and-analyse API
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('buildingId', buildingId)

      const response = await fetch('/api/upload-and-analyse', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      setUploadProgress(75)

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      setUploadProgress(100)

      // Parse document summary from AI analysis
      const summary = parseDocumentSummary(result.aiAnalysis, result.extractedText)
      setDocumentSummary(summary)
      setShowSummary(true)

    } catch (error) {
      console.error('Upload error:', error)
      setError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const parseDocumentSummary = (aiAnalysis: any, extractedText: string): DocumentSummary => {
    // Extract key information from AI analysis
    const classification = aiAnalysis.classification || 'Compliance Document'
    const summary = aiAnalysis.summary || 'Document analysis completed'
    const confidence = aiAnalysis.confidence || 0.8
    
    // Extract dates
    const inspectionDate = aiAnalysis.inspection_date || extractDateFromText(extractedText, 'inspection|tested|examined')
    const nextDueDate = aiAnalysis.next_due_date || calculateNextDueDate(inspectionDate, classification)
    
    // Extract contractor information
    const contractorName = aiAnalysis.contractor_name || extractFromText(extractedText, 'contractor|inspector|engineer')
    const contractorContact = aiAnalysis.contractor_contact || extractFromText(extractedText, 'contact|phone|email')
    
    // Extract property information
    const propertyAddress = aiAnalysis.property_address || buildingName
    const certificateNumber = aiAnalysis.certificate_number || extractFromText(extractedText, 'certificate|cert|reference')
    
    // Extract condition and recommendations
    const overallCondition = aiAnalysis.overall_condition || aiAnalysis.result || 'Satisfactory'
    const recommendations = aiAnalysis.recommendations || []
    const observations = aiAnalysis.observations || []

    return {
      classification,
      summary,
      confidence,
      inspectionDate,
      nextDueDate,
      contractorName,
      propertyAddress,
      certificateNumber,
      overallCondition,
      recommendations,
      observations,
      contractorContact
    }
  }

  const extractDateFromText = (text: string, keyword: string): string => {
    const regex = new RegExp(`${keyword}[\\s:]+(\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-]\\d{2,4})`, 'i')
    const match = text.match(regex)
    return match ? match[1] : new Date().toISOString().split('T')[0]
  }

  const extractFromText = (text: string, keyword: string): string => {
    const regex = new RegExp(`${keyword}[\\s:]+([^\\n\\r]+)`, 'i')
    const match = text.match(regex)
    return match ? match[1].trim() : ''
  }

  const calculateNextDueDate = (inspectionDate: string, classification: string): string => {
    const date = new Date(inspectionDate)
    
    // Set different validity periods based on document type
    let validityYears = 1
    if (classification.toLowerCase().includes('eicr') || classification.toLowerCase().includes('electrical')) {
      validityYears = 5
    } else if (classification.toLowerCase().includes('fire') || classification.toLowerCase().includes('fra')) {
      validityYears = 1
    } else if (classification.toLowerCase().includes('gas')) {
      validityYears = 1
    } else if (classification.toLowerCase().includes('insurance')) {
      validityYears = 1
    }
    
    date.setFullYear(date.getFullYear() + validityYears)
    return date.toISOString().split('T')[0]
  }

  const createComplianceAsset = async () => {
    if (!documentSummary) return

    setIsCreatingAsset(true)
    try {
      const response = await fetch('/api/compliance/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          building_id: buildingId,
          asset_type: documentSummary.classification,
          asset_name: documentSummary.classification,
          category: getCategoryFromClassification(documentSummary.classification),
          description: documentSummary.summary,
          inspection_frequency: getFrequencyFromClassification(documentSummary.classification),
          is_required: true,
          next_due_date: documentSummary.nextDueDate,
          notes: `Document uploaded on ${new Date().toLocaleDateString()}. ${documentSummary.summary}`,
          contractor: documentSummary.contractorName
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create compliance asset')
      }

      toast.success('Compliance asset created successfully!')
      onUploadSuccess(result)
      onClose()

    } catch (error) {
      console.error('Error creating compliance asset:', error)
      toast.error('Failed to create compliance asset')
    } finally {
      setIsCreatingAsset(false)
    }
  }

  const getCategoryFromClassification = (classification: string): string => {
    const lower = classification.toLowerCase()
    if (lower.includes('electrical') || lower.includes('eicr')) return 'electrical'
    if (lower.includes('fire') || lower.includes('fra')) return 'fire_safety'
    if (lower.includes('gas')) return 'gas'
    if (lower.includes('water')) return 'water_safety'
    if (lower.includes('structural')) return 'structural'
    if (lower.includes('environmental')) return 'environmental'
    return 'other'
  }

  const getFrequencyFromClassification = (classification: string): string => {
    const lower = classification.toLowerCase()
    if (lower.includes('electrical') || lower.includes('eicr')) return 'biennial'
    if (lower.includes('fire') || lower.includes('fra')) return 'annual'
    if (lower.includes('gas')) return 'annual'
    if (lower.includes('water')) return 'annual'
    return 'annual'
  }

  const resetUpload = () => {
    setSelectedFile(null)
    setDocumentSummary(null)
    setShowSummary(false)
    setError(null)
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (showSummary && documentSummary) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="h-6 w-6 text-blue-500" />
                Document Analysis Summary
              </h2>
              <button
                onClick={resetUpload}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-600 mt-2">Review the extracted information before creating the compliance asset</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Document Classification */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-semibold text-blue-900">Document Classification</h3>
              </div>
              <p className="text-blue-800 font-medium">{documentSummary.classification}</p>
              <p className="text-sm text-blue-600">Confidence: {Math.round(documentSummary.confidence * 100)}%</p>
            </div>

            {/* Key Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {documentSummary.inspectionDate && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-gray-600">Inspection Date</p>
                      <p className="font-semibold">{documentSummary.inspectionDate}</p>
                    </div>
                  </div>
                )}
                
                {documentSummary.nextDueDate && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm text-gray-600">Next Due Date</p>
                      <p className="font-semibold">{documentSummary.nextDueDate}</p>
                    </div>
                  </div>
                )}

                {documentSummary.contractorName && (
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="text-sm text-gray-600">Contractor/Inspector</p>
                      <p className="font-semibold">{documentSummary.contractorName}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-sm text-gray-600">Property</p>
                    <p className="font-semibold">{documentSummary.propertyAddress}</p>
                  </div>
                </div>

                {documentSummary.overallCondition && (
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="text-sm text-gray-600">Overall Condition</p>
                      <p className="font-semibold">{documentSummary.overallCondition}</p>
                    </div>
                  </div>
                )}

                {documentSummary.certificateNumber && (
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Certificate Number</p>
                      <p className="font-semibold">{documentSummary.certificateNumber}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Document Summary */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Document Summary</h3>
              <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{documentSummary.summary}</p>
            </div>

            {/* Recommendations */}
            {documentSummary.recommendations && documentSummary.recommendations.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Recommendations</h3>
                <ul className="space-y-2">
                  {documentSummary.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Observations */}
            {documentSummary.observations && documentSummary.observations.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Observations</h3>
                <ul className="space-y-2">
                  {documentSummary.observations.map((obs, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{obs}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                This will create a compliance asset for <strong>{buildingName}</strong>
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={resetUpload}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createComplianceAsset}
                  disabled={isCreatingAsset}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isCreatingAsset ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4" />
                  )}
                  Create Compliance Asset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-500" />
              Upload Compliance Document
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-gray-600 mt-2">Upload a compliance document for {buildingName}</p>
        </div>

        <div className="p-6">
          {!selectedFile ? (
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Drop your compliance document here
              </h3>
              <p className="text-gray-600 mb-4">
                or click to browse files
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileInput}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Choose File
              </button>
              <p className="text-xs text-gray-500 mt-2">
                PDF files only, max 10MB
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <FileText className="h-8 w-8 text-blue-500" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-600">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={resetUpload}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <button
                  onClick={resetUpload}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Choose Different File
                </button>
                <button
                  onClick={uploadAndAnalyze}
                  disabled={isUploading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Analyzing... {uploadProgress}%
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload & Analyze
                    </>
                  )}
                </button>
              </div>

              {isUploading && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
