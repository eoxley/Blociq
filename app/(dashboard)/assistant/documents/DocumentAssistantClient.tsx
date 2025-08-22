'use client'

import React, { useState, useRef, useCallback } from 'react'
import { 
  Upload, 
  FileText, 
  Building, 
  MessageSquare, 
  Brain, 
  ChevronDown, 
  ChevronUp,
  Loader2,
  CheckCircle,
  AlertCircle,
  File,
  Image,
  FileImage,
  FileArchive
} from 'lucide-react'
import { toast } from 'sonner'

interface Building {
  id: string
  name: string
  address: string
}

interface RecentDocument {
  id: string
  file_name: string
  document_type: string
  created_at: string
  buildings: { name: string }
}

interface DocumentAssistantClientProps {
  buildings: Building[]
  recentDocuments: RecentDocument[]
}

export default function DocumentAssistantClient({ buildings, recentDocuments }: DocumentAssistantClientProps) {
  const [selectedBuilding, setSelectedBuilding] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [question, setQuestion] = useState('')
  const [isAskingAI, setIsAskingAI] = useState(false)
  const [aiResponse, setAiResponse] = useState('')
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = useCallback(async (file: File) => {
    if (!selectedBuilding) {
      toast.error('Please select a building first')
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File size must be less than 10MB')
      return
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/jpg'
    ]

    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF, DOC, DOCX, JPG, or PNG file')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('building_id', selectedBuilding)

      const response = await fetch('/api/upload-doc', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      toast.success(`Document uploaded successfully! Type: ${result.document_type}`)
      setUploadProgress(100)
      
      // Reset after a moment
      setTimeout(() => {
        setUploadProgress(0)
        setIsUploading(false)
      }, 2000)

    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Upload failed')
      setIsUploading(false)
      setUploadProgress(0)
    }
  }, [selectedBuilding])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileUpload(file)
    }
  }, [handleFileUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }, [handleFileUpload])

  const handleAskAI = async () => {
    if (!question.trim()) {
      toast.error('Please enter a question')
      return
    }

    if (!selectedBuilding) {
      toast.error('Please select a building first')
      return
    }

    setIsAskingAI(true)
    setAiResponse('')

    try {
      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: question.trim(),
          building_id: selectedBuilding
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to get AI response')
      }

      setAiResponse(result.answer)
      toast.success('AI response generated successfully')

    } catch (error) {
      console.error('AI query error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to get AI response')
    } finally {
      setIsAskingAI(false)
    }
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'pdf':
        return <FileText className="h-5 w-5" />
      case 'doc':
      case 'docx':
        return <File className="h-5 w-5" />
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <Image className="h-5 w-5" />
      default:
        return <FileArchive className="h-5 w-5" />
    }
  }

  const suggestedPrompts = {
    documents: [
      "Summarise this Fire Risk Assessment",
      "Is this insurance certificate up to date?",
      "What are the key findings in this EICR report?",
      "Extract the expiry date from this certificate"
    ],
    building: [
      "Who is the leaseholder of Flat 5?",
      "What compliance items are overdue?",
      "Show me all units in this building",
      "What maintenance issues were reported recently?"
    ]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#4f46e5] to-[#a855f7] py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <Brain className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Document-Aware AI Assistant
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              Upload documents and ask smart questions with full building context
            </p>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        
        {/* Building Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Building</h2>
          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4f46e5] focus:border-[#4f46e5] transition-all"
          >
            <option value="">Choose a building...</option>
            {buildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name} - {building.address}
              </option>
            ))}
          </select>
        </div>

        {/* Upload Document Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">📤 Upload Document for Analysis</h2>
          
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              isUploading 
                ? 'border-[#4f46e5] bg-[#4f46e5]/5' 
                : 'border-gray-300 hover:border-[#4f46e5] hover:bg-gray-50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {isUploading ? (
              <div className="space-y-4">
                <Loader2 className="h-12 w-12 text-[#4f46e5] animate-spin mx-auto" />
                <div>
                  <p className="text-lg font-semibold text-gray-900">Uploading document...</p>
                  <p className="text-sm text-gray-600">Extracting text and analyzing content</p>
                </div>
                {uploadProgress > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-[#4f46e5] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                <div>
                  <p className="text-lg font-semibold text-gray-900">Drop your document here</p>
                  <p className="text-sm text-gray-600">or click to browse files</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Supports PDF, DOC, DOCX, JPG, PNG (max 10MB)
                  </p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white rounded-xl hover:brightness-110 transition-all duration-200 font-medium"
                >
                  Choose File
                </button>
              </div>
            )}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Ask AI Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">💬 Ask the AI</h2>
          <p className="text-xs text-gray-500 italic mb-4">
            💡 Sometimes BlocIQ can get things muddled - please verify important information
          </p>
          
          <div className="space-y-4">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about your building or documents..."
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4f46e5] focus:border-[#4f46e5] transition-all resize-none"
              rows={4}
            />
            
            <button
              onClick={handleAskAI}
              disabled={isAskingAI || !question.trim() || !selectedBuilding}
              className="px-6 py-3 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] text-white rounded-xl hover:brightness-110 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isAskingAI ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Ask AI
                </>
              )}
            </button>
          </div>

          {/* AI Response */}
          {aiResponse && (
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="h-5 w-5 text-[#4f46e5]" />
                <h3 className="font-semibold text-gray-900">AI Response</h3>
              </div>
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{aiResponse}</p>
              </div>
            </div>
          )}
        </div>

        {/* Suggested Prompts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#4f46e5]" />
              Document Examples
            </h3>
            <div className="space-y-3">
              {suggestedPrompts.documents.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => setQuestion(prompt)}
                  className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm text-gray-700"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building className="h-5 w-5 text-[#4f46e5]" />
              Building Examples
            </h3>
            <div className="space-y-3">
              {suggestedPrompts.building.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => setQuestion(prompt)}
                  className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm text-gray-700"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Documents */}
        {recentDocuments.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  {getFileIcon(doc.file_name)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                    <p className="text-xs text-gray-500">{doc.document_type}</p>
                    <p className="text-xs text-gray-400">{doc.buildings.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <button
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            className="w-full flex items-center justify-between text-left"
          >
            <h3 className="text-lg font-semibold text-gray-900">❓ How It Works</h3>
            {showHowItWorks ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </button>
          
          {showHowItWorks && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-white font-bold">1</span>
                  </div>
                  <h4 className="font-semibold text-gray-900">Upload Document</h4>
                  <p className="text-sm text-gray-600">Drag & drop or click to upload</p>
                </div>
                
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-white font-bold">2</span>
                  </div>
                  <h4 className="font-semibold text-gray-900">AI Analysis</h4>
                  <p className="text-sm text-gray-600">Extracts text & classifies content</p>
                </div>
                
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-white font-bold">3</span>
                  </div>
                  <h4 className="font-semibold text-gray-900">Ask Questions</h4>
                  <p className="text-sm text-gray-600">Query about documents or building</p>
                </div>
                
                <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-white font-bold">4</span>
                  </div>
                  <h4 className="font-semibold text-gray-900">Get Answers</h4>
                  <p className="text-sm text-gray-600">AI responds with context</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 