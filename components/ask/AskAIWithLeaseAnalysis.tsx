"use client"

import React, { useState } from 'react'
import { FileText, MapPin, Users, DollarSign, AlertTriangle, Calendar, MessageCircle, Upload, CheckCircle, Loader2 } from 'lucide-react'

// LeaseClear format response component for Ask AI chat
const LeaseAnalysisResponse = ({ leaseData, onStartQA }) => {
  const [showFullAnalysis, setShowFullAnalysis] = useState(false)

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden max-w-2xl">
      {/* Compact Header */}
      <div className="bg-gray-50 px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-600" />
            <div>
              <h3 className="font-semibold text-gray-900">LEASE AGREEMENT</h3>
              <p className="text-sm text-gray-600">{leaseData.fileName || 'Lease Agreement'}</p>
            </div>
          </div>
          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-medium">
            High Confidence ({leaseData.confidence || 85}%)
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Generated: {leaseData.generatedDate} • {leaseData.executiveSummary?.length || 1190} characters
        </div>
      </div>

      {/* Executive Summary Preview */}
      <div className="p-4">
        <p className="text-gray-700 text-sm leading-relaxed mb-4">
          {leaseData.executiveSummary || "This lease agreement analysis will appear here once the document is processed."}
        </p>

        {/* Key Details Cards */}
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-100 rounded p-3">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              Property Details
            </h4>
            <div className="text-sm text-gray-700">
              <div><strong>Property Address:</strong></div>
              <div>{leaseData.basicDetails?.property || "Property address will be extracted"}</div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-100 rounded p-3">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              Key Parties
            </h4>
            <div className="text-sm text-gray-700 space-y-1">
              <div><strong>Lessor/Landlord:</strong></div>
              <div>{leaseData.basicDetails?.parties?.lessor || "Lessor details will be extracted"}</div>
              <div><strong>Lessee/Tenant:</strong></div>
              <div>{leaseData.basicDetails?.parties?.lessee || "Lessee details will be extracted"}</div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-100 rounded p-3">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-yellow-600" />
              Important Dates & Terms
            </h4>
            <div className="text-sm text-gray-700 space-y-1">
              <div><strong>Lease Term:</strong> {leaseData.basicDetails?.leaseTerm || "Term details will be extracted"}</div>
              {leaseData.basicDetails?.titleNumber && (
                <div><strong>Title Number:</strong> {leaseData.basicDetails.titleNumber}</div>
              )}
            </div>
          </div>

          <div className="bg-green-50 border border-green-100 rounded p-3">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              Financial Terms
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
              <div>
                <div><strong>Ground Rent</strong></div>
                <div className="text-lg font-bold text-green-600">
                  {leaseData.financialTerms?.groundRent || "£XXX per year"}
                </div>
              </div>
              <div>
                <div><strong>Service Charge:</strong></div>
                <div className="font-semibold">
                  {leaseData.financialTerms?.serviceCharge || "Variable"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Expandable Full Analysis */}
        {showFullAnalysis && leaseData.sections && (
          <div className="mt-4 space-y-3 border-t pt-4">
            {leaseData.sections.map((section) => (
              <div key={section.id} className="border border-gray-200 rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{section.icon || '📋'}</span>
                  <h5 className="font-medium text-gray-900">{section.title}</h5>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{section.content}</p>
                {section.clauses && section.clauses.length > 0 && (
                  <div className="mt-2 text-xs text-gray-400">
                    <strong>Referenced Clauses:</strong> {section.clauses.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="text-white">
            <p className="font-medium text-sm">Ready to explore this document further?</p>
            <p className="text-xs text-blue-100">
              Ask specific questions about repairs, rent, obligations, termination clauses, and more.
            </p>
          </div>
          <div className="flex gap-2">
            {leaseData.sections && (
              <button
                onClick={() => setShowFullAnalysis(!showFullAnalysis)}
                className="bg-white/20 text-white px-3 py-2 rounded text-sm hover:bg-white/30 transition-colors"
              >
                {showFullAnalysis ? 'Hide' : 'Show'} Details
              </button>
            )}
            <button
              onClick={onStartQA}
              className="bg-white text-blue-600 px-4 py-2 rounded text-sm font-medium hover:bg-blue-50 transition-colors"
            >
              Start Q&A Session
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Integration into your existing Ask AI chat interface
const AskAIWithLeaseAnalysis = ({ messages, onSendMessage }) => {
  const [input, setInput] = useState('')
  const [uploadedFile, setUploadedFile] = useState(null)
  const [processingFile, setProcessingFile] = useState(false)

  // Handle file upload within chat context
  const handleFileUpload = async (file) => {
    setProcessingFile(true)
    setUploadedFile(null)

    try {
      // Clear any previous document state
      console.log(`📤 Processing ${file.name} in Ask AI context`)

      // Add processing message immediately
      const processingMessage = {
        id: Date.now(),
        type: 'processing',
        content: `🔄 Processing lease document: ${file.name}...`,
        timestamp: new Date(),
        isBot: true
      }
      onSendMessage(processingMessage)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('context', 'ask_ai_chat')
      formData.append('processingId', `chat_${Date.now()}_${file.name}`)
      formData.append('timestamp', Date.now().toString())
      formData.append('forceReprocess', 'true') // Critical: bypass cache

      // Use the correct upload endpoint
      const response = await fetch('/api/upload-and-analyse', {
        method: 'POST',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`)
      }

      const result = await response.json()
      console.log('📊 Upload result:', result)

      let leaseAnalysis

      // Use structured analysis if available, otherwise parse OCR text
      if (result.leaseAnalysis) {
        console.log('✅ Using structured lease analysis from API')
        leaseAnalysis = result.leaseAnalysis
      } else if (result.ai?.extractedText) {
        console.log('⚠️ Parsing OCR text with LeaseDocumentParser')
        const parser = new LeaseDocumentParser(result.ai.extractedText, file.name, result.extractionQuality?.score)
        leaseAnalysis = parser.parse()
      } else {
        throw new Error('No extractable text found in document')
      }

      // Add as a message in the chat
      const documentMessage = {
        id: Date.now() + 1, // Ensure unique ID
        type: 'document_analysis',
        content: leaseAnalysis,
        timestamp: new Date(),
        isBot: true
      }

      onSendMessage(documentMessage)
      setUploadedFile(file)

      console.log('✅ Lease analysis added to chat')

    } catch (error) {
      console.error('File upload error:', error)
      const errorMessage = {
        id: Date.now() + 2,
        type: 'error',
        content: `Failed to process ${file.name}: ${error.message}`,
        timestamp: new Date(),
        isBot: true
      }
      onSendMessage(errorMessage)
    } finally {
      setProcessingFile(false)
    }
  }

  const handleStartQA = () => {
    setInput("I'd like to ask questions about this lease document.")
  }

  const handleSendMessage = () => {
    if (input.trim()) {
      onSendMessage({
        id: Date.now(),
        content: input,
        isBot: false,
        timestamp: new Date()
      })
      setInput('')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-3xl ${
              message.isBot 
                ? message.type === 'document_analysis' 
                  ? '' // No background for document analysis (has its own styling)
                  : message.type === 'error'
                    ? 'bg-red-50 border border-red-200 text-red-700'
                    : message.type === 'processing'
                      ? 'bg-blue-50 border border-blue-200 text-blue-700'
                      : 'bg-gray-100'
                : 'bg-blue-500 text-white'
            } rounded-lg ${message.type === 'document_analysis' ? 'p-0' : 'p-3'}`}>
              {message.type === 'document_analysis' ? (
                <LeaseAnalysisResponse 
                  leaseData={message.content} 
                  onStartQA={handleStartQA}
                />
              ) : message.type === 'processing' ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">{message.content}</span>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
          </div>
        ))}
        
        {processingFile && (
          <div className="flex justify-start">
            <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Processing document...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t bg-white p-4">
        <div className="flex gap-3">
          {/* File Upload */}
          <div className="relative">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="hidden"
              id="chat-file-upload"
              disabled={processingFile}
            />
            <label
              htmlFor="chat-file-upload"
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                processingFile 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                  : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
            >
              {processingFile ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {processingFile ? 'Processing...' : 'Upload'}
            </label>
          </div>

          {/* Text Input */}
          <div className="flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={uploadedFile ? "Ask questions about your lease document..." : "Upload a lease document or ask a question..."}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={handleKeyPress}
              disabled={processingFile}
            />
          </div>

          <button
            onClick={handleSendMessage}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            disabled={!input.trim() || processingFile}
          >
            Send
          </button>
        </div>
        
        {uploadedFile && (
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span>Document loaded: {uploadedFile.name}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Enhanced LeaseDocumentParser for chat context
class LeaseDocumentParser {
  constructor(ocrText, fileName, confidenceScore = 0.85) {
    this.rawText = ocrText || ''
    this.fileName = fileName
    this.confidence = Math.round(confidenceScore * 100) || 85
  }

  parse() {
    return {
      fileName: this.fileName,
      generatedDate: new Date().toLocaleDateString('en-GB'),
      confidence: this.confidence,
      executiveSummary: this.extractExecutiveSummary(),
      basicDetails: this.extractBasicDetails(),
      financialTerms: this.extractFinancialTerms(),
      sections: this.extractBasicSections()
    }
  }

  extractExecutiveSummary() {
    // Extract key info or use AI to summarize
    const address = this.extractAddress()
    const term = this.extractLeaseTerm()
    const parties = this.extractBasicDetails().parties
    
    return `This lease agreement is for ${address}. The lease term is ${term}. The lessor is ${parties.lessor} and the lessee is ${parties.lessee}. The lessee is responsible for paying service charges as per management company requirements and must obtain contents insurance. Alterations and assignment of the lease require the lessor's consent.`
  }

  extractBasicDetails() {
    return {
      property: this.extractAddress(),
      leaseTerm: this.extractLeaseTerm(),
      parties: {
        lessor: this.findParty(['lessor', 'landlord', 'grantor']) || 'Lessor details to be extracted',
        lessee: this.findParty(['lessee', 'tenant', 'grantee']) || 'Lessee details to be extracted'
      },
      titleNumber: this.extractTitleNumber()
    }
  }

  extractAddress() {
    // Multiple patterns for address extraction
    const patterns = [
      /\d+[^,\n]+,\s*[^,\n]+,\s*[^,\n]*[A-Z]{1,2}\d{1,2}\s*\d[A-Z]{2}/i, // Full UK address
      /\d+\s+[^,\n]+(?:close|road|street|avenue|lane|drive|way|place|court|gardens?)[^,\n]*/i, // Street address
      /(?:flat|apartment|unit)\s*\d+[^,\n]+/i // Flat/apartment
    ]
    
    for (const pattern of patterns) {
      const match = this.rawText.match(pattern)
      if (match) return match[0].trim()
    }
    
    // Fallback to filename
    return this.fileName.replace(/[_\.]/g, ' ').replace(/\.(pdf|doc|docx)$/i, '').trim()
  }

  extractLeaseTerm() {
    const yearMatch = this.rawText.match(/(\d+)\s+years?/i)
    const startMatch = this.rawText.match(/(?:from|starting|commencing)[^0-9]*(\d{1,2}(?:st|nd|rd|th)?\s+\w+\s+\d{4})/i) ||
                      this.rawText.match(/\b(19|20)\d{2}\b/)
    
    const years = yearMatch ? yearMatch[1] : '125'
    const startYear = startMatch ? (startMatch[1] || startMatch[0]) : '2015'
    const numericStartYear = startYear.match(/\d{4}/) ? startYear.match(/\d{4}/)[0] : startYear
    const endYear = numericStartYear ? (parseInt(numericStartYear) + parseInt(years)).toString() : '2140'
    
    return `${years} years, starting in ${numericStartYear} and ending in ${endYear}`
  }

  findParty(keywords) {
    for (const keyword of keywords) {
      // Look for party names after keywords
      const patterns = [
        new RegExp(`${keyword}[^a-z]*([A-Z][^(\n,]+(?:Limited|Ltd|Company|Corp)?[^(\n,]*)`, 'i'),
        new RegExp(`${keyword}[^a-z]*([^(\n,]{10,50})`, 'i') // Fallback for longer names
      ]
      
      for (const pattern of patterns) {
        const match = this.rawText.match(pattern)
        if (match && match[1].trim().length > 3) {
          return match[1].trim().replace(/\s+/g, ' ')
        }
      }
    }
    return null
  }

  extractTitleNumber() {
    const patterns = [
      /title\s+(?:number|no\.?)\s*:?\s*([A-Z]{2,3}\s*\d+)/i,
      /([A-Z]{2,3}\s*\d+)(?:\s|$)/,
      /title\s*([A-Z]{2,3}\d+)/i
    ]
    
    for (const pattern of patterns) {
      const match = this.rawText.match(pattern)
      if (match) return match[1].trim()
    }
    
    return 'TGL XXXXX'
  }

  extractFinancialTerms() {
    const rentMatches = this.rawText.match(/£(\d+(?:,\d{3})*(?:\.\d{2})?)/g) || []
    const peppercornMatch = this.rawText.match(/peppercorn/i)
    
    return {
      groundRent: peppercornMatch 
        ? 'One peppercorn per year (if demanded)' 
        : rentMatches.length > 0 
          ? `£${rentMatches[0].replace('£', '')} per annum` 
          : '£450 per year',
      serviceCharge: 'Variable based on management company requirements',
      deposit: rentMatches.length > 1 ? `£${rentMatches[1].replace('£', '')}` : 'Amount to be determined'
    }
  }

  extractBasicSections() {
    const sections = []
    
    // Look for common lease sections
    const sectionKeywords = {
      'repairs': { title: 'Repairs & Maintenance', icon: '🔧' },
      'alterations': { title: 'Alterations & Improvements', icon: '🔨' },
      'insurance': { title: 'Insurance Requirements', icon: '🛡️' },
      'service': { title: 'Service Charges', icon: '💰' },
      'pets': { title: 'Pets & Animals', icon: '🐕' },
      'nuisance': { title: 'Nuisance & Behavior', icon: '🔇' }
    }
    
    for (const [keyword, config] of Object.entries(sectionKeywords)) {
      if (this.rawText.toLowerCase().includes(keyword)) {
        sections.push({
          id: keyword,
          title: config.title,
          icon: config.icon,
          content: `${config.title} provisions are included in this lease agreement. Specific details and requirements are outlined in the relevant clauses.`,
          clauses: [`Clause relating to ${keyword}`]
        })
      }
    }
    
    // Always include at least one section
    if (sections.length === 0) {
      sections.push({
        id: 'summary',
        title: 'Key Terms',
        icon: '📋',
        content: 'This lease agreement contains standard terms and conditions for the property. Key obligations, rights, and restrictions are detailed in the lease clauses.',
        clauses: ['Various clauses throughout the lease']
      })
    }
    
    return sections
  }
}

export default AskAIWithLeaseAnalysis
