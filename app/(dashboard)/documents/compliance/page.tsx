'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Shield,
  ArrowLeft,
  FileText,
  Search,
  Filter,
  Building2,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  Upload
} from 'lucide-react'
import { useSupabase } from '@/components/SupabaseProvider'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import { toast } from 'sonner'
import ComplianceDocumentUploadModal from '@/components/compliance/ComplianceDocumentUploadModal'

interface ComplianceDocument {
  id: string
  title: string
  type: string
  building_name: string
  building_id: string
  uploaded_at: string
  status: string
  expiry_date?: string
  ocr_status: string
}

export default function ComplianceDocumentsPage() {
  const { supabase } = useSupabase()
  const [documents, setDocuments] = useState<ComplianceDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)

  useEffect(() => {
    fetchComplianceDocuments()
  }, [])

  const fetchComplianceDocuments = async () => {
    try {
      setLoading(true)

      // Fetch compliance-related documents
      const { data, error } = await supabase
        .from('building_documents')
        .select(`
          id,
          file_name,
          type,
          created_at,
          building:buildings(name)
        `)
        .ilike('type', '%compliance%')
        .or('type.ilike.%eicr%,type.ilike.%fire%,type.ilike.%insurance%,type.ilike.%certificate%')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching compliance documents:', error)
        // Set empty array on error to prevent crashes
        setDocuments([])
      } else {
        const formattedDocuments = (data || []).map(doc => ({
          id: doc.id,
          title: doc.file_name || 'Untitled Document',
          type: doc.type || 'Unknown',
          building_name: doc.building?.name || 'Unknown Building',
          building_id: doc.building?.id || '',
          uploaded_at: doc.created_at,
          status: 'active',
          ocr_status: 'pending' // Default since ocr_status column doesn't exist
        }))
        setDocuments(formattedDocuments)
      }
    } catch (error) {
      console.error('Exception fetching compliance documents:', error)
      setDocuments([])
      toast.error('Failed to load compliance documents')
    } finally {
      setLoading(false)
    }
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.building_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.type.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = filterType === 'all' ||
                         doc.type.toLowerCase().includes(filterType.toLowerCase())

    return matchesSearch && matchesFilter
  })

  const documentTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'eicr', label: 'EICR' },
    { value: 'fire', label: 'Fire Risk Assessment' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'certificate', label: 'Certificates' }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="bg-gray-200 h-64 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 h-24 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] py-16 mx-6 rounded-3xl">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center mb-6">
            <Link
              href="/documents"
              className="flex items-center text-white/80 hover:text-white transition-colors mr-4"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Document Library
            </Link>
          </div>
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-white/20 backdrop-blur-sm">
                <Shield className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Compliance Documents
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              EICRs, Fire Risk Assessments, Insurance documents, and compliance certificates
            </p>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search compliance documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              {documentTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <BlocIQBadge variant="secondary">
            {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
          </BlocIQBadge>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Upload
          </button>
        </div>
      </div>

      {/* Documents List */}
      <div className="space-y-4">
        {filteredDocuments.length === 0 ? (
          <BlocIQCard>
            <BlocIQCardContent className="p-12 text-center">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No compliance documents found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || filterType !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Upload compliance documents to get started'
                }
              </p>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Documents
              </button>
            </BlocIQCardContent>
          </BlocIQCard>
        ) : (
          filteredDocuments.map((document) => (
            <BlocIQCard key={document.id} className="hover:shadow-lg transition-shadow">
              <BlocIQCardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">{document.title}</h3>
                      <BlocIQBadge variant="outline" className="text-xs">
                        {document.type}
                      </BlocIQBadge>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-500 mb-3">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        <span>{document.building_name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Uploaded {new Date(document.uploaded_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {document.ocr_status === 'completed' && (
                        <BlocIQBadge variant="default" className="text-xs bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          AI Ready
                        </BlocIQBadge>
                      )}
                      {document.ocr_status === 'processing' && (
                        <BlocIQBadge variant="secondary" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Processing
                        </BlocIQBadge>
                      )}
                      {document.ocr_status === 'pending' && (
                        <BlocIQBadge variant="outline" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Pending OCR
                        </BlocIQBadge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Link
                      href={`/buildings/${document.building_id}/documents`}
                      className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      View in Building
                    </Link>
                  </div>
                </div>
              </BlocIQCardContent>
            </BlocIQCard>
          ))
        )}
      </div>

      {/* Upload Modal */}
      <ComplianceDocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={(documents) => {
          setIsUploadModalOpen(false)
          // Refresh the documents list
          fetchComplianceDocuments()
          toast.success(`Successfully uploaded ${documents.length} document(s)`)
        }}
      />
    </div>
  )
}