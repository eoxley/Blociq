'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useHybridAskAI } from '@/hooks/useHybridAskAI';

interface HybridAskAIProps {
  buildingId?: string;
  onJobCreated?: (jobId: string) => void;
}

export default function HybridAskAI({ buildingId, onJobCreated }: HybridAskAIProps) {
  const {
    messages,
    isProcessing,
    uploadStatus,
    currentJobId,
    processFileWithQuestion,
    processPageSpecific,
    sendTextMessage,
    checkJobStatus,
    clearMessages,
    abort
  } = useHybridAskAI();

  const [inputValue, setInputValue] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll removed - let users control their own scrolling
  // useEffect(() => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  // }, [messages]);

  // Notify parent component when job is created
  useEffect(() => {
    if (currentJobId && onJobCreated) {
      onJobCreated(currentJobId);
    }
  }, [currentJobId, onJobCreated]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/tiff',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Please select a PDF, image, or Word document.');
      return;
    }

    // Check file size (100MB limit)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File size must be under 100MB.');
      return;
    }

    setCurrentFile(file);
    
    // Auto-suggest question based on filename
    const filename = file.name.toLowerCase();
    let suggestedQuestion = '';
    
    if (filename.includes('lease')) {
      suggestedQuestion = 'What are the key terms of this lease?';
    } else if (filename.includes('rent')) {
      suggestedQuestion = 'What is the rent amount and payment terms?';
    } else if (filename.includes('agreement') || filename.includes('contract')) {
      suggestedQuestion = 'What are the main terms of this agreement?';
    } else {
      suggestedQuestion = 'Please analyze this document and tell me the key information.';
    }
    
    setInputValue(suggestedQuestion);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;

    if (currentFile) {
      // Process file with question
      await processFileWithQuestion(currentFile, inputValue.trim(), buildingId);
      setCurrentFile(null);
    } else {
      // Send text message
      await sendTextMessage(inputValue.trim());
    }
    
    setInputValue('');
  };

  const handleQuickAction = async (action: string) => {
    if (!currentFile) return;
    
    let question = '';
    switch (action) {
      case 'parties':
        question = 'Who are the parties to this lease (tenant and landlord)?';
        break;
      case 'rent':
        question = 'What is the monthly rent amount and payment terms?';
        break;
      case 'dates':
        question = 'What are the lease start and end dates?';
        break;
      case 'address':
        question = 'What is the property address?';
        break;
      case 'summary':
        question = 'Please provide a summary of the key lease terms.';
        break;
      default:
        return;
    }
    
    setInputValue(question);
  };

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(2)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  };

  const getProcessingMessage = () => {
    if (!uploadStatus.isUploading) return null;
    
    const { progress, processingType, currentFile } = uploadStatus;
    
    if (processingType === 'quick') {
      return `🔍 Quick analysis in progress... ${progress}%`;
    } else if (processingType === 'background') {
      return `📋 Complex document detected - background processing started`;
    }
    
    return `📄 Processing ${currentFile?.name}... ${progress}%`;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Ask AI about Leases</h2>
            <p className="text-sm text-gray-600">Upload a lease document and ask questions</p>
          </div>
          
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded-md border"
              disabled={isProcessing}
            >
              Clear Chat
            </button>
          )}
        </div>
        
        {/* Processing Status */}
        {uploadStatus.isUploading && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">
                {getProcessingMessage()}
              </span>
              <button
                onClick={abort}
                className="text-xs text-blue-700 hover:text-blue-800"
              >
                Cancel
              </button>
            </div>
            
            {uploadStatus.progress > 0 && (
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadStatus.progress}%` }}
                />
              </div>
            )}
            
            {uploadStatus.jobId && (
              <div className="text-xs text-blue-700 mt-1">
                Background Job ID: <code className="bg-blue-100 px-1 rounded">{uploadStatus.jobId}</code>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📄</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Ready to analyze lease documents
            </h3>
            <p className="text-gray-600 mb-6">
              Upload a lease document and ask specific questions for instant analysis
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-md mx-auto text-sm">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="font-medium text-green-900 mb-1">⚡ Quick Processing</div>
                <div className="text-green-700">Small files & targeted questions get instant answers</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="font-medium text-blue-900 mb-1">🔄 Background Processing</div>
                <div className="text-blue-700">Large/complex documents processed thoroughly</div>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.role === 'system'
                    ? 'bg-gray-100 text-gray-800 border-l-4 border-gray-400'
                    : 'bg-gray-50 text-gray-900'
                }`}
              >
                {/* Message content */}
                <div className="whitespace-pre-wrap">{message.content}</div>
                
                {/* Metadata */}
                {message.metadata && (
                  <div className="text-xs opacity-75 mt-2 space-y-1">
                    {message.metadata.filename && (
                      <div>📎 {message.metadata.filename}</div>
                    )}
                    {message.metadata.type === 'quick' && message.metadata.processingTime && (
                      <div>⚡ Processed in {message.metadata.processingTime}ms</div>
                    )}
                    {message.metadata.type === 'background' && message.metadata.jobId && (
                      <div>🔄 Job ID: {message.metadata.jobId}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t p-4">
        {/* File Upload Area */}
        {!currentFile ? (
          <div
            className={`border-2 border-dashed rounded-lg p-4 text-center mb-4 transition-colors cursor-pointer ${
              dragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="text-2xl mb-2">📄</div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Drop your lease document here</span> or click to browse
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Supports PDF, images, Word docs (up to 100MB)
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              accept=".pdf,.jpg,.jpeg,.png,.tiff,.webp,.doc,.docx"
              className="hidden"
            />
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="text-green-600">📄</div>
                <div>
                  <div className="font-medium text-green-900">{currentFile.name}</div>
                  <div className="text-sm text-green-700">{formatFileSize(currentFile.size)}</div>
                </div>
              </div>
              <button
                onClick={() => setCurrentFile(null)}
                className="text-green-700 hover:text-green-800 text-sm"
              >
                Remove
              </button>
            </div>
            
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-xs text-green-700 font-medium">Quick questions:</span>
              {['parties', 'rent', 'dates', 'address', 'summary'].map((action) => (
                <button
                  key={action}
                  onClick={() => handleQuickAction(action)}
                  className="text-xs bg-white text-green-700 border border-green-300 rounded px-2 py-1 hover:bg-green-50"
                >
                  {action.charAt(0).toUpperCase() + action.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Input */}
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <div className="flex-1">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                currentFile
                  ? "Ask a question about your lease document..."
                  : "Ask a question or upload a lease document..."
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isProcessing}
            />
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim() || isProcessing}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isProcessing ? '...' : currentFile ? '📋 Analyze' : '💬 Send'}
          </button>
        </form>
        
        {currentFile && (
          <div className="text-xs text-gray-500 mt-2">
            💡 Tip: For specific pages, try "What's on page 2?" or "Show me the signature page"
          </div>
        )}
      </div>
    </div>
  );
}