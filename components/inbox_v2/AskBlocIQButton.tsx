"use client"

import React, { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Brain, X, MessageSquare, Upload, Send, Sparkles, Zap, Plus, Calendar, Loader2, FileText, CheckCircle, Building2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { SuggestedAction as AISuggestedAction, DocumentAnalysis } from '@/types/ai';

interface AskBlocIQButtonProps {
  selectedMessage?: any;
  className?: string;
  buildingId?: string;
  buildingName?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  files?: UploadedFile[];
  documentAnalysis?: DocumentAnalysis[];
}

interface UploadedFile {
  file: File;
  id: string;
  name: string;
  size: number;
  type: string;
  extractionMethod?: 'ocr' | 'enhanced' | 'standard';
}

interface SuggestedAction {
  type: 'todo';
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  due_date?: string | null;
  description?: string;
}

interface DocumentSearchResult {
  id: string;
  title: string;
  summary: string;
  doc_url: string;
  uploaded_at: string;
  expiry_date?: string;
}

interface AIResponse {
  success: boolean;
  response: string;
  documentSearch?: boolean;
  documents?: DocumentSearchResult[];
  suggested_action?: SuggestedAction;
  context?: {
    majorWorksUsed?: boolean;
    complianceUsed?: boolean;
  };
}

export default function AskBlocIQButton({ selectedMessage, className = "", buildingId, buildingName }: AskBlocIQButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [suggestedAction, setSuggestedAction] = useState<SuggestedAction | null>(null);
  const [documentResults, setDocumentResults] = useState<DocumentSearchResult[]>([]);
  const [isDocumentSearch, setIsDocumentSearch] = useState(false);
  const [usedMajorWorksData, setUsedMajorWorksData] = useState(false);
  const [addingToTodo, setAddingToTodo] = useState(false);
  const [addingToCalendar, setAddingToCalendar] = useState(false);
  
  const pathname = usePathname();
  const projectId = extractProjectId(pathname || '');
  const isMajorWorksContext = pathname?.includes('major-works') && projectId;
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Extract project ID from pathname
  function extractProjectId(pathname: string): string | null {
    const majorWorksMatch = pathname.match(/\/major-works\/([^\/]+)/);
    return majorWorksMatch ? majorWorksMatch[1] : null;
  }

  // Suggested prompts based on building context and major works
  function getSuggestedPrompts(buildingName?: string, isMajorWorksContext?: boolean, projectId?: string) {
    if (isMajorWorksContext && projectId) {
      return [
        "Generate a Section 20 notice for this project",
        "Summarise this Major Works Project",
        "What's the current project timeline?",
        "Show me all project documents",
        "What are the next milestones?",
        "Calculate the cost breakdown",
        "Generate a project status report"
      ];
    }

    const basePrompts = [
      "What are the overdue tasks?",
      "Summarise the last fire inspection",
      "What's the next EICR due?",
      "Show me recent compliance alerts",
      "What maintenance is scheduled this month?"
    ];

    if (buildingName) {
      return [
        `What are the overdue tasks for ${buildingName}?`,
        `Summarise the last fire inspection for ${buildingName}`,
        `What's the next EICR due for ${buildingName}?`,
        `Show me recent compliance alerts for ${buildingName}`,
        `What maintenance is scheduled for ${buildingName} this month?`
      ];
    }

    return basePrompts;
  }

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  // Handle add to todo
  const handleAddToTodo = async () => {
    if (!suggestedAction || !buildingId) return;
    
    setAddingToTodo(true);
    try {
      const response = await fetch('/api/create-task-from-suggestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suggestedAction,
          buildingId: parseInt(buildingId)
        }),
      });

      if (response.ok) {
        setSuggestedAction(null);
        toast.success('✅ Task added to your building to-do list!');
      } else {
        toast.error('Failed to create task');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    } finally {
      setAddingToTodo(false);
    }
  };

  // Handle add to Outlook calendar
  const handleAddToOutlook = async () => {
    if (!suggestedAction) return;
    
    setAddingToCalendar(true);
    try {
      const response = await fetch('/api/add-to-calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: suggestedAction.title,
          date: suggestedAction.due_date,
          building: buildingName || 'Building'
        }),
      });

      if (response.ok) {
        setSuggestedAction(null);
        toast.success('📅 Event added to your Outlook calendar!');
      } else {
        toast.error('Failed to add to calendar');
      }
    } catch (error) {
      console.error('Error adding to calendar:', error);
      toast.error('Failed to add to calendar');
    } finally {
      setAddingToCalendar(false);
    }
  };

  // Handle suggested prompt click
  const handleSuggestedPrompt = (prompt: string) => {
    setQuestion(prompt);
  };

  // Handle create letter
  const handleCreateLetter = (aiContent: string) => {
    toast.info('Letter creation feature available for BlocIQ clients. Contact us to learn more!');
  };

  // Handle send email
  const handleSendEmail = (aiContent: string) => {
    toast.info('Email sending feature available for BlocIQ clients. Contact us to learn more!');
  };

  // Handle save as notice
  const handleSaveAsNotice = (aiContent: string) => {
    toast.info('Notice saving feature available for BlocIQ clients. Contact us to learn more!');
  };

  // Get file icon
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('text')) return '📄';
    return '📎';
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
    setIsLoading(true);
    setSuggestedAction(null);
    setDocumentResults([]);
    setIsDocumentSearch(false);
    
    try {
      let finalPrompt = question.trim();
      const uploadedFileResults: any[] = [];

      // Handle file uploads first if any files are present
      if (uploadedFiles.length > 0) {
        // Process each file through comprehensive document analysis
        for (const uploadedFile of uploadedFiles) {
          try {
            console.log('🔄 Processing file through comprehensive analysis:', uploadedFile.name, 'Type:', uploadedFile.file.type);
            
            // Convert file to base64 for analysis
            const base64Data = await fileToBase64(uploadedFile.file);
            console.log('✅ File converted to base64, length:', base64Data.length);
            
            // Process through comprehensive document analysis endpoint
            const analysisResponse = await fetch('/api/documents/analyze-comprehensive', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                file: base64Data,
                fileName: uploadedFile.name,
                buildingId: buildingId
              }),
            });

            if (!analysisResponse.ok) {
              const errorText = await analysisResponse.text();
              console.error('❌ Comprehensive analysis failed:', analysisResponse.status, errorText);
              throw new Error(`Document analysis failed: ${analysisResponse.status}`);
            }

            const analysisResult = await analysisResponse.json();
            console.log('✅ Comprehensive analysis successful:', analysisResult);
            
            if (analysisResult.success) {
              // Create structured document analysis result
              const documentAnalysis: DocumentAnalysis = {
                filename: uploadedFile.name,
                summary: analysisResult.analysis.summary || 'Document analyzed successfully',
                suggestedActions: analysisResult.suggestedActions || [],
                extractionMethod: 'comprehensive_analysis',
                extractedText: analysisResult.extractedText,
                documentType: analysisResult.documentType
              };
              
              uploadedFileResults.push(documentAnalysis);

              // Add comprehensive analysis to the prompt
              if (!finalPrompt) {
                finalPrompt = `Please analyze the uploaded document: ${uploadedFile.name}`;
              }
              finalPrompt += `\n\nDocument: ${uploadedFile.name}\nType: ${analysisResult.documentType}\nSummary: ${analysisResult.analysis.summary}\n\nPlease provide insights and answer any specific questions about this document.`;
              
              // Add document analysis to messages for display
              const analysisMessage: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: `📄 **${uploadedFile.name}** analyzed successfully!\n\n**Document Type:** ${analysisResult.documentType}\n**Summary:** ${analysisResult.analysis.summary}`,
                timestamp: new Date(),
                documentAnalysis: [documentAnalysis]
              };
              
              setMessages(prev => [...prev, analysisMessage]);
            } else {
              throw new Error('Document analysis failed');
            }
          } catch (uploadError) {
            console.error(`Error processing ${uploadedFile.name}:`, uploadError);
            toast.error(`Failed to process ${uploadedFile.name}: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
          }
        }
      }

      // Now send the enhanced prompt to the main ask-ai endpoint
      const requestBody = JSON.stringify({
        prompt: finalPrompt,
        building_id: buildingId,
        contextType: isMajorWorksContext ? 'major_works' : 'general',
        projectId: isMajorWorksContext ? projectId : undefined,
        uploadedFiles: uploadedFileResults
      });

      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data: AIResponse = await response.json();
      
      if (data.success && data.response) {
        // Check if Major Works data was used
        setUsedMajorWorksData(data.context?.majorWorksUsed || false);
        
        // Add assistant message to history
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          documentAnalysis: uploadedFileResults.length > 0 ? uploadedFileResults : undefined
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        // Handle document search results
        if (data.documentSearch && data.documents) {
          setIsDocumentSearch(true);
          setDocumentResults(data.documents);
        }
        
        // Check if there's a suggested action
        if (data.suggested_action) {
          setSuggestedAction(data.suggested_action);
        }

        // Log the interaction to ai_logs
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from('ai_logs')
              .insert({
                user_id: user.id,
                question: finalPrompt,
                response: data.response,
                timestamp: new Date().toISOString(),
                building_id: buildingId,
                document_search: data.documentSearch || false,
                documents_found: data.documents?.length || 0,
                files_uploaded: uploadedFiles.length
              });
          }
        } catch (logError) {
          console.error('Failed to log AI interaction:', logError);
        }
      } else {
        toast.error('Error: No response from AI service');
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast.error('Error: Failed to connect to AI service. Please check your internet connection and try again.');
    } finally {
      setIsLoading(false);
      setQuestion('');
      setUploadedFiles([]);
    }
  };

  // Handle file upload
  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    
    const newFiles = Array.from(files).map(file => ({
      id: Date.now().toString() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      file: file
    }));
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  // Remove file
  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle drag and drop
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
    handleFileUpload(e.dataTransfer.files);
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <>
      {/* Enhanced Floating Button with Pulsating Brain */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-[#4f46e5] via-[#7c3aed] to-[#a855f7] text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 z-50 group ${className}`}
        title="Ask BlocIQ AI Assistant"
      >
        {/* Pulsating Brain Icon */}
        <div className="relative w-full h-full flex items-center justify-center">
          <Brain className="h-8 w-8 mx-auto animate-pulse group-hover:animate-none transition-all duration-300" />
          
          {/* Pulsating Ring Effect */}
          <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping"></div>
          <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-pulse"></div>
          
          {/* Sparkle Effects */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-bounce opacity-80"></div>
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-cyan-400 rounded-full animate-bounce opacity-80" style={{ animationDelay: '0.5s' }}></div>
        </div>
      </button>

      {/* Enhanced Modal with Full BlocIQ Functionality */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-100 overflow-hidden">
            {/* Enhanced Header with Gradient */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[#4f46e5] via-[#7c3aed] to-[#a855f7] opacity-10"></div>
              <div className="relative flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-r from-[#4f46e5] via-[#7c3aed] to-[#a855f7] rounded-2xl flex items-center justify-center shadow-lg">
                      <Brain className="h-7 w-7 text-white" />
                    </div>
                    {/* Floating sparkles around the brain */}
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full animate-pulse"></div>
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-[#4f46e5] to-[#a855f7] bg-clip-text text-transparent">
                      Ask BlocIQ
                    </h2>
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      AI-powered property management assistant
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-110"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Suggested Prompts */}
            {messages.length === 0 && (
              <div className="p-4 border-b border-gray-200 bg-gray-50/50">
                <p className="text-sm font-medium text-gray-700 mb-3">💡 Suggested prompts:</p>
                <div className="flex flex-wrap gap-2">
                  {getSuggestedPrompts(buildingName, isMajorWorksContext, projectId).slice(0, 4).map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestedPrompt(prompt)}
                      className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Enhanced Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-96 bg-gradient-to-b from-gray-50/50 to-white">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <div className="relative mb-6">
                    <MessageSquare className="h-16 w-16 mx-auto text-gray-300" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] rounded-full flex items-center justify-center">
                      <Zap className="h-3 w-3 text-white" />
                    </div>
                  </div>
                  <p className="text-lg font-medium text-gray-700 mb-2">Start a conversation with BlocIQ AI</p>
                  <p className="text-sm text-gray-500">Ask questions, get insights, or analyze your documents</p>
                  {selectedMessage && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700">
                        <span className="font-medium">Context:</span> Email from {selectedMessage.from?.emailAddress?.address}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] text-white'
                          : 'bg-white border border-gray-200 text-gray-900'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      
                      {/* Action Buttons for AI Responses */}
                      {message.role === 'assistant' && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                          <button
                            onClick={() => handleCreateLetter(message.content)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                          >
                            📝 Create Letter
                          </button>
                          <button
                            onClick={() => handleSendEmail(message.content)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                          >
                            📨 Send Email
                          </button>
                          <button
                            onClick={() => handleSaveAsNotice(message.content)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                          >
                            📄 Save as Notice
                          </button>
                        </div>
                      )}
                      
                      {/* Document Analysis Results */}
                      {message.role === 'assistant' && message.documentAnalysis && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                          <h4 className="font-semibold text-sm mb-2 text-gray-800">
                            📊 Document Analysis Results
                          </h4>
                          <div className="space-y-2 text-sm">
                            {message.documentAnalysis.map((analysis, index) => (
                              <div key={index} className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-sm font-medium text-gray-900 mb-1">
                                  📄 {analysis.filename}
                                </p>
                                <p className="text-xs text-gray-600 mb-2">
                                  {analysis.summary}
                                </p>
                                {analysis.suggestedActions && analysis.suggestedActions.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {analysis.suggestedActions.map((action: any, actionIndex: number) => (
                                      <span
                                        key={actionIndex}
                                        className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                                      >
                                        {typeof action === 'string'
                                          ? action
                                          : action?.label || action?.key || JSON.stringify(action)}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Suggested Action Panel */}
                      {message.role === 'assistant' && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <h4 className="font-semibold text-sm mb-2 text-blue-800">
                            💡 Suggested Actions
                          </h4>
                          <div className="flex gap-2">
                            <button
                              onClick={() => toast.info('Add to To-Do feature available for BlocIQ clients')}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            >
                              ✅ Add to To-Do
                            </button>
                            <button
                              onClick={() => toast.info('Add to Calendar feature available for BlocIQ clients')}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                            >
                              📅 Add to Calendar
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Files */}
                      {message.files && message.files.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {message.files.map((file, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <span>{getFileIcon(file.type)}</span>
                              <span className="truncate">{file.name}</span>
                              <span className="text-xs opacity-70">({formatFileSize(file.size)})</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className={`text-xs mt-2 opacity-70 ${message.role === 'user' ? 'text-white/80' : 'text-gray-500'}`}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-[#4f46e5] rounded-full animate-spin"></div>
                      </div>
                      <span className="text-sm text-gray-600">BlocIQ is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Enhanced Input Form */}
            <div className="p-6 border-t border-gray-200 bg-gray-50/50">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Enhanced File Upload Area */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Upload className="h-4 w-4 text-[#4f46e5]" />
                      Uploaded Files:
                    </p>
                    <div className="space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                          <span className="text-sm text-gray-600 font-medium">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Enhanced File Upload */}
                <div
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-300 ${
                    isDragOver 
                      ? 'border-[#4f46e5] bg-blue-50/50 shadow-lg' 
                      : 'border-gray-300 hover:border-[#4f46e5] hover:bg-blue-50/30'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-2">
                    Drag and drop files here, or{' '}
                    <label className="text-[#4f46e5] hover:text-[#4338ca] cursor-pointer font-medium">
                      browse
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFileUpload(e.target.files)}
                        accept=".pdf,.doc,.docx,.txt,.jpeg,.jpg,.png,.gif,.bmp,.tiff,.webp"
                      />
                    </label>
                  </p>
                  <p className="text-xs text-gray-500">Supports PDF, Word, text, and image files</p>
                </div>

                {/* Enhanced Question Input */}
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <textarea
                      ref={inputRef}
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask BlocIQ anything about your building, compliance, or upload documents..."
                      className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent shadow-sm transition-all duration-200 resize-none"
                      rows={1}
                      disabled={isLoading}
                      style={{ minHeight: '48px', maxHeight: '120px' }}
                    />
                    {question && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Sparkles className="h-4 w-4 text-purple-400" />
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || (!question.trim() && uploadedFiles.length === 0)}
                    className="px-8 py-3 bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] text-white rounded-xl hover:from-[#4338ca] hover:to-[#6d28d9] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Send className="h-4 w-4" />
                    Ask
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
