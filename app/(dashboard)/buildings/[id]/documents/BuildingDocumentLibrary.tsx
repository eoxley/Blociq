'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Upload,
  Search,
  Folder,
  FileText,
  Download,
  Eye,
  Calendar,
  User,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Grid,
  List,
  Filter,
  X
} from 'lucide-react'
import { useSupabase } from '@/components/SupabaseProvider'
import { toast } from 'sonner'
import Link from 'next/link'

interface Building {
  id: string
  name: string
  address?: string
}

interface Document {
  id: string
  name: string
  type: string
  category: string
  file_path: string
  file_size: number
  uploaded_at: string
  uploaded_by: string
  ocr_status: 'pending' | 'processing' | 'completed' | 'failed'
  ocr_text?: string
  metadata?: any
}

interface Folder {
  id: string
  name: string
  category: string
  document_count: number
  icon: React.ReactNode
  color: string
}

const FOLDERS: Folder[] = [
  { id: 'compliance', name: 'Compliance', category: 'compliance', document_count: 0, icon: <CheckCircle className="h-5 w-5" />, color: 'text-green-600' },
  { id: 'leases', name: 'Leases', category: 'leases', document_count: 0, icon: <FileText className="h-5 w-5" />, color: 'text-blue-600' },
  { id: 'insurance', name: 'Insurance', category: 'insurance', document_count: 0, icon: <Folder className="h-5 w-5" />, color: 'text-purple-600' },
  { id: 'major-works', name: 'Major Works', category: 'major_works', document_count: 0, icon: <Folder className="h-5 w-5" />, color: 'text-orange-600' },
  { id: 'minutes', name: 'Minutes', category: 'minutes', document_count: 0, icon: <FileText className="h-5 w-5" />, color: 'text-gray-600' },
  { id: 'other', name: 'Other', category: 'other', document_count: 0, icon: <Folder className="h-5 w-5" />, color: 'text-gray-500' },
]

export default function BuildingDocumentLibrary({ building }: { building: Building }) {
  const { supabase } = useSupabase()
  const [documents, setDocuments] = useState<Document[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadCategory, setUploadCategory] = useState('other')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchDocuments()
  }, [building.id])

  useEffect(() => {
    filterDocuments()
  }, [documents, selectedFolder, searchTerm])

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('building_documents')
        .select('*')
        .eq('building_id', building.id)
        .order('uploaded_at', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error('Error fetching documents:', error)
      toast.error('Failed to load documents')
    }
  }

  const filterDocuments = () => {
    let filtered = documents

    if (selectedFolder) {
      filtered = filtered.filter(doc => doc.category === selectedFolder)
    }

    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.type.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredDocuments(filtered)
  }

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setShowUploadModal(true)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const uploadDocument = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('building_id', building.id)
      formData.append('category', uploadCategory)

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('Upload failed')

      const result = await response.json()
      toast.success('Document uploaded successfully')
      
      setShowUploadModal(false)
      setSelectedFile(null)
      fetchDocuments()
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload document')
    } finally {
      setIsUploading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Document Library</h1>
          <p className="text-gray-600 mt-1">{building.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            {viewMode === 'grid' ? <List className="h-5 w-5" /> : <Grid className="h-5 w-5" />}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Upload Document
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={selectedFolder || ''}
            onChange={(e) => setSelectedFolder(e.target.value || null)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {FOLDERS.map(folder => (
              <option key={folder.id} value={folder.category}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">
          Drag and drop files here, or click to browse
        </p>
        <p className="text-gray-500">
          Supports PDF, DOC, DOCX, TXT, and image files
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Choose Files
        </button>
      </div>

      {/* Folders Grid */}
      {!selectedFolder && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {FOLDERS.map(folder => {
            const count = documents.filter(doc => doc.category === folder.category).length
            return (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(folder.category)}
                className="p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all text-left group"
              >
                <div className={`${folder.color} mb-2`}>
                  {folder.icon}
                </div>
                <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                  {folder.name}
                </h3>
                <p className="text-sm text-gray-500">{count} document{count !== 1 ? 's' : ''}</p>
              </button>
            )
          })}
        </div>
      )}

      {/* Documents List */}
      {selectedFolder && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {FOLDERS.find(f => f.category === selectedFolder)?.name} Documents
              </h2>
              <button
                onClick={() => setSelectedFolder(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {filteredDocuments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p>No documents found in this category</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredDocuments.map(doc => (
                <div key={doc.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <h3 className="font-medium text-gray-900">{doc.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{doc.type}</span>
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>{formatDate(doc.uploaded_at)}</span>
                          <span>by {doc.uploaded_by}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(doc.ocr_status)}
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <Eye className="h-4 w-4 text-gray-400" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded">
                        <Download className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Upload Document</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File: {selectedFile?.name}
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {FOLDERS.map(folder => (
                    <option key={folder.id} value={folder.category}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={uploadDocument}
                  disabled={isUploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
      />
    </div>
  )
}
