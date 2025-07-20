'use client'

import React, { useState } from 'react'
import { Upload, File, X, CheckCircle } from 'lucide-react'

interface DocumentUploadProps {
  projectId: string
  onUploadComplete?: () => void
}

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url?: string
  uploadedAt: Date
}

export default function DocumentUpload({ projectId, onUploadComplete }: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }

  const handleFiles = async (files: FileList) => {
    setIsUploading(true)
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        // Create a mock uploaded file (in real implementation, upload to Supabase storage)
        const uploadedFile: UploadedFile = {
          id: `file-${Date.now()}-${i}`,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date()
        }
        
        setUploadedFiles(prev => [...prev, uploadedFile])
        
        // Simulate upload delay
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      onUploadComplete?.()
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Project Documents</h3>
        <span className="text-sm text-gray-500">{uploadedFiles.length} files uploaded</span>
      </div>

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive 
            ? 'border-teal-500 bg-teal-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          disabled={isUploading}
        />
        
        <div className="space-y-2">
          <Upload className="mx-auto h-8 w-8 text-gray-400" />
          <div>
            <p className="text-sm text-gray-600">
              <span className="font-medium text-teal-600 hover:text-teal-500">
                Click to upload
              </span>{' '}
              or drag and drop
            </p>
            <p className="text-xs text-gray-500">
              PDF, DOC, XLS, JPG, PNG up to 10MB each
            </p>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></div>
          Uploading files...
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Uploaded Files</h4>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <File className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)} • {file.uploadedAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 