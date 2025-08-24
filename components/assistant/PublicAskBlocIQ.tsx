"use client";

import React, { useState, useEffect } from 'react';
import { Brain, X, Mail, Shield, Send, Loader2, Sparkles, Upload, FileText, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { startPublicChat, logPublicChatMessage, getExistingSession, getExistingEmail } from '@/lib/publicChatClient';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  files?: UploadedFile[];
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

export default function PublicAskBlocIQ() {
  // State for the initial popup guide
  const [showGuidePopup, setShowGuidePopup] = useState(false);
  
  // State for email unlock modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  
  // State for chat widget
  const [showChat, setShowChat] = useState(false);
  const [hasUnlocked, setHasUnlocked] = useState(false);
  
  // Email modal state
  const [email, setEmail] = useState('');
  const [agreedToResearch, setAgreedToResearch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Session management
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // File handling
  const acceptedFileTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
  const maxFileSize = 10 * 1024 * 1024; // 10MB
  const maxFiles = 5;

  // Check if user has already unlocked and show guide popup on first visit
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userEmail = localStorage.getItem('askBlocEmail');
      const guideShown = sessionStorage.getItem('askBlocGuideShown');
      
      // Check for existing session
      const existingSession = getExistingSession();
      const existingEmail = getExistingEmail();
      
      if (existingSession && existingEmail) {
        setSessionId(existingSession);
        setHasUnlocked(true);
      } else if (userEmail) {
        setHasUnlocked(true);
      }
      
      if (!guideShown) {
        setShowGuidePopup(true);
      }
    }
  }, []);

  // Auto-focus input field when chat opens
  useEffect(() => {
    if (showChat) {
      inputRef.current?.focus();
    }
  }, [showChat]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const minHeight = 40;
      const maxHeight = 150;
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      textarea.style.height = `${newHeight}px`;
    }
  }, [question]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle brain icon click
  const handleBrainIconClick = () => {
    if (hasUnlocked) {
      setShowChat(true);
    } else {
      setShowEmailModal(true);
    }
  };

  // Handle guide popup close
  const handleCloseGuide = () => {
    setShowGuidePopup(false);
    sessionStorage.setItem('askBlocGuideShown', 'true');
  };

  // Handle email submission
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!agreedToResearch) {
      setError('Please agree to the terms to continue');
      return;
    }

    setIsSubmitting(true);

    try {
      // Start public chat session
      const newSessionId = await startPublicChat(email, agreedToResearch);
      setSessionId(newSessionId);
      
      // Save to localStorage (legacy support)
      localStorage.setItem('askBlocEmail', email);
      
      // Unlock the chat
      setHasUnlocked(true);
      setShowChat(true);
      setShowEmailModal(false);
      
      toast.success('Welcome to BlocIQ!');
    } catch (error) {
      console.error('Failed to start session:', error);
      setError('Failed to save your information. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // File validation
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

  // Handle file selection
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

  // Remove file
  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Drag and drop handlers
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

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('text')) return '📄';
    return '📎';
  };

  // Handle chat submission
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
      // Log user message if session exists
      if (sessionId) {
        await logPublicChatMessage(sessionId, 'user', question.trim());
      }

      // Create FormData if files are uploaded
      let requestBody: FormData | string;
      let headers: Record<string, string> = {
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

      const response = await fetch('/api/ask-ai-public', {
        method: 'POST',
        headers,
        body: requestBody,
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data: AIResponse = await response.json();
      
      if (data.success && data.response) {
        // Log assistant message if session exists
        if (sessionId) {
          await logPublicChatMessage(sessionId, 'assistant', data.response);
        }
        
        // Add assistant message to history
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
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

  return (
    <>
      {/* Fixed Brain Icon Button - Bottom Right */}
      <button
        onClick={handleBrainIconClick}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:from-[#4338ca] hover:to-[#9333ea] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110 flex items-center justify-center"
        title="Ask BlocIQ"
      >
        <Brain className="h-8 w-8" />
      </button>

      {/* Initial Guide Popup - Enhanced with Description and Disclosure */}
      {showGuidePopup && (
        <>
          <div 
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm"
            onClick={handleCloseGuide}
          />
          
          <div className="fixed bottom-24 right-6 w-[380px] rounded-2xl bg-white shadow-2xl z-[10000] border border-gray-100">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Ask BlocIQ</h2>
                  <p className="text-sm text-gray-600">Your AI Property Assistant</p>
                </div>
                <button
                  onClick={handleCloseGuide}
                  className="ml-auto p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              {/* Description */}
              <div className="mb-4">
                <p className="text-sm text-gray-700 leading-relaxed">
                  Ask BlocIQ is your intelligent property management assistant. Get instant answers about compliance, 
                  maintenance schedules, leaseholder queries, and more. Simply click the brain icon below to start chatting.
                </p>
              </div>
              
              {/* Features */}
              <div className="mb-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Compliance tracking & alerts</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Document analysis & search</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Maintenance scheduling</span>
                </div>
              </div>
              
              {/* Disclosure */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-200">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-gray-600">
                    <p className="font-medium mb-1">Privacy Notice</p>
                    <p>Your conversations and uploaded documents are used to improve our AI service. 
                    We do not share your data with third parties.</p>
                  </div>
                </div>
              </div>
              
              {/* Action Button */}
              <button
                onClick={handleCloseGuide}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-4 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Start Using Ask BlocIQ
              </button>
            </div>
          </div>
        </>
      )}

      {/* Email Consent Modal */}
      {showEmailModal && (
        <>
          <div 
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm"
            onClick={() => setShowEmailModal(false)}
          />
          
          <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-auto md:w-[500px] rounded-2xl bg-white shadow-2xl z-[10000] border border-gray-100">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-full flex items-center justify-center">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Unlock Ask BlocIQ</h2>
                    <p className="text-sm text-gray-600">Enter your email to start using our AI assistant</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Form */}
              <form onSubmit={handleEmailSubmit} className="space-y-6">
                {/* Email Input */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required
                    />
                  </div>
                </div>

                {/* Consent Checkbox */}
                <div className="flex items-start gap-3">
                  <input
                    id="consent"
                    type="checkbox"
                    checked={agreedToResearch}
                    onChange={(e) => setAgreedToResearch(e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="consent" className="text-sm text-gray-700 leading-relaxed">
                    I agree to my email and queries being used for product research
                  </label>
                </div>

                {/* Disclaimer */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-gray-600">
                      <p className="font-medium mb-1">Privacy & Data Protection</p>
                      <p>BlocIQ does not share or sell your data. View our{' '}
                        <a href="/privacy" className="text-blue-600 hover:text-blue-700 underline">
                          Privacy Policy
                        </a>.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !email.trim() || !agreedToResearch}
                  className="w-full bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:from-[#4338ca] hover:to-[#9333ea] disabled:from-gray-300 disabled:to-gray-400 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Unlocking...' : 'Unlock Ask BlocIQ'}
                </button>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Chat Widget Modal */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-full flex items-center justify-center">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Ask BlocIQ</h2>
                  <p className="text-sm text-gray-600">Your AI-powered property management assistant</p>
                </div>
              </div>
              <button
                onClick={() => setShowChat(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
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
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </div>
                        
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
            <div className="border-t border-gray-200 p-6">
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Main Input */}
                <div className="relative">
                  <textarea
                    ref={inputRef}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e as any);
                      }
                    }}
                    placeholder="Ask BlocIQ anything..."
                    className="w-full px-4 py-3 pr-20 bg-white border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 resize-none overflow-y-auto"
                    rows={1}
                    disabled={loading}
                    style={{ minHeight: '40px', maxHeight: '150px' }}
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
                  <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
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
            </div>
          </div>
        </div>
      )}
    </>
  );
}
