"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, Upload, FileText, X, Brain } from 'lucide-react';
import { toast } from 'sonner';
import AIChatDisclaimer from '@/components/ui/AIChatDisclaimer';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  files?: UploadedFile[];
  isStructured?: boolean; // Flag for special formatting
};

type UploadedFile = {
  file: File;
  id: string;
  name: string;
  size: number;
  type: string;
};

type AIResponse = {
  success: boolean;
  response: string;
};

interface PublicAskBlocIQProps {
  isPublic?: boolean;
  isVisible?: boolean;
}

export default function PublicAskBlocIQ({ isPublic = true, isVisible = false }: PublicAskBlocIQProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // File handling
  const acceptedFileTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
  const maxFileSize = 10 * 1024 * 1024; // 10MB
  const maxFiles = 5;

  // Auto-focus input field on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-scroll removed - let users control their own scrolling
  // useEffect(() => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  // }, [messages]);

  const validateFile = (file: File): boolean => {
    if (!acceptedFileTypes.includes(file.type)) {
      toast.error(`File type not supported. Please upload PDF, DOCX, or TXT files.`);
      return false;
    }
    
    if (file.size > maxFileSize) {
      toast.error(`File too large. Please upload files smaller than 10MB.`);
      return false;
    }
    
    if (uploadedFiles.length >= maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed.`);
      return false;
    }
    
    return true;
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    Array.from(files).forEach(file => {
      if (validateFile(file)) {
        const fileId = Math.random().toString(36).substr(2, 9);
        const uploadedFile: UploadedFile = {
          file,
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type
        };
        
        setUploadedFiles(prev => [...prev, uploadedFile]);
        toast.success(`✅ ${file.name} uploaded. You can now ask questions about it.`);
      }
    });
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('text')) return '📄';
    return '📎';
  };

  // Handle response display logic
  const displayMessage = (responseData: any): string => {
    console.log("📤 Processing response data:", responseData);
    
    // Handle file upload responses - look for lease analysis first
    if (responseData.analysis) {
      console.log("✅ Found lease analysis in response");
      return responseData.analysis; // Show the formatted lease analysis
    }
    
    // Handle regular text responses  
    if (responseData.response) {
      console.log("✅ Found regular response");
      return responseData.response;
    }
    
    // Handle file processing summary
    if (responseData.summary) {
      console.log("✅ Found summary response");
      return responseData.summary;
    }
    
    // Fallback to message
    if (responseData.message) {
      console.log("✅ Found message response");
      return responseData.message;
    }
    
    console.log("❌ No response content found");
    return "No response available";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() && uploadedFiles.length === 0) {
      toast.error('Please enter a question or upload a file.');
      return;
    }

    // Add user message to history
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question.trim(),
      timestamp: new Date(),
      files: uploadedFiles.length > 0 ? [...uploadedFiles] : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    
    try {
      // Create FormData if files are uploaded
      let requestBody: FormData | string;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (uploadedFiles.length > 0) {
        const formData = new FormData();
        formData.append('prompt', question.trim());
        formData.append('building_id', 'null');
        
        uploadedFiles.forEach((uploadedFile) => {
          formData.append(`file`, uploadedFile.file);
          formData.append(`fileName`, uploadedFile.name);
        });
        
        requestBody = formData;
        delete headers['Content-Type'];
      } else {
        requestBody = JSON.stringify({
          prompt: question.trim(),
          building_id: null,
          is_public: true
        });
      }

      // Use public endpoint for public access, main endpoint for authenticated users
      const endpoint = isPublic ? '/api/ask-ai-public' : '/api/ask-ai';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: requestBody,
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data: AIResponse = await response.json();
      
      // 🔍 Add detailed logging
      console.log("🔍 Full API Response:", data);
      console.log("🔍 Response type:", typeof data);
      console.log("🔍 Response keys:", Object.keys(data));
      
      // Check for different possible response formats:
      console.log("📄 Analysis field:", (data as any).analysis);
      console.log("📄 Response field:", data.response);
      console.log("📄 Summary field:", (data as any).summary);
      console.log("📄 Message field:", (data as any).message);
      
      if (data.success) {
        // Handle structured lease analysis or regular responses
        const displayContent = displayMessage(data);
        
        if (displayContent) {
          // Add assistant message to history with structured flag for lease analysis
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: displayContent,
            timestamp: new Date(),
            isStructured: displayContent.includes('Got the lease') && displayContent.includes('key points')
          };

          setMessages(prev => [...prev, assistantMessage]);
        } else {
          toast.error('Error: No response content available');
        }
      } else {
        toast.error('Error: No response from AI service');
      }
    } catch (error) {
      toast.error('Error: Failed to connect to AI service. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
      setQuestion('');
      setUploadedFiles([]);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl p-6 shadow-xl">

      {/* BlocIQ Brain Icon */}
      <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-full mb-4 mx-auto text-white">
        <Brain className="h-8 w-8" />
      </div>

      {/* Title and Description */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Ask BlocIQ</h2>
        <p className="text-gray-600">Your AI-powered property management assistant</p>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-6 max-h-96">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to BlocIQ Assistant</h3>
            <p className="text-gray-600 mb-6">Ask me anything about property management, compliance, or upload documents for analysis.</p>
            
            {/* Suggested Prompts */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Try asking:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => setQuestion("What are the key compliance requirements for residential properties?")}
                  className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm border border-blue-200"
                >
                  What are the key compliance requirements for residential properties?
                </button>
                <button
                  onClick={() => setQuestion("How can I improve my property management workflow?")}
                  className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm border border-blue-200"
                >
                  How can I improve my property management workflow?
                </button>
                <button
                  onClick={() => setQuestion("What should I include in a Section 20 notice?")}
                  className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm border border-blue-200"
                >
                  What should I include in a Section 20 notice?
                </button>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} transition-all duration-300 ease-in-out`}
            >
              <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                <div className={`rounded-2xl px-4 py-3 ${
                  message.role === 'user' 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' 
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  {/* Handle structured lease analysis formatting */}
                  {message.isStructured && message.content.includes('key points') ? (
                    <div className="lease-analysis">
                      <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 'inherit' }}>
                        {message.content}
                      </pre>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </div>
                  )}
                  
                  {/* Files */}
                  {message.files && message.files.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.files.map((file) => (
                        <div key={file.id} className="flex items-center gap-2 text-sm">
                          <span>{getFileIcon(file.type)}</span>
                          <span className="truncate">{file.name}</span>
                          <span className="text-xs opacity-70">({formatFileSize(file.size)})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Loading Message */}
        {loading && (
          <div className="flex justify-start transition-all duration-300 ease-in-out">
            <div className="max-w-[80%]">
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="text-sm text-gray-600">BlocIQ is thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 pt-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Main Input */}
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask BlocIQ anything..."
              className="w-full px-4 py-3 pr-20 bg-white border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
              disabled={loading}
            />
            
            {/* Send Button */}
            <button
              type="submit"
              disabled={loading || (!question.trim() && uploadedFiles.length === 0)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl transition-all duration-200 disabled:cursor-not-allowed shadow-sm"
              title="Send with BlocIQ"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* File Upload Section */}
          <div 
            className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
              isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-8 w-8 text-gray-500 mb-2" />
            <p className="text-sm text-gray-600 mb-2">
              Drag and drop files here, or{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="font-medium text-blue-600 hover:text-blue-700"
              >
                browse
              </button>
            </p>
            <p className="text-xs text-gray-500">
              Supports PDF, DOCX, TXT (max 10MB each, up to 5 files)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
          </div>

          {/* Uploaded Files */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Uploaded files:</p>
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">{file.name}</span>
                    <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </form>
        <AIChatDisclaimer />
      </div>
    </div>
  );
}
