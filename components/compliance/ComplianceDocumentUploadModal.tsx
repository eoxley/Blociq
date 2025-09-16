'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Upload,
  X,
  FileText,
  Image,
  AlertCircle,
  CheckCircle,
  Loader2,
  Building2,
  Shield,
  Search
} from 'lucide-react'
import { toast } from 'sonner'
import { useSupabase } from '@/components/SupabaseProvider'

interface ComplianceDocumentUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadComplete?: (document: any) => void
  maxFiles?: number
  acceptedFileTypes?: string[]
  maxFileSize?: number
}

interface UploadFile {
  file: File
  id: string
  progress: number
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed'
  buildingId?: string
  buildingName?: string
  error?: string
}

interface Building {
  id: string
  name: string
  address?: string
}

const ComplianceDocumentUploadModal: React.FC<ComplianceDocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadComplete,
  maxFiles = 10,
  acceptedFileTypes = ['.pdf', '.jpg', '.jpeg', '.png'],
  maxFileSize = 10 * 1024 * 1024
}) => {
  const { supabase } = useSupabase()
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [isDragActive, setIsDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState<string>('')
  const [buildingSearch, setBuildingSearch] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchBuildings()
    }
  }, [isOpen])

  const fetchBuildings = async () => {
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name, address')
        .order('name')

      if (error) {
        console.error('Error fetching buildings:', error)
        toast.error('Failed to load buildings')
      } else {
        setBuildings(data || [])
      }
    } catch (error) {
      console.error('Exception fetching buildings:', error)
      toast.error('Failed to load buildings')
    }
  }

  const filteredBuildings = buildings.filter(building =>
    building.name.toLowerCase().includes(buildingSearch.toLowerCase()) ||
    building.address?.toLowerCase().includes(buildingSearch.toLowerCase())
  )

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
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

  const updateFileBuildingId = (fileId: string, buildingId: string, buildingName: string) => {
    setUploadFiles(prev => prev.map(f =>
      f.id === fileId
        ? { ...f, buildingId, buildingName }
        : f
    ))
  }

  const uploadAllFiles = async () => {
    if (uploadFiles.length === 0) return

    // Check that all files have buildings assigned
    const filesWithoutBuildings = uploadFiles.filter(f => !f.buildingId)
    if (filesWithoutBuildings.length > 0) {
      toast.error('Please assign buildings to all documents before uploading')
      return
    }

    setIsUploading(true)

    try {
      for (const uploadFile of uploadFiles) {
        if (uploadFile.status === 'completed') continue

        setUploadFiles(prev => prev.map(f =>
          f.id === uploadFile.id
            ? { ...f, status: 'uploading', progress: 0 }
            : f
        ))

        await uploadSingleFile(uploadFile)
      }

      toast.success(`Successfully uploaded ${uploadFiles.length} document(s)`)
      onUploadComplete?.(uploadFiles)

      // Reset form
      setUploadFiles([])
      setSelectedBuilding('')

    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload some documents')
    } finally {
      setIsUploading(false)
    }
  }

  const uploadSingleFile = async (uploadFile: UploadFile) => {
    try {
      const formData = new FormData()
      formData.append('file', uploadFile.file)
      formData.append('buildingId', uploadFile.buildingId!)
      formData.append('originalFilename', uploadFile.file.name)

      const xhr = new XMLHttpRequest()

      return new Promise<void>((resolve, reject) => {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100)
            setUploadFiles(prev => prev.map(f =>
              f.id === uploadFile.id
                ? { ...f, progress: Math.min(progress, 90) }
                : f
            ))
          }
        }

        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText)

              setUploadFiles(prev => prev.map(f =>
                f.id === uploadFile.id
                  ? {
                    ...f,
                    status: 'processing',
                    progress: 90
                  }
                  : f
              ))

              // Simulate processing completion
              setTimeout(() => {
                setUploadFiles(prev => prev.map(f =>
                  f.id === uploadFile.id
                    ? { ...f, status: 'completed', progress: 100 }
                    : f
                ))
              }, 2000)

              resolve()
            } catch (error) {
              reject(error)
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`))
          }
        }

        xhr.onerror = () => {
          setUploadFiles(prev => prev.map(f =>
            f.id === uploadFile.id
              ? { ...f, status: 'failed', error: 'Upload failed' }
              : f
          ))
          reject(new Error('Upload failed'))
        }

        // Use the upload-and-analyse endpoint for better OCR processing
        xhr.open('POST', '/api/upload-and-analyse')
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Upload Compliance Documents</h2>
              <p className="text-sm text-gray-500">Upload and analyse compliance documents with AI-powered OCR</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Upload Dropzone */}
          <div
            {...getRootProps()}
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 mb-6
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
                  Drag & drop or click to browse • AI-powered OCR and analysis
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Supports: {acceptedFileTypes.join(', ')} • Max {formatFileSize(maxFileSize)} per file
                </p>
              </div>
            </div>
          </div>

          {/* File Queue */}
          {uploadFiles.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Documents to Upload ({uploadFiles.length} file{uploadFiles.length !== 1 ? 's' : ''})
              </h3>

              <div className="space-y-3">
                {uploadFiles.map((uploadFile) => (
                  <div
                    key={uploadFile.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex-shrink-0">
                      {getFileIcon(uploadFile.file)}
                    </div>

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

                      {/* Building Selection */}
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <select
                          value={uploadFile.buildingId || ''}
                          onChange={(e) => {
                            const building = buildings.find(b => b.id === e.target.value)
                            if (building) {
                              updateFileBuildingId(uploadFile.id, building.id, building.name)
                            }
                          }}
                          className="text-xs border border-gray-300 rounded px-2 py-1 flex-1"
                          disabled={uploadFile.status !== 'pending'}
                        >
                          <option value="">Select building...</option>
                          {filteredBuildings.map(building => (
                            <option key={building.id} value={building.id}>
                              {building.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Progress Bar */}
                      {(uploadFile.status === 'uploading' || uploadFile.status === 'processing') && (
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadFile.progress}%` }}
                          />
                        </div>
                      )}

                      {uploadFile.error && (
                        <p className="text-xs text-red-600 mt-1">
                          ⚠️ {uploadFile.error}
                        </p>
                      )}
                    </div>

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

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-500">
              {uploadFiles.length > 0 && `${uploadFiles.length} document${uploadFiles.length !== 1 ? 's' : ''} ready`}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={uploadAllFiles}
                disabled={isUploading || uploadFiles.length === 0 || uploadFiles.some(f => !f.buildingId)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload & Analyse
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ComplianceDocumentUploadModal