'use client'

import React, { useState, useRef, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Brain,
  Calendar,
  Info,
  Eye,
  Download
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'

interface UploadComplianceModalProps {
  isOpen: boolean
  onClose: () => void
  buildingId: string
  complianceAssetId: string
  assetName: string
}

interface ExtractedData {
  title: string
  summary: string
  last_renewed_date: string | null
  next_due_date: string | null
  compliance_issues: string | null
}

export default function UploadComplianceModal({ 
  isOpen, 
  onClose, 
  buildingId, 
  complianceAssetId, 
  assetName 
}: UploadComplianceModalProps) {
  const supabase = createClientComponentClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Validate file
  const validateFile = (file: File): string | null => {
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return 'File size must be less than 10MB'
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    const acceptedTypes = ['.pdf', '.doc', '.docx']
    if (!acceptedTypes.includes(fileExtension)) {
      return 'File type not supported. Accepted types: PDF, DOC, DOCX'
    }

    return null
  }

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | File[]) => {
    const file = Array.from(files)[0]
    if (!file) return

    const validationError = validateFile(file)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setSelectedFile(file)
    setExtractedData(null)
    setShowPreview(false)
  }, [])

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = e.dataTransfer.files
    handleFileSelect(files)
  }, [handleFileSelect])

  // Handle file upload and AI extraction
  const handleUploadAndAnalyse = async () => {
    if (!selectedFile) return

    setUploading(true)
    setUploadProgress(0)

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('User not authenticated')
      }

      // Generate file path
      const timestamp = Date.now()
      const fileName = `${timestamp}_${selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const filePath = `compliance-documents/${buildingId}/${complianceAssetId}/${fileName}`

      // Upload to Supabase storage
      setUploadProgress(25)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // Get public URL
      setUploadProgress(50)
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      // Send to AI extraction API
      setUploadProgress(75)
      const extractionResponse = await fetch('/api/extract-compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileUrl: publicUrl,
          buildingId,
          complianceAssetId,
          assetName
        })
      })

      if (!extractionResponse.ok) {
        const errorData = await extractionResponse.json()
        throw new Error(errorData.error || 'AI extraction failed')
      }

      const extractionData = await extractionResponse.json()
      setExtractedData(extractionData.extracted_data)
      setShowPreview(true)
      setUploadProgress(100)

      toast.success('Document uploaded and analysed successfully!')
      
      // Close modal after a short delay to show success
      setTimeout(() => {
        onClose()
        // Reset state
        setSelectedFile(null)
        setExtractedData(null)
        setShowPreview(false)
        setUploadProgress(0)
      }, 2000)

    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not found'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  if (!isOpen) return null

  return (
    <TooltipProvider>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-serif font-bold text-[#333333]">
                Upload Document for {assetName}
              </h2>
              <p className="text-gray-600 mt-1">
                Upload a compliance document and let AI extract key information
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={uploading}
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Upload Area */}
          {!selectedFile && (
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                isDragOver 
                  ? 'border-[#2BBEB4] bg-[#2BBEB4]/5' 
                  : 'border-gray-300 hover:border-[#2BBEB4]'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Drop your document here
              </h3>
              <p className="text-gray-600 mb-4">
                or click to browse files
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Supported formats: PDF, DOC, DOCX (max 10MB)
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-[#2BBEB4] hover:bg-[#0F5D5D] text-white"
              >
                Choose File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                className="hidden"
              />
            </div>
          )}

          {/* File Preview */}
          {selectedFile && !showPreview && (
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#2BBEB4]/10 rounded-lg">
                    <FileText className="h-6 w-6 text-[#2BBEB4]" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{selectedFile.name}</h4>
                    <p className="text-sm text-gray-600">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                    disabled={uploading}
                  >
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Extraction Preview */}
          {showPreview && extractedData && (
            <Card className="mb-6 border-[#2BBEB4]/20 bg-[#2BBEB4]/5">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="h-5 w-5 text-[#2BBEB4]" />
                  <h3 className="font-semibold text-[#333333]">AI Analysis Results</h3>
                  <Badge variant="outline" className="bg-[#2BBEB4]/10 text-[#2BBEB4] border-[#2BBEB4]/20">
                    Auto-filled
                  </Badge>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Document Title</label>
                    <p className="text-gray-900 mt-1">{extractedData.title}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Summary</label>
                    <p className="text-gray-900 mt-1 text-sm leading-relaxed">
                      {extractedData.summary}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        Last Renewed Date
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Auto-filled by document analysis
                          </TooltipContent>
                        </Tooltip>
                      </label>
                      <p className="text-gray-900 mt-1">{formatDate(extractedData.last_renewed_date)}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        Next Due Date
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Auto-filled by document analysis
                          </TooltipContent>
                        </Tooltip>
                      </label>
                      <p className="text-gray-900 mt-1">{formatDate(extractedData.next_due_date)}</p>
                    </div>
                  </div>
                  
                  {extractedData.compliance_issues && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Compliance Issues</label>
                      <p className="text-gray-900 mt-1 text-sm">{extractedData.compliance_issues}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress Bar */}
          {uploading && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Processing...</span>
                <span className="text-sm text-gray-500">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-[#2BBEB4] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {uploadProgress < 50 ? 'Uploading document...' : 
                 uploadProgress < 75 ? 'Processing with AI...' : 
                 'Saving to database...'}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={uploading}
            >
              Cancel
            </Button>
            
            {selectedFile && !showPreview && (
              <Button
                onClick={handleUploadAndAnalyse}
                disabled={uploading}
                className="bg-[#2BBEB4] hover:bg-[#0F5D5D] text-white px-6"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Upload & Analyse
                  </>
                )}
              </Button>
            )}
            
            {showPreview && (
              <Button
                onClick={onClose}
                className="bg-[#2BBEB4] hover:bg-[#0F5D5D] text-white px-6"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Done
              </Button>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
} 