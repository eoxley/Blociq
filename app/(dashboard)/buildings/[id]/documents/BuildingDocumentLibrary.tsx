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
    <div className="space-y-8">
      {/* Modern Header with Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-3xl p-8 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold drop-shadow-lg">Document Library</h1>
              <p className="text-xl text-white/90 mt-2">{building.name}</p>
              <p className="text-white/80 mt-1">Upload, organize, and manage your building documents</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 hover:bg-white/30 transition-all duration-200"
              >
                {viewMode === 'grid' ? <List className="h-5 w-5" /> : <Grid className="h-5 w-5" />}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-3 px-6 py-3 bg-white text-[#4f46e5] rounded-xl font-semibold hover:bg-white/90 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Plus className="h-5 w-5" />
                Upload Document
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Search and Filter */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-[#4f46e5] transition-all duration-200 bg-gray-50 focus:bg-white"
            />
          </div>
          <div className="flex items-center gap-3">
            <Filter className="h-5 w-5 text-gray-500" />
            <select
              value={selectedFolder || ''}
              onChange={(e) => setSelectedFolder(e.target.value || null)}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] bg-gray-50 focus:bg-white transition-all duration-200"
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
      </div>

      {/* Modern Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 ${
          isDragOver
            ? 'border-[#4f46e5] bg-gradient-to-br from-[#4f46e5]/5 to-[#a855f7]/5'
            : 'border-gray-200 hover:border-[#4f46e5]/50 hover:bg-gray-50'
        }`}
      >
        <div className="w-20 h-20 bg-gradient-to-br from-[#4f46e5] to-[#a855f7] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Upload className="h-10 w-10 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">
          Drag and drop files here
        </h3>
        <p className="text-gray-600 mb-6 text-lg">
          Supports PDF, DOC, DOCX, TXT, and image files
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-8 py-3 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white rounded-xl font-semibold hover:brightness-110 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          Choose Files
        </button>
      </div>

      {/* Modern Folders Grid */}
      {!selectedFolder && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {FOLDERS.map(folder => {
            const count = documents.filter(doc => doc.category === folder.category).length
            return (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(folder.category)}
                className="group p-6 bg-white rounded-2xl border border-gray-200 hover:border-[#4f46e5]/30 hover:shadow-xl transition-all duration-200 text-left transform hover:-translate-y-1"
              >
                <div className={`${folder.color} mb-4 p-3 bg-gray-50 rounded-xl group-hover:bg-gradient-to-br group-hover:from-[#4f46e5]/10 group-hover:to-[#a855f7]/10 transition-all duration-200`}>
                  {folder.icon}
                </div>
                <h3 className="font-bold text-gray-900 group-hover:text-[#4f46e5] transition-colors text-lg mb-2">
                  {folder.name}
                </h3>
                <p className="text-sm text-gray-500 font-medium">{count} document{count !== 1 ? 's' : ''}</p>
              </button>
            )
          })}
        </div>
      )}

      {/* Modern Documents List */}
      {selectedFolder && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-[#4f46e5] to-[#a855f7] rounded-xl">
                  {FOLDERS.find(f => f.category === selectedFolder)?.icon}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {FOLDERS.find(f => f.category === selectedFolder)?.name} Documents
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} found
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFolder(null)}
                className="p-3 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
          
          {filteredDocuments.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <FileText className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No documents found</h3>
              <p className="text-gray-600">Upload some documents to get started with this category</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredDocuments.map(doc => (
                <div key={doc.id} className="p-6 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#4f46e5]/10 to-[#a855f7]/10 rounded-xl flex items-center justify-center">
                        <FileText className="h-6 w-6 text-[#4f46e5]" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-[#4f46e5] transition-colors">
                          {doc.name}
                        </h3>
                        <div className="flex items-center gap-6 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                            {doc.type}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                            {formatFileSize(doc.file_size)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(doc.uploaded_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {doc.uploaded_by}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusIcon(doc.ocr_status)}
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors group/btn">
                        <Eye className="h-5 w-5 text-gray-400 group-hover/btn:text-[#4f46e5]" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors group/btn">
                        <Download className="h-5 w-5 text-gray-400 group-hover/btn:text-[#4f46e5]" />
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
