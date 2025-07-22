'use client'

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  X,
  Eye,
  Download,
  File,
  Image,
  FileCheck
} from 'lucide-react'
import { toast } from 'sonner'

interface DocumentUploadProps {
  buildingId: string
  onDocumentUploaded?: (document: any) => void
  className?: string
}

interface UploadedDocument {
  id: string
  fileName: string
  documentType: string
  summary: string
  extractionMethod: string
  extractionConfidence: number
  textLength: number
  fileUrl: string
  status: 'processing' | 'completed' | 'error'
  error?: string
}

export default function DocumentUpload({ 
  buildingId, 
  onDocumentUploaded, 
  className 
}: DocumentUploadProps) {
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [documentType, setDocumentType] = useState('')
  const [customDocumentType, setCustomDocumentType] = useState('')

  const documentTypes = [
    'EICR',
    'EPC',
    'Fire Safety Certificate',
    'Asbestos Survey',
    'Lease Agreement',
    'Insurance Certificate',
    'Compliance Certificate',
    'Building Regulations Certificate',
    'Planning Permission',
    'Other'
  ]

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!documentType) {
      toast.error('Please select a document type first')
      return
    }

    setIsUploading(true)

    for (const file of acceptedFiles) {
      const finalDocumentType = documentType === 'Other' ? customDocumentType : documentType
      
      if (documentType === 'Other' && !customDocumentType.trim()) {
        toast.error('Please specify a custom document type')
        continue
      }

      // Add document to processing queue
      const processingDoc: UploadedDocument = {
        id: Date.now().toString(),
        fileName: file.name,
        documentType: finalDocumentType,
        summary: '',
        extractionMethod: '',
        extractionConfidence: 0,
        textLength: 0,
        fileUrl: '',
        status: 'processing'
      }

      setUploadedDocuments(prev => [...prev, processingDoc])

      try {
        console.log('📤 Uploading document:', file.name)

        const formData = new FormData()
        formData.append('file', file)
        formData.append('buildingId', buildingId)
        formData.append('documentType', finalDocumentType)
        formData.append('fileName', file.name)

        const response = await fetch('/api/documents/process', {
          method: 'POST',
          body: formData
        })

        const result = await response.json()

        if (response.ok && result.success) {
          // Update document with success data
          setUploadedDocuments(prev => prev.map(doc => 
            doc.id === processingDoc.id 
              ? { ...doc, ...result.document, status: 'completed' as const }
              : doc
          ))

          toast.success(`✅ ${file.name} processed successfully`)
          
          // Call callback if provided
          if (onDocumentUploaded) {
            onDocumentUploaded(result.document)
          }

        } else {
          // Update document with error
          setUploadedDocuments(prev => prev.map(doc => 
            doc.id === processingDoc.id 
              ? { ...doc, status: 'error' as const, error: result.error }
              : doc
          ))

          toast.error(`❌ Failed to process ${file.name}: ${result.error}`)
        }

      } catch (error) {
        console.error('❌ Document upload error:', error)
        
        setUploadedDocuments(prev => prev.map(doc => 
          doc.id === processingDoc.id 
            ? { ...doc, status: 'error' as const, error: 'Network error' }
            : doc
        ))

        toast.error(`❌ Failed to upload ${file.name}`)
      }
    }

    setIsUploading(false)
  }, [buildingId, documentType, customDocumentType, onDocumentUploaded])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff']
    },
    maxSize: 10 * 1024 * 1024, // 10MB limit
    disabled: isUploading || !documentType
  })

  const removeDocument = (id: string) => {
    setUploadedDocuments(prev => prev.filter(doc => doc.id !== id))
  }

  const getFileIcon = (fileName: string) => {
    if (fileName.toLowerCase().endsWith('.pdf')) {
      return <FileText className="h-5 w-5" />
    }
    return <Image className="h-5 w-5" />
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <File className="h-4 w-4" />
    }
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Document Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="documentType">Document Type</Label>
            <div className="flex gap-2 flex-wrap">
              {documentTypes.map(type => (
                <Badge
                  key={type}
                  variant={documentType === type ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => setDocumentType(type)}
                >
                  {type}
                </Badge>
              ))}
            </div>
            {documentType === 'Other' && (
              <Input
                placeholder="Specify document type..."
                value={customDocumentType}
                onChange={(e) => setCustomDocumentType(e.target.value)}
                className="mt-2"
              />
            )}
          </div>

          {/* Upload Area */}
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
              ${isUploading || !documentType ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            {isDragActive ? (
              <p className="text-lg font-medium text-blue-600">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drag & drop files here, or click to select
                </p>
                <p className="text-sm text-gray-500">
                  Supports PDF and image files up to 10MB
                </p>
                {!documentType && (
                  <p className="text-sm text-red-500 mt-2">
                    Please select a document type first
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Uploaded Documents List */}
          {uploadedDocuments.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Uploaded Documents</h3>
              {uploadedDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    {getFileIcon(doc.fileName)}
                    <div>
                      <p className="font-medium text-sm">{doc.fileName}</p>
                      <p className="text-xs text-gray-500">{doc.documentType}</p>
                      {doc.status === 'completed' && (
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-gray-500">
                            {doc.extractionMethod} • {Math.round(doc.extractionConfidence * 100)}% confidence
                          </span>
                          <span className="text-xs text-gray-500">
                            {doc.textLength.toLocaleString()} characters
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusIcon(doc.status)}
                    {doc.status === 'completed' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(doc.fileUrl, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(doc.fileUrl, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocument(doc.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Processing Status */}
          {isUploading && (
            <div className="flex items-center gap-2 text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing documents...</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 