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
  Plus,
  Camera,
  Paperclip
} from 'lucide-react'
import { toast } from 'sonner'

interface DocumentUploadProps {
  buildingId: string
  assetId: string
  assetName?: string
  onUploadComplete?: (document: any) => void
  onUploadStart?: () => void
  maxFiles?: number
  acceptedFileTypes?: string[]
  maxFileSize?: number // in bytes
}

interface UploadFile {
  file: File
  id: string
  progress: number
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed'
  aiClassification?: {
    documentType: string
    category: string
    confidence: number
  }
  extractedData?: any
  error?: string
}

const ComplianceDocumentUpload: React.FC<DocumentUploadProps> = ({
  buildingId,
  assetId,
  assetName,
  onUploadComplete,
  onUploadStart,
  maxFiles = 10,
  acceptedFileTypes = ['.pdf', '.jpg', '.jpeg', '.png'],
  maxFileSize = 10 * 1024 * 1024 // 10MB default
}) => {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [isDragActive, setIsDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    rejectedFiles.forEach(({ file, errors }) => {
      errors.forEach((error: any) => {
        if (error.code === 'file-too-large') {
          toast.error(`File "${file.name}" is too large. Maximum size is ${maxFileSize / 1024 / 1024}MB`)
        } else if (error.code === 'file-invalid-type') {
          toast.error(`File "${file.name}" is not a supported type. Supported: ${acceptedFileTypes.join(', ')}`)
        } else if (error.code === 'too-many-files') {
          toast.error(`Too many files. Maximum is ${maxFiles} files`)
        } else {
          toast.error(`File "${file.name}" was rejected: ${error.message}`)
        }
      })
    })

    // Add accepted files to upload queue
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      file,
      id: `${file.name}-${Date.now()}`,
      progress: 0,
      status: 'pending'
    }))

    setUploadFiles(prev => [...prev, ...newFiles])
  }, [maxFiles, maxFileSize, acceptedFileTypes])

  const { getRootProps, getInputProps, isDragActive: dropzoneActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: maxFiles - uploadFiles.length,
    maxSize: maxFileSize,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    disabled: isUploading
  })

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id))
  }

  const uploadAllFiles = async () => {
    if (uploadFiles.length === 0) return
    
    setIsUploading(true)
    onUploadStart?.()

    try {
      for (const uploadFile of uploadFiles) {
        if (uploadFile.status === 'completed') continue

        // Update status to uploading
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'uploading', progress: 0 }
            : f
        ))

        await uploadSingleFile(uploadFile)
      }

      toast.success(`Successfully uploaded ${uploadFiles.length} document(s)`)
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload some documents')
    } finally {
      setIsUploading(false)
    }
  }

  const uploadSingleFile = async (uploadFile: UploadFile) => {
    try {
      // Create FormData
      const formData = new FormData()
      formData.append('file', uploadFile.file)
      formData.append('buildingId', buildingId)
      formData.append('assetId', assetId)
      formData.append('originalFilename', uploadFile.file.name)

      // Upload with progress tracking
      const xhr = new XMLHttpRequest()
      
      return new Promise<void>((resolve, reject) => {
        // Progress tracking
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100)
            setUploadFiles(prev => prev.map(f => 
              f.id === uploadFile.id 
                ? { ...f, progress: Math.min(progress, 90) } // Cap at 90% until AI processing
                : f
            ))
          }
        }

        // Success handler
        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText)
              
              // Update to processing status
              setUploadFiles(prev => prev.map(f => 
                f.id === uploadFile.id 
                  ? { 
                    ...f, 
                    status: 'processing', 
                    progress: 90,
                    aiClassification: response.aiClassification,
                    extractedData: response.extractedData
                  }
                  : f
              ))

              // Poll for AI processing completion
              pollProcessingStatus(uploadFile.id, response.documentId)
              resolve()
            } catch (error) {
              reject(error)
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`))
          }
        }

        // Error handler
        xhr.onerror = () => {
          setUploadFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, status: 'failed', error: 'Upload failed' }
              : f
          ))
          reject(new Error('Upload failed'))
        }

        // Send request
        xhr.open('POST', '/api/compliance/documents/upload')
        xhr.send(formData)
      })
    } catch (error) {
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' }
          : f
      ))
      throw error
    }
  }

  const pollProcessingStatus = async (fileId: string, documentId: string) => {
    const maxAttempts = 30 // 30 seconds max
    let attempts = 0

    const poll = async () => {
      try {
        const response = await fetch(`/api/compliance/documents/${documentId}/status`)
        const data = await response.json()

        if (data.processingStatus === 'completed') {
          setUploadFiles(prev => prev.map(f => 
            f.id === fileId 
              ? { 
                ...f, 
                status: 'completed', 
                progress: 100,
                aiClassification: data.aiClassification,
                extractedData: data.extractedData
              }
              : f
          ))
          onUploadComplete?.(data)
          return
        } else if (data.processingStatus === 'failed') {
          setUploadFiles(prev => prev.map(f => 
            f.id === fileId 
              ? { ...f, status: 'failed', error: 'AI processing failed' }
              : f
          ))
          return
        }

        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000) // Poll every second
        } else {
          // Timeout - mark as completed but note processing may be incomplete
          setUploadFiles(prev => prev.map(f => 
            f.id === fileId 
              ? { ...f, status: 'completed', progress: 100, error: 'Processing timeout' }
              : f
          ))
        }
      } catch (error) {
        console.error('Polling error:', error)
        setTimeout(poll, 2000) // Retry after 2 seconds
      }
    }

    poll()
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-6 w-6 text-blue-500" />
    }
    return <FileText className="h-6 w-6 text-red-500" />
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      default:
        return <FileText className="h-5 w-5 text-gray-400" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="w-full">
      {/* Upload Dropzone */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${isDragActive || dropzoneActive 
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
              {isDragActive ? 'Drop documents here' : 'Upload Compliance Documents'}
            </p>
            <p className="text-sm text-gray-600">
              {assetName && `for ${assetName} • `}
              Drag & drop or click to browse
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Supports: {acceptedFileTypes.join(', ')} • Max {formatFileSize(maxFileSize)} per file
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3 mt-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              disabled={isUploading}
            >
              <Paperclip className="h-4 w-4" />
              Browse Files
            </button>
            
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
              disabled={isUploading}
              onClick={(e) => {
                e.stopPropagation()
                // TODO: Implement camera capture for mobile
                toast.info('Camera capture coming soon!')
              }}
            >
              <Camera className="h-4 w-4" />
              Take Photo
            </button>
          </div>
        </div>
      </div>

      {/* File Queue */}
      {uploadFiles.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Upload Queue ({uploadFiles.length} file{uploadFiles.length !== 1 ? 's' : ''})
            </h3>
            
            <button
              onClick={uploadAllFiles}
              disabled={isUploading || uploadFiles.every(f => f.status === 'completed')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload All
                </>
              )}
            </button>
          </div>

          <div className="space-y-3">
            {uploadFiles.map((uploadFile) => (
              <div
                key={uploadFile.id}
                className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm"
              >
                {/* File Icon */}
                <div className="flex-shrink-0">
                  {getFileIcon(uploadFile.file)}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {uploadFile.file.name}
                    </p>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(uploadFile.status)}
                      {uploadFile.status !== 'pending' && (
                        <span className="text-xs text-gray-500 capitalize">
                          {uploadFile.status}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mb-2">
                    {formatFileSize(uploadFile.file.size)} • {uploadFile.file.type || 'Unknown type'}
                  </p>

                  {/* Progress Bar */}
                  {(uploadFile.status === 'uploading' || uploadFile.status === 'processing') && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadFile.progress}%` }}
                      />
                    </div>
                  )}

                  {/* AI Classification Results */}
                  {uploadFile.aiClassification && (
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                        🤖 {uploadFile.aiClassification.documentType}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {uploadFile.aiClassification.category}
                      </span>
                      <span className="text-xs text-gray-500">
                        {Math.round(uploadFile.aiClassification.confidence)}% confidence
                      </span>
                    </div>
                  )}

                  {/* Error Message */}
                  {uploadFile.error && (
                    <p className="text-xs text-red-600 mt-1">
                      ⚠️ {uploadFile.error}
                    </p>
                  )}
                </div>

                {/* Remove Button */}
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
        </div>
      )}
    </div>
  )
}

export default ComplianceDocumentUpload