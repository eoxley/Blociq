'use client'

import React, { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  Upload, 
  FileText, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Loader2,
  Cloud,
  Download,
  Eye
} from 'lucide-react'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import { toast } from 'sonner'

interface UploadComplianceModalProps {
  buildingId: string
  complianceAssetId: string
  assetName: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface ExtractedData {
  title: string
  summary: string
  last_renewed_date: string
  next_due_date: string
}

interface UploadState {
  isUploading: boolean
  isProcessing: boolean
  isSaving: boolean
  progress: number
  file: File | null
  extractedData: ExtractedData | null
  error: string | null
}

export default function UploadComplianceModal({
  buildingId,
  complianceAssetId,
  assetName,
  isOpen,
  onClose,
  onSuccess
}: UploadComplianceModalProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    isProcessing: false,
    isSaving: false,
    progress: 0,
    file: null,
    extractedData: null,
    error: null
  })


  const resetState = useCallback(() => {
    setUploadState({
      isUploading: false,
      isProcessing: false,
      isSaving: false,
      progress: 0,
      file: null,
      extractedData: null,
      error: null
    })
  }, [])

  const handleClose = useCallback(() => {
    resetState()
    onClose()
  }, [resetState, onClose])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
      if (!allowedTypes.includes(file.type)) {
        setUploadState(prev => ({
          ...prev,
          error: 'Please upload a PDF or image file (JPEG, PNG)'
        }))
        return
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setUploadState(prev => ({
          ...prev,
          error: 'File size must be less than 10MB'
        }))
        return
      }

      setUploadState(prev => ({
        ...prev,
        file,
        error: null
      }))
    }
  }, [])

  const uploadToSupabase = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${buildingId}/${complianceAssetId}/${Date.now()}.${fileExt}`
    const filePath = `compliance-documents/${fileName}`

    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      throw new Error(`Upload failed: ${error.message}`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath)

    return urlData.publicUrl
  }

  const extractDocumentData = async (fileUrl: string): Promise<ExtractedData> => {
    const response = await fetch('/api/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileUrl,
        assetName,
        buildingId
      })
    })

    if (!response.ok) {
      throw new Error(`Extraction failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  }

  const saveToDatabase = async (fileUrl: string, extractedData: ExtractedData) => {
    // Save to compliance_documents
    const { data: documentData, error: documentError } = await supabase
      .from('compliance_docs')
      .insert({
        building_id: buildingId,
        doc_type: assetName,
        doc_url: fileUrl,
        title: extractedData.title,
        summary: extractedData.summary,
        uploaded_at: new Date().toISOString(),
        expiry_date: extractedData.next_due_date || null
      })
      .select()
      .single()

    if (documentError) {
      throw new Error(`Failed to save document: ${documentError.message}`)
    }

    // Update building_compliance_assets
    const { error: assetError } = await supabase
      .from('building_compliance_assets')
      .update({
        last_renewed_date: extractedData.last_renewed_date || null,
        next_due_date: extractedData.next_due_date || null,
        latest_document_id: documentData.id,
        last_updated: new Date().toISOString()
      })
      .eq('building_id', buildingId)
      .eq('asset_id', complianceAssetId)

    if (assetError) {
      throw new Error(`Failed to update asset: ${assetError.message}`)
    }

    return documentData
  }

  const handleUpload = async () => {
    if (!uploadState.file) return

    try {
      setUploadState(prev => ({ ...prev, isUploading: true, error: null }))

      // Step 1: Upload to Supabase Storage
      const fileUrl = await uploadToSupabase(uploadState.file)
      setUploadState(prev => ({ ...prev, progress: 33, isUploading: false, isProcessing: true }))

      // Step 2: Extract data using AI
      const extractedData = await extractDocumentData(fileUrl)
      setUploadState(prev => ({ ...prev, progress: 66, extractedData }))

      // Step 3: Save to database
      setUploadState(prev => ({ ...prev, isProcessing: false, isSaving: true }))
      await saveToDatabase(fileUrl, extractedData)
      setUploadState(prev => ({ ...prev, progress: 100, isSaving: false }))

      // Success
      toast.success('Document uploaded and processed successfully!', {
        description: `AI extracted key dates and information from ${uploadState.file.name}`
      })

      // Call success callback
      if (onSuccess) {
        onSuccess()
      }

      // Close modal after a brief delay
      setTimeout(() => {
        handleClose()
      }, 1500)

    } catch (error) {
      console.error('Upload error:', error)
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        isProcessing: false,
        isSaving: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      }))
      
      toast.error('Upload failed', {
        description: error instanceof Error ? error.message : 'Please try again'
      })
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  if (!isOpen) return null

  return (
            <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300 ease-in-out">
      <BlocIQCard className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <BlocIQCardHeader className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#2BBEB4] rounded-lg flex items-center justify-center">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-serif font-semibold text-[#333333]">
                  Upload Compliance Document
                </h2>
                <p className="text-sm text-gray-600 font-serif">
                  {assetName}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </BlocIQCardHeader>

        <BlocIQCardContent className="p-6 space-y-6">
          {/* File Upload Area */}
          {!uploadState.file && (
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-[#2BBEB4] transition-colors cursor-pointer"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                onDrop(Array.from(e.dataTransfer.files))
              }}
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = '.pdf,.jpg,.jpeg,.png'
                input.onchange = (e) => {
                  const files = (e.target as HTMLInputElement).files
                  if (files) onDrop(Array.from(files))
                }
                input.click()
              }}
            >
              <Cloud className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-serif font-semibold text-[#333333] mb-2">
                Drop your document here
              </h3>
              <p className="text-gray-600 font-serif mb-4">
                or click to browse files
              </p>
              <p className="text-sm text-gray-500">
                Supports PDF, JPEG, PNG (max 10MB)
              </p>
            </div>
          )}

          {/* Selected File */}
          {uploadState.file && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <FileText className="w-8 h-8 text-[#2BBEB4]" />
                <div className="flex-1">
                  <h4 className="font-serif font-semibold text-[#333333]">
                    {uploadState.file.name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {formatFileSize(uploadState.file.size)}
                  </p>
                </div>
                <button
                  onClick={() => setUploadState(prev => ({ ...prev, file: null }))}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {(uploadState.isUploading || uploadState.isProcessing || uploadState.isSaving) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-serif text-gray-600">
                  {uploadState.isUploading && 'Uploading to cloud...'}
                  {uploadState.isProcessing && 'AI processing document...'}
                  {uploadState.isSaving && 'Saving to database...'}
                </span>
                <span className="text-[#2BBEB4] font-semibold">
                  {uploadState.progress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[#2BBEB4] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadState.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Extracted Data Preview */}
          {uploadState.extractedData && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-serif font-semibold text-blue-900 mb-3 flex items-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                AI Extracted Information
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-blue-800">Title:</span>
                  <span className="text-blue-700 ml-2">{uploadState.extractedData.title}</span>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Last Renewed:</span>
                  <span className="text-blue-700 ml-2">
                    {uploadState.extractedData.last_renewed_date ? 
                      formatDate(uploadState.extractedData.last_renewed_date) : 
                      'Not found'
                    }
                  </span>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Next Due:</span>
                  <span className="text-blue-700 ml-2">
                    {uploadState.extractedData.next_due_date ? 
                      formatDate(uploadState.extractedData.next_due_date) : 
                      'Not found'
                    }
                  </span>
                </div>
                {uploadState.extractedData.summary && (
                  <div>
                    <span className="font-medium text-blue-800">Summary:</span>
                    <p className="text-blue-700 mt-1 text-xs">
                      {uploadState.extractedData.summary}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {uploadState.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-700 font-serif">{uploadState.error}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <BlocIQButton
              variant="outline"
              onClick={handleClose}
              disabled={uploadState.isUploading || uploadState.isProcessing || uploadState.isSaving}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </BlocIQButton>
            <BlocIQButton
              onClick={handleUpload}
              disabled={!uploadState.file || uploadState.isUploading || uploadState.isProcessing || uploadState.isSaving}
              className="bg-[#2BBEB4] hover:bg-[#0F5D5D] text-white min-w-[120px]"
            >
              {uploadState.isUploading || uploadState.isProcessing || uploadState.isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {uploadState.isUploading && 'Uploading...'}
                  {uploadState.isProcessing && 'Processing...'}
                  {uploadState.isSaving && 'Saving...'}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload & Process
                </>
              )}
            </BlocIQButton>
          </div>
        </BlocIQCardContent>
      </BlocIQCard>
    </div>
  )
} 