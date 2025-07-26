'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { FileText, MessageSquare, Upload, Download, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import ProjectDocumentsUploader from './ProjectDocumentsUploader'
import ProjectObservations from './ProjectObservations'

interface ProjectDocument {
  id: number
  project_id: number
  file_url: string
  filename: string
  doc_type: string
  uploaded_by: string
  uploaded_at: string
}

interface DocumentsAndObservationsTabProps {
  projectId: number
}

export default function DocumentsAndObservationsTab({ 
  projectId 
}: DocumentsAndObservationsTabProps) {
  const [documents, setDocuments] = useState<ProjectDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch existing documents
  useEffect(() => {
    fetchDocuments()
  }, [projectId])

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false })

      if (error) {
        console.error('Supabase error fetching documents:', error)
        // Don't throw error, just set empty array
        setDocuments([])
        return
      }
      setDocuments(data || [])
    } catch (error) {
      console.error('Error fetching documents:', error)
      // Don't show toast for table not existing yet
      setDocuments([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDocumentUploaded = (document: ProjectDocument) => {
    setDocuments(prev => [document, ...prev])
  }

  const handleDocumentDeleted = (documentId: number) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId))
  }

  const DOCUMENT_TYPES = [
    { value: 'notice', label: 'Notice', color: 'bg-blue-100 text-blue-800' },
    { value: 'estimate', label: 'Estimate', color: 'bg-green-100 text-green-800' },
    { value: 'quote', label: 'Quote', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'scope', label: 'Scope', color: 'bg-purple-100 text-purple-800' },
    { value: 'minutes', label: 'Minutes', color: 'bg-gray-100 text-gray-800' },
    { value: 'approval', label: 'Approval', color: 'bg-teal-100 text-teal-800' },
    { value: 'other', label: 'Other', color: 'bg-orange-100 text-orange-800' }
  ]

  const getDocumentTypeLabel = (docType: string) => {
    return DOCUMENT_TYPES.find(t => t.value === docType)?.label || docType
  }

  return (
    <div className="space-y-8">
      {/* Project Documents Section */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-600" />
            Project Documents
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Upload and manage project-related documents
          </p>
        </div>
        <div className="p-6">
          <ProjectDocumentsUploader 
            projectId={projectId}
            onDocumentUploaded={handleDocumentUploaded}
          />
        </div>
      </div>

      {/* Consultation Observations Section */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Consultation Observations
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Log observations and comments from different stakeholders
          </p>
        </div>
        <div className="p-6">
          <ProjectObservations projectId={projectId} />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Documents</p>
              <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
            </div>
            <div className="h-12 w-12 bg-teal-100 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-teal-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Document Types</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(documents.map(doc => doc.doc_type)).size}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 