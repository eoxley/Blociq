'use client'

import React, { useState } from 'react'
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { toast } from 'sonner'

interface IndustryDocumentUploadProps {
  onUploadComplete?: () => void
}

const DOCUMENT_CATEGORIES = [
  'Fire & Life Safety',
  'Electrical & Mechanical',
  'Water Hygiene & Drainage',
  'Structural, Access & Systems',
  'Insurance & Risk',
  'Leasehold / Governance',
  'Building Safety Act (BSA / HRB)',
  'Property Management',
  'Market Knowledge',
  'Other'
]

const DOCUMENT_SOURCES = [
  'HSE',
  'BSI',
  'Building Regulations',
  'RICS',
  'TPI',
  'Government',
  'Industry Association',
  'Professional Body',
  'Other'
]

export default function IndustryDocumentUpload({ onUploadComplete }: IndustryDocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    source: '',
    version: '',
    tags: ''
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Only PDF files are supported')
        return
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error('File size must be less than 50MB')
        return
      }
      setSelectedFile(file)
      
      // Auto-fill title from filename
      if (!formData.title) {
        setFormData(prev => ({
          ...prev,
          title: file.name.replace('.pdf', '')
        }))
      }
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a PDF file')
      return
    }

    if (!formData.title || !formData.category || !formData.source || !formData.version) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', selectedFile)
      uploadFormData.append('title', formData.title)
      uploadFormData.append('category', formData.category)
      uploadFormData.append('source', formData.source)
      uploadFormData.append('version', formData.version)
      uploadFormData.append('tags', formData.tags)

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('/api/industry/documents/upload', {
        method: 'POST',
        body: uploadFormData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const result = await response.json()
      
      toast.success('Document uploaded successfully! Processing with AI...')
      
      // Reset form
      setFormData({
        title: '',
        category: '',
        source: '',
        version: '',
        tags: ''
      })
      setSelectedFile(null)
      
      // Trigger processing
      await processDocument(result.data.id)
      
      if (onUploadComplete) {
        onUploadComplete()
      }

    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const processDocument = async (documentId: string) => {
    try {
      const response = await fetch('/api/industry/documents/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ documentId })
      })

      if (!response.ok) {
        throw new Error('Processing failed')
      }

      toast.success('Document processed successfully!')
    } catch (error) {
      console.error('Processing error:', error)
      toast.error('Document uploaded but processing failed. Please try again later.')
    }
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Upload Industry Knowledge Document
        </h3>
        <p className="text-gray-600">
          Upload PDF guidance documents to expand your AI's industry knowledge base
        </p>
      </div>

      {/* File Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select PDF Document *
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            disabled={isUploading}
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            {selectedFile ? (
              <div className="flex items-center justify-center space-x-2 text-blue-600">
                <FileText className="h-8 w-8" />
                <span className="font-medium">{selectedFile.name}</span>
                <span className="text-sm text-gray-500">
                  ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <Upload className="h-12 w-12 text-gray-400" />
                <div>
                  <span className="font-medium text-blue-600 hover:text-blue-500">
                    Click to upload
                  </span>
                  <span className="text-gray-500"> or drag and drop</span>
                </div>
                <p className="text-sm text-gray-500">PDF files only, max 50MB</p>
              </div>
            )}
          </label>
        </div>
      </div>

      {/* Document Metadata Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Fire Safety Guidance 2024"
            disabled={isUploading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            value={formData.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isUploading}
          >
            <option value="">Select category</option>
            {DOCUMENT_CATEGORIES.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Source *
          </label>
          <select
            value={formData.source}
            onChange={(e) => handleInputChange('source', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isUploading}
          >
            <option value="">Select source</option>
            {DOCUMENT_SOURCES.map(source => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Version *
          </label>
          <input
            type="text"
            value={formData.version}
            onChange={(e) => handleInputChange('version', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., 2024, v2.1, Current"
            disabled={isUploading}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => handleInputChange('tags', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., fire safety, guidance, HSE, best practices"
            disabled={isUploading}
          />
        </div>
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Uploading...</span>
            <span className="text-sm text-gray-500">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Upload Button */}
      <div className="flex justify-end">
        <BlocIQButton
          onClick={handleUpload}
          disabled={isUploading || !selectedFile}
          className="min-w-[120px]"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </>
          )}
        </BlocIQButton>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start space-x-2">
          <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">What happens after upload?</p>
            <ul className="mt-1 space-y-1">
              <li>• PDF text is extracted automatically</li>
              <li>• AI processes content to identify industry standards and guidance</li>
              <li>• Knowledge is integrated into your AI assistant</li>
              <li>• Document becomes searchable across your industry knowledge base</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
