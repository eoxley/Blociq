'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
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
  AlertTriangle,
  Shield,
  Plus,
  Grid,
  List,
  Filter,
  X,
  Flame,
  Zap,
  Droplets,
  HardHat,
  Building2,
  FileContract,
  Home,
  Folders,
  Star,
  Sparkles
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

// Function to get folder configuration for a category
const getFolderConfig = (category: string): Folder => {
  const configs: Record<string, Omit<Folder, 'id' | 'category' | 'document_count'>> = {
    'General Documents': {
      name: 'General Documents',
      icon: <Folders className="h-6 w-6" />,
      color: 'text-[#4f46e5]'
    },
    'Compliance - Fire Safety': {
      name: 'Fire Safety Compliance',
      icon: <Flame className="h-6 w-6" />,
      color: 'text-red-500'
    },
    'Compliance - Electrical': {
      name: 'Electrical Safety',
      icon: <Zap className="h-6 w-6" />,
      color: 'text-yellow-500'
    },
    'Compliance - Gas Safety': {
      name: 'Gas Safety',
      icon: <Flame className="h-6 w-6" />,
      color: 'text-blue-500'
    },
    'Compliance - Legionella': {
      name: 'Legionella Control',
      icon: <Droplets className="h-6 w-6" />,
      color: 'text-cyan-500'
    },
    'Compliance - Asbestos': {
      name: 'Asbestos Management',
      icon: <HardHat className="h-6 w-6" />,
      color: 'text-orange-500'
    },
    'Compliance - Lift Safety': {
      name: 'Lift Safety',
      icon: <Building2 className="h-6 w-6" />,
      color: 'text-purple-500'
    },
    'Compliance - Insurance': {
      name: 'Insurance Documents',
      icon: <Shield className="h-6 w-6" />,
      color: 'text-green-500'
    },
    'Compliance - Other': {
      name: 'Other Compliance',
      icon: <CheckCircle className="h-6 w-6" />,
      color: 'text-gray-500'
    },
    'Leases - Building Wide': {
      name: 'Building Wide Leases',
      icon: <FileContract className="h-6 w-6" />,
      color: 'text-[#a855f7]'
    },
    'Leases - Unit Specific': {
      name: 'Unit Specific Leases',
      icon: <Home className="h-6 w-6" />,
      color: 'text-[#4f46e5]'
    },
  };

  const config = configs[category];
  if (config) {
    return {
      id: category.toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, ''),
      name: config.name,
      category,
      document_count: 0,
      icon: config.icon,
      color: config.color
    };
  }

  // Default folder config for unknown categories
  return {
    id: category.toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, ''),
    name: category,
    category,
    document_count: 0,
    icon: <Folder className="h-5 w-5" />,
    color: 'text-gray-500'
  };
}

export default function BuildingDocumentLibrary({ building }: { building: Building }) {
  const { supabase } = useSupabase()
  const [documents, setDocuments] = useState<Document[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadCategory, setUploadCategory] = useState('General Documents')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchDocuments()
  }, [building.id, supabase])

  useEffect(() => {
    filterDocuments()
  }, [documents, searchTerm, selectedFolder])

  const fetchDocuments = useCallback(async () => {
    try {
      console.log(`📂 Fetching all documents for building: ${building.id} (${building.name})`)

      const allDocuments: Document[] = []

      // 1. Fetch building documents (general uploads)
      try {
        console.log('📄 Querying building_documents table...')
        const { data: buildingDocs, error: buildingError } = await supabase
          .from('building_documents')
          .select('*')
          .eq('building_id', building.id)
          .order('uploaded_at', { ascending: false })

        console.log('📄 Building documents query result:', {
          count: buildingDocs?.length || 0,
          error: buildingError?.message,
          firstDoc: buildingDocs?.[0]
        })

        if (!buildingError && buildingDocs) {
          const formattedBuildingDocs = buildingDocs.map((doc: any) => ({
            id: doc.id,
            name: doc.original_filename || doc.name || 'Unnamed Document',
            type: doc.file_type || 'application/pdf',
            category: doc.category || 'General Documents',
            file_path: doc.file_path,
            file_size: doc.file_size || 0,
            uploaded_at: doc.uploaded_at,
            uploaded_by: doc.uploaded_by_user_id || 'Unknown',
            ocr_status: doc.ocr_status || 'pending',
            ocr_text: doc.ocr_text,
            metadata: { source: 'building_documents', ...doc.metadata }
          }))
          allDocuments.push(...formattedBuildingDocs)
          console.log(`📄 Found ${formattedBuildingDocs.length} building documents`)
        }
      } catch (error) {
        console.warn('Building documents table not accessible:', error)
      }

      // Note: Compliance documents are now included in the general building_documents query above

      // 3. Fetch lease documents (from document_jobs and leases tables)
      try {
        console.log('📄 Querying lease documents...')
        // Get lease analysis jobs for this building
        const { data: leaseJobs, error: leaseJobsError } = await supabase
          .from('document_jobs')
          .select('*')
          .eq('status', 'completed')
          .order('created_at', { ascending: false })

        console.log('📄 Document jobs query result:', {
          count: leaseJobs?.length || 0,
          error: leaseJobsError?.message,
          firstJob: leaseJobs?.[0]
        })

        if (!leaseJobsError && leaseJobs) {
          // Filter jobs that have been linked to this building
          console.log('📄 Querying leases table for building...')
          const { data: linkedLeases, error: leasesError } = await supabase
            .from('leases')
            .select('document_job_id, leaseholder_name, start_date, end_date, scope')
            .eq('building_id', building.id)

          console.log('📄 Leases query result:', {
            count: linkedLeases?.length || 0,
            error: leasesError?.message,
            firstLease: linkedLeases?.[0]
          })

          if (!leasesError && linkedLeases) {
            const linkedJobIds = linkedLeases.map(lease => lease.document_job_id).filter(Boolean)

            const buildingLeaseJobs = leaseJobs.filter(job => linkedJobIds.includes(job.id))

            const formattedLeaseJobs = buildingLeaseJobs.map((job: any) => {
              const lease = linkedLeases.find(l => l.document_job_id === job.id)
              return {
                id: job.id,
                name: job.filename || 'Lease Document',
                type: 'application/pdf',
                category: `Leases - ${lease?.scope === 'building' ? 'Building Wide' : 'Unit Specific'}`,
                file_path: job.file_path || '',
                file_size: job.file_size || 0,
                uploaded_at: job.created_at,
                uploaded_by: job.user_id || 'Unknown',
                ocr_status: job.status === 'completed' ? 'completed' : 'pending',
                metadata: {
                  source: 'lease_documents',
                  leaseholder: lease?.leaseholder_name,
                  lease_period: lease?.start_date && lease?.end_date
                    ? `${lease.start_date} to ${lease.end_date}`
                    : null,
                  scope: lease?.scope
                }
              }
            })
            allDocuments.push(...formattedLeaseJobs)
            console.log(`📋 Found ${formattedLeaseJobs.length} lease documents`)
          }
        }
      } catch (error) {
        console.warn('Lease documents not accessible:', error)
      }

      // 4. Sort all documents by upload date (newest first)
      allDocuments.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())

      console.log(`📊 Total documents found: ${allDocuments.length}`)

      // 5. Generate dynamic folders based on found categories
      const categories = [...new Set(allDocuments.map(doc => doc.category))]
      const generatedFolders = categories.map(category => {
        const folderConfig = getFolderConfig(category)
        const documentCount = allDocuments.filter(doc => doc.category === category).length
        return {
          ...folderConfig,
          document_count: documentCount
        }
      }).sort((a, b) => b.document_count - a.document_count) // Sort by document count, highest first

      console.log('📋 Document categories:', categories)
      console.log('📁 Generated folders:', generatedFolders.map(f => `${f.name} (${f.document_count})`))

      setDocuments(allDocuments)
      setFolders(generatedFolders)
    } catch (error) {
      console.error('Unexpected error fetching documents:', error)
      setDocuments([])
      toast.error('Failed to load documents')
    }
  }, [building.id, supabase])

  const filterDocuments = useCallback(() => {
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
  }, [documents, selectedFolder, searchTerm])

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
      await fetchDocuments()
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
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] py-16 mx-6 rounded-3xl shadow-2xl">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Folders className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white">
                Document Library
              </h1>
            </div>
            <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed mb-6">
              {building.name} - Upload, organize, and manage your building documents
            </p>
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full text-white/90">
              <Star className="h-5 w-5" />
              <span className="font-medium">Powered by BlocIQ</span>
            </div>
          </div>
        </div>

        {/* Enhanced Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/4 w-20 h-20 bg-white/5 rounded-full blur-2xl"></div>
        </div>
      </section>

      {/* Action Bar */}
      <div className="flex items-center justify-end gap-4 px-6">
        <button
          onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200"
        >
          {viewMode === 'grid' ? <List className="h-5 w-5 text-gray-600" /> : <Grid className="h-5 w-5 text-gray-600" />}
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white rounded-xl font-semibold hover:brightness-110 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <Plus className="h-5 w-5" />
          Upload Document
        </button>
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
              {folders.map(folder => (
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
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#4f46e5] to-[#a855f7] rounded-lg flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Document Categories</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(folder.category)}
                className="group relative p-6 bg-white rounded-2xl border border-gray-200 hover:border-[#4f46e5]/30 hover:shadow-xl transition-all duration-300 text-left transform hover:-translate-y-1 overflow-hidden"
              >
                {/* Background gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#4f46e5]/5 to-[#a855f7]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                <div className="relative">
                  <div className={`${folder.color} mb-4 p-4 bg-gray-50 rounded-xl group-hover:bg-white group-hover:shadow-lg transition-all duration-300 w-fit`}>
                    {folder.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 group-hover:text-[#4f46e5] transition-colors text-lg mb-2 leading-tight">
                    {folder.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 font-medium">
                      {folder.document_count} document{folder.document_count !== 1 ? 's' : ''}
                    </p>
                    {folder.document_count > 0 && (
                      <div className="w-6 h-6 bg-[#4f46e5] text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {folder.document_count}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modern Documents List */}
      {selectedFolder && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-[#4f46e5]/5 to-[#a855f7]/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-[#4f46e5] to-[#a855f7] rounded-xl shadow-lg">
                  <div className="text-white">
                    {folders.find(f => f.category === selectedFolder)?.icon}
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {folders.find(f => f.category === selectedFolder)?.name}
                  </h2>
                  <p className="text-gray-600 mt-1 text-lg">
                    {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} found
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFolder(null)}
                className="p-3 hover:bg-white/80 rounded-xl transition-all duration-200 hover:shadow-md"
                title="Back to categories"
              >
                <X className="h-6 w-6 text-gray-500" />
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
                <div key={doc.id} className="p-6 hover:bg-gradient-to-r hover:from-[#4f46e5]/5 hover:to-[#a855f7]/5 transition-all duration-200 group border-l-4 border-transparent hover:border-[#4f46e5]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-gradient-to-br from-[#4f46e5]/10 to-[#a855f7]/10 rounded-xl flex items-center justify-center group-hover:shadow-lg transition-all duration-200 group-hover:from-[#4f46e5]/20 group-hover:to-[#a855f7]/20">
                        <FileText className="h-7 w-7 text-[#4f46e5] group-hover:text-[#4f46e5] transition-colors" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-[#4f46e5] transition-colors">
                          {doc.name}
                        </h3>
                        <div className="flex items-center gap-6 text-sm text-gray-500">
                          <span className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
                            <FileText className="h-3 w-3" />
                            {doc.type.split('/')[1]?.toUpperCase() || 'FILE'}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-[#4f46e5] rounded-full"></span>
                            {formatFileSize(doc.file_size)}
                          </span>
                          <span className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-[#4f46e5]" />
                            {formatDate(doc.uploaded_at)}
                          </span>
                          <span className="flex items-center gap-2">
                            <User className="h-4 w-4 text-[#a855f7]" />
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
                  {folders.map(folder => (
                    <option key={folder.id} value={folder.category}>
                      {folder.name}
                    </option>
                  ))}
                  <option value="General Documents">General Documents</option>
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
