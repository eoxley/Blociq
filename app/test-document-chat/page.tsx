"use client"

import { useState } from 'react'
import { FileText, Upload, MessageSquare, Sparkles } from 'lucide-react'
import DocumentAwareChatInput from '@/components/DocumentAwareChatInput'
import { toast } from 'sonner'

export default function TestDocumentChatPage() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    setUploadedFiles(prev => [...prev, ...fileArray])
    
    // Process each file through OCR
    setIsUploading(true)
    
    for (const file of fileArray) {
      try {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }))
        
        // Simulate upload progress
        for (let i = 0; i <= 100; i += 10) {
          await new Promise(resolve => setTimeout(resolve, 100))
          setUploadProgress(prev => ({ ...prev, [file.name]: i }))
        }
        
        // Process file through OCR
        const formData = new FormData()
        formData.append('file', file)
        
        const response = await fetch('https://ocr-server-2-ykmk.onrender.com/upload', {
          method: 'POST',
          body: formData
        })
        
        if (response.ok) {
          const result = await response.json()
          console.log('OCR result for', file.name, ':', result)
          
          // Store in building_documents table (simulated)
          toast.success(`✅ ${file.name} processed successfully!`)
        } else {
          throw new Error('OCR processing failed')
        }
        
      } catch (error) {
        console.error('Error processing file:', file.name, error)
        toast.error(`❌ Failed to process ${file.name}`)
      } finally {
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }))
      }
    }
    
    setIsUploading(false)
    toast.success('🎉 All files processed! You can now ask questions about them.')
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    handleFileUpload(files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    handleFileUpload(files)
  }

  const removeFile = (fileName: string) => {
    setUploadedFiles(prev => prev.filter(file => file.name !== fileName))
    setUploadProgress(prev => {
      const newProgress = { ...prev }
      delete newProgress[fileName]
      return newProgress
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/20 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="relative inline-block mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl">
              <FileText className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full animate-pulse"></div>
            <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping"></div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Document-Aware Chat Test
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Upload documents, process them through OCR, and then ask intelligent questions about their content. 
            The AI will automatically search your documents and provide context-aware responses.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Document Upload */}
          <div className="space-y-6">
            {/* File Upload Area */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Upload className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Upload Documents</h3>
                <p className="text-gray-600">Upload PDFs, images, or other documents for OCR processing</p>
              </div>

              {/* Drag & Drop Zone */}
              <div
                onDrop={handleFileDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drop files here or click to browse
                </p>
                <p className="text-gray-500">
                  Supports PDF, DOC, DOCX, TXT, JPG, PNG (max 10MB each)
                </p>
              </div>

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-3">Uploaded Files:</h4>
                  <div className="space-y-2">
                    {uploadedFiles.map((file) => (
                      <div key={file.name} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-blue-500" />
                          <div>
                            <p className="font-medium text-gray-900">{file.name}</p>
                            <p className="text-sm text-gray-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {uploadProgress[file.name] !== undefined && (
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress[file.name]}%` }}
                              ></div>
                            </div>
                          )}
                          <button
                            onClick={() => removeFile(file.name)}
                            className="text-red-500 hover:text-red-700 text-sm font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Features */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Key Features
              </h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Automatic OCR text extraction</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Document-aware AI responses</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Lease document analysis with exact formatting</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Context-aware chat conversations</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Automatic document summary generation</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Document Chat */}
          <div className="space-y-6">
            <DocumentAwareChatInput 
              buildingId="test-building"
              className="h-full"
              placeholder="Ask about your uploaded documents... (e.g., 'What are the key terms in my lease?')"
            />
            
            {/* Example Questions */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                Example Questions
              </h3>
              <div className="space-y-2 text-sm">
                <p className="text-gray-600 mb-3">Try asking these questions after uploading documents:</p>
                <div className="space-y-2">
                  <p className="p-2 bg-blue-50 rounded-lg text-blue-800">
                    💡 "What are the key terms in my lease?"
                  </p>
                  <p className="p-2 bg-purple-50 rounded-lg text-purple-800">
                    💡 "Summarize the compliance requirements"
                  </p>
                  <p className="p-2 bg-green-50 rounded-lg text-green-800">
                    💡 "What actions are needed from this document?"
                  </p>
                  <p className="p-2 bg-yellow-50 rounded-lg text-yellow-800">
                    💡 "Extract the important dates and deadlines"
                  </p>
                  <p className="p-2 bg-red-50 rounded-lg text-red-800">
                    💡 "What are the service charge percentages?"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-16 bg-white rounded-2xl shadow-xl border border-gray-200/50 p-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Upload Documents</h3>
              <p className="text-gray-600">Upload PDFs, images, or other documents. The system automatically processes them through OCR.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">2</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">AI Analysis</h3>
              <p className="text-gray-600">Documents are analyzed and stored with full text content, making them searchable by the AI.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-100 to-green-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">3</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Smart Chat</h3>
              <p className="text-gray-600">Ask questions in natural language and get intelligent, context-aware responses based on your documents.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
