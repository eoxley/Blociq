'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Upload,
  FileText,
  Download,
  Eye,
  Search,
  Filter,
  Folder,
  FolderOpen,
  File,
  Calendar,
  User,
  Tag,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Plus
} from 'lucide-react'
import { useSupabase } from '@/components/SupabaseProvider'
import { toast } from 'sonner'

interface Document {
  id: string
  filename: string
  file_url: string
  file_size: number
  mime_type: string
  category: string
  document_type: string
  upload_date: string
  ocr_status: 'pending' | 'processing' | 'completed' | 'failed'
  metadata: any
  uploaded_by: string
  building_id: string
}

interface DocumentLibraryClientProps {
  buildingId: string
  buildingName: string
  documents: Document[]
}

const DOCUMENT_CATEGORIES = {
  compliance: {
    name: 'Compliance',
    icon: '🛡️',
    color: 'from-green-500 to-emerald-600'
  },
  leases: {
    name: 'Leases',
    icon: '📋',
    color: 'from-blue-500 to-indigo-600',
    isSpecialized: true,
    specializedText: 'Lease Lab - Advanced Analysis'
  },
  insurance: {
    name: 'Insurance',
    icon: '🔒',
    color: 'from-purple-500 to-violet-600'
  },
  major_works: {
    name: 'Major Works',
    icon: '🔧',
    color: 'from-orange-500 to-red-600'
  },
  minutes: {
    name: 'Minutes',
    icon: '📝',
    color: 'from-teal-500 to-cyan-600'
  },
  other: {
    name: 'Other',
    icon: '📄',
    color: 'from-gray-500 to-slate-600'
  }
}

export default function DocumentLibraryClient({
  buildingId,
  buildingName,
  documents: initialDocuments
}: DocumentLibraryClientProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { supabase } = useSupabase()

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesCategory = !selectedCategory || doc.category === selectedCategory
    const matchesSearch = !searchTerm ||
      doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.document_type.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Group documents by category
  const documentsByCategory = Object.keys(DOCUMENT_CATEGORIES).reduce((acc, categoryKey) => {
    acc[categoryKey] = filteredDocuments.filter(doc => doc.category === categoryKey)
    return acc
  }, {} as Record<string, Document[]>)

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
    if (files.length > 0) {
      handleFileUpload(Array.from(files))
    }
  }, [buildingId])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(Array.from(files))
    }
  }

  const handleFileUpload = async (files: File[]) => {
    if (!supabase || !buildingId) return

    setUploading(true)
    const uploadPromises = files.map(async (file) => {
      try {
        // Upload file to Supabase Storage
        const fileExt = file.name.split('.').pop()
        const fileName = `${buildingId}/${Date.now()}-${file.name}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('building-documents')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('building-documents')
          .getPublicUrl(fileName)

        // Determine category based on file name (simple heuristic)
        let category = 'other'
        const lowerName = file.name.toLowerCase()
        if (lowerName.includes('eicr') || lowerName.includes('fire') || lowerName.includes('gas')) {
          category = 'compliance'
        } else if (lowerName.includes('lease')) {
          category = 'leases'
          // For lease documents, trigger specialized Lease Lab processing
          setTimeout(() => {
            fetch('/api/lease-lab/process', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                documentId: documentData.id,
                buildingId,
                performLeaseAnalysis: true
              })
            }).catch(console.error)
          }, 1000)
        } else if (lowerName.includes('insurance')) {
          category = 'insurance'
        } else if (lowerName.includes('major') || lowerName.includes('works')) {
          category = 'major_works'
        } else if (lowerName.includes('minutes') || lowerName.includes('meeting')) {
          category = 'minutes'
        }

        // Insert document record
        const { data: documentData, error: dbError } = await supabase
          .from('building_documents')
          .insert({
            building_id: buildingId,
            filename: file.name,
            file_url: publicUrl,
            file_size: file.size,
            mime_type: file.type,
            category,
            document_type: fileExt?.toUpperCase() || 'UNKNOWN',
            ocr_status: 'pending',
            metadata: {}
          })
          .select()
          .single()

        if (dbError) throw dbError

        // Add to local state
        setDocuments(prev => [documentData, ...prev])

        // Start OCR processing (fire and forget)
        fetch('/api/documents/process-ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: documentData.id })
        }).catch(console.error)

        toast.success(`${file.name} uploaded successfully`)
        return documentData

      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error)
        toast.error(`Failed to upload ${file.name}`)
        return null
      }
    })

    await Promise.all(uploadPromises)
    setUploading(false)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getOCRStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Library</h1>
          <p className="text-gray-600 mt-1">{buildingName}</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-gradient-to-r from-teal-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Upload Documents
        </button>
      </div>

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
        }`}
      >
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Drop files here to upload
        </h3>
        <p className="text-gray-600 mb-4">
          Or click the upload button above to select files
        </p>
        <p className="text-sm text-gray-500">
          Supports PDF, DOCX, TXT, and image files up to 10MB each
        </p>
        {uploading && (
          <div className="mt-4 flex items-center justify-center gap-2 text-blue-600">
            <Clock className="w-4 h-4 animate-spin" />
            <span>Uploading files...</span>
          </div>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === null
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {Object.entries(DOCUMENT_CATEGORIES).map(([key, category]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === key
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.icon} {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Document Folders */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(DOCUMENT_CATEGORIES).map(([key, category]) => {
          const categoryDocs = documentsByCategory[key] || []
          const hasDocuments = categoryDocs.length > 0

          return (
            <div
              key={key}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Folder Header */}
              <div className={`bg-gradient-to-r ${category.color} p-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{category.icon}</span>
                    <div>
                      <h3 className="font-semibold text-white">{category.name}</h3>
                      {category.isSpecialized ? (
                        <p className="text-white/90 text-sm font-medium">{category.specializedText}</p>
                      ) : null}
                      <p className="text-white/80 text-sm">{categoryDocs.length} documents</p>
                    </div>
                  </div>
                  {hasDocuments ? (
                    <FolderOpen className="w-6 h-6 text-white/80" />
                  ) : (
                    <Folder className="w-6 h-6 text-white/80" />
                  )}
                </div>
              </div>

              {/* Documents List */}
              <div className="p-4">
                {categoryDocs.length > 0 ? (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {categoryDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {doc.filename}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">
                                {formatFileSize(doc.file_size)}
                              </span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500">
                                {new Date(doc.upload_date).toLocaleDateString()}
                              </span>
                              {getOCRStatusIcon(doc.ocr_status)}
                              {doc.category === 'leases' && (
                                <span className="text-xs text-blue-600 font-medium">Lease Lab</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedDocument(doc)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <a
                            href={doc.file_url}
                            download={doc.filename}
                            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm">No documents in this category</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Upload documents to get started
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.gif,.bmp,.tiff,.webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Document Preview Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full m-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedDocument.filename}
              </h3>
              <button
                onClick={() => setSelectedDocument(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-medium text-gray-700">File Size:</label>
                  <p className="text-gray-600">{formatFileSize(selectedDocument.file_size)}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Type:</label>
                  <p className="text-gray-600">{selectedDocument.document_type}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Category:</label>
                  <p className="text-gray-600">{DOCUMENT_CATEGORIES[selectedDocument.category as keyof typeof DOCUMENT_CATEGORIES]?.name}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">Upload Date:</label>
                  <p className="text-gray-600">{new Date(selectedDocument.upload_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">OCR Status:</label>
                  <div className="flex items-center gap-2">
                    {getOCRStatusIcon(selectedDocument.ocr_status)}
                    <span className="text-gray-600 capitalize">{selectedDocument.ocr_status}</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <a
                  href={selectedDocument.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Document
                </a>
                <a
                  href={selectedDocument.file_url}
                  download={selectedDocument.filename}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}