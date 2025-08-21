"use client";

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Calendar, Loader2, Send, Upload, FileText, X, Check, Sparkles, File, FileText as FileTextIcon, Building2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import CommunicationModal from './CommunicationModal';

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

type SuggestedAction = {
  type: 'todo';
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  due_date?: string | null;
  description?: string;
};

type DocumentSearchResult = {
  id: string;
  title: string;
  summary: string;
  doc_url: string;
  uploaded_at: string;
  expiry_date?: string;
};

type AIResponse = {
  success: boolean;
  response: string;
  documentSearch?: boolean;
  documents?: DocumentSearchResult[];
  suggested_action?: SuggestedAction;
  context?: {
    majorWorksUsed?: boolean;
    complianceUsed?: boolean;
  };
};

interface AskBlocIQProps {
  buildingId?: string;
  buildingName?: string;
  context?: string;
  placeholder?: string;
  className?: string;
}

// Extract project ID from pathname
const extractProjectId = (pathname: string): string | null => {
  const majorWorksMatch = pathname.match(/\/major-works\/([^\/]+)/);
  return majorWorksMatch ? majorWorksMatch[1] : null;
};

// Suggested prompts based on building context and major works
const getSuggestedPrompts = (buildingName?: string, isMajorWorksContext?: boolean, projectId?: string) => {
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
};

export default function AskBlocIQ({ 
  buildingId, 
  buildingName,
  context, 
  placeholder = "Ask BlocIQ anything...",
  className = ""
}: AskBlocIQProps) {
  const pathname = usePathname();
  const projectId = extractProjectId(pathname || '');
  const isMajorWorksContext = pathname?.includes('major-works') && projectId;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [suggestedAction, setSuggestedAction] = useState<SuggestedAction | null>(null);
  const [documentResults, setDocumentResults] = useState<DocumentSearchResult[]>([]);
  const [isDocumentSearch, setIsDocumentSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addingToTodo, setAddingToTodo] = useState(false);
  const [addingToCalendar, setAddingToCalendar] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [usedMajorWorksData, setUsedMajorWorksData] = useState(false);
  const [showCommunicationModal, setShowCommunicationModal] = useState(false);
  const [communicationModalData, setCommunicationModalData] = useState<{
    aiContent: string;
    templateType: 'letter' | 'email' | 'notice';
    buildingName: string;
    leaseholderName?: string | null;
    unitNumber?: string | null;
  } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // File handling
  const acceptedFileTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
  const maxFileSize = 10 * 1024 * 1024; // 10MB
  const maxFiles = 5;

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id ?? null);
    };
    getSession();
  }, []);

  // Auto-focus input field on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-resize textarea with improved functionality
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      
      // Calculate new height with better constraints
      const scrollHeight = textarea.scrollHeight;
      const minHeight = 56; // Increased from 40px for better visual balance
      const maxHeight = 200; // Increased from 150px for more typing space
      
      // Smooth height transition
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      
      // Apply height with smooth transition
      textarea.style.height = `${newHeight}px`;
      
      // Show scrollbar only when needed
      if (scrollHeight > maxHeight) {
        textarea.style.overflowY = 'auto';
      } else {
        textarea.style.overflowY = 'hidden';
      }
    }
  }, [question]);

  // Enhanced auto-resize on input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuestion(e.target.value);
    
    // Immediate resize for better responsiveness
    const textarea = e.target;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const minHeight = 56;
    const maxHeight = 200;
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
  };

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const getFileIconComponent = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileTextIcon className="h-4 w-4 text-red-500" />;
    if (fileType.includes('word') || fileType.includes('document')) return <FileTextIcon className="h-4 w-4 text-blue-500" />;
    if (fileType.includes('text')) return <FileTextIcon className="h-4 w-4 text-gray-500" />;
    return <File className="h-4 w-4 text-gray-500" />;
  };

  const cleanFileName = (fileName: string) => {
    return fileName.replace(/\.[^/.]+$/, "");
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setQuestion(prompt);
  };

  // Communication action handlers
  const handleCreateLetter = (aiContent: string) => {
    // Extract building and leaseholder context if available
    const contextMessage = messages.find(m => 
      m.role === 'assistant' && m.content.includes('📌 Building:')
    )?.content || ''
    
    const buildingMatch = contextMessage.match(/📌 Building: (.+)/)
    const extractedBuildingName = buildingMatch ? buildingMatch[1] : buildingName || 'General'
    
    const leaseholderMatch = contextMessage.match(/👤 Leaseholder: (.+)/)
    const leaseholderName = leaseholderMatch ? leaseholderMatch[1] : null
    
    const unitMatch = contextMessage.match(/🏠 Unit: (.+)/)
    const unitNumber = unitMatch ? unitMatch[1] : null
    
    setCommunicationModalData({
      aiContent,
      templateType: 'letter',
      buildingName: extractedBuildingName,
      leaseholderName,
      unitNumber
    })
    setShowCommunicationModal(true)
  }

  const handleSendEmail = (aiContent: string) => {
    // Extract building and leaseholder context
    const contextMessage = messages.find(m => 
      m.role === 'assistant' && m.content.includes('📌 Building:')
    )?.content || ''
    
    const buildingMatch = contextMessage.match(/📌 Building: (.+)/)
    const extractedBuildingName = buildingMatch ? buildingMatch[1] : buildingName || 'General'
    
    const leaseholderMatch = contextMessage.match(/👤 Leaseholder: (.+)/)
    const leaseholderName = leaseholderMatch ? leaseholderMatch[1] : null
    
    const unitMatch = contextMessage.match(/🏠 Unit: (.+)/)
    const unitNumber = unitMatch ? unitMatch[1] : null
    
    setCommunicationModalData({
      aiContent,
      templateType: 'email',
      buildingName: extractedBuildingName,
      leaseholderName,
      unitNumber
    })
    setShowCommunicationModal(true)
  }

  const handleSaveAsNotice = (aiContent: string) => {
    // Extract building and leaseholder context
    const contextMessage = messages.find(m => 
      m.role === 'assistant' && m.content.includes('📌 Building:')
    )?.content || ''
    
    const buildingMatch = contextMessage.match(/📌 Building: (.+)/)
    const extractedBuildingName = buildingMatch ? buildingMatch[1] : buildingName || 'General'
    
    const leaseholderMatch = contextMessage.match(/👤 Leaseholder: (.+)/)
    const leaseholderName = leaseholderMatch ? leaseholderMatch[1] : null
    
    const unitMatch = contextMessage.match(/🏠 Unit: (.+)/)
    const unitNumber = unitMatch ? unitMatch[1] : null
    
    setCommunicationModalData({
      aiContent,
      templateType: 'notice',
      buildingName: extractedBuildingName,
      leaseholderName,
      unitNumber
    })
    setShowCommunicationModal(true)
  }

  const handleSaveTemplate = async (template: any) => {
    try {
      // Save to communication templates
      const { data, error } = await supabase
        .from('communication_templates')
        .insert(template)
        .select()
        .single()

      if (error) throw error

      toast.success(`${template.template_type.charAt(0).toUpperCase() + template.template_type.slice(1)} template saved!`)
      
      // Log the action
      await supabase
        .from('communications_log')
        .insert({
          action_type: `create_${template.template_type}`,
          template_id: data.id,
          building_name: template.building_name,
          created_from_ai: true,
          ai_content: template.content.substring(0, 500)
        })

    } catch (error) {
      console.error('Error saving template:', error)
      toast.error('Failed to save template')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() && uploadedFiles.length === 0) {
      toast.error('Please enter a question or upload a file.');
      return;
    }
    if (!userId) {
      toast.error('User not authenticated. Please log in.');
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
    setSuggestedAction(null);
    setDocumentResults([]);
    setIsDocumentSearch(false);
    
    try {
      // Create FormData if files are uploaded
      let requestBody: FormData | string;
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (uploadedFiles.length > 0) {
        const formData = new FormData();
        formData.append('prompt', question.trim());
        formData.append('building_id', buildingId || 'null');
        
        uploadedFiles.forEach((uploadedFile) => {
          formData.append(`file`, uploadedFile.file);
          formData.append(`fileName`, uploadedFile.name);
        });
        
        requestBody = formData;
        delete headers['Content-Type'];
      } else {
        requestBody = JSON.stringify({
          prompt: question.trim(),
          building_id: buildingId,
          contextType: isMajorWorksContext ? 'major_works' : 'general',
          projectId: isMajorWorksContext ? projectId : undefined,
        });
      }

      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers,
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
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
        setAnswer(data.response);
        
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
          await supabase
            .from('ai_logs')
            .insert({
              user_id: userId,
              question: question.trim(),
              response: data.response,
              timestamp: new Date().toISOString(),
              building_id: buildingId,
              document_search: data.documentSearch || false,
              documents_found: data.documents?.length || 0
            });
        } catch (logError) {
          console.error('Failed to log AI interaction:', logError);
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

  const suggestedPrompts = getSuggestedPrompts(buildingName, !!isMajorWorksContext, projectId || undefined);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Chat Messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to BlocIQ Assistant</h3>
            <p className="text-gray-600 mb-6">Ask me anything about your properties, compliance, or upload documents for analysis.</p>
            
            {/* Suggested Prompts */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Try asking:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestedPrompts.slice(0, 3).map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedPrompt(prompt)}
                    className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm border border-blue-200"
                  >
                    {prompt}
                  </button>
                ))}
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
                  
                  {/* Major Works Badge */}
                  {message.role === 'assistant' && usedMajorWorksData && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium border border-blue-200">
                        <Building2 className="w-3 h-3" />
                        <span>Live major works data used</span>
                      </div>
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
      <div className="border-t border-gray-200 bg-gradient-to-b from-gray-50 to-white">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Main Input */}
            <div className="relative group">
              <textarea
                ref={inputRef}
                value={question}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as any);
                  }
                }}
                placeholder={placeholder || "Ask BlocIQ anything about your building, compliance, or upload documents..."}
                className="w-full px-5 py-4 pr-24 bg-white border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 text-gray-900 placeholder-gray-400 resize-none overflow-hidden shadow-sm hover:border-gray-300 group-hover:shadow-md"
                rows={1}
                disabled={loading}
                style={{ minHeight: '56px', maxHeight: '200px' }}
              />
              
              {/* Send Button */}
              <button
                type="submit"
                disabled={loading || (!question.trim() && uploadedFiles.length === 0)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl transition-all duration-200 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-95"
                title="Send with BlocIQ"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Enhanced Upload Area */}
            <div className="flex items-center justify-center">
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-blue-600 transition-all duration-200 rounded-xl hover:bg-blue-50 border border-gray-200 hover:border-blue-200"
                  title="Upload document to Ask BlocIQ"
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-sm font-medium">Upload Document</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                />
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Document Search Results */}
      {isDocumentSearch && documentResults.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mx-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm">📄</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-500 mb-2">Document Search Results</div>
              <div className="space-y-3">
                {documentResults.map((doc, index) => (
                  <div key={doc.id} className="bg-gray-50 p-3 rounded-md border border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">{doc.title}</h4>
                        {doc.summary && (
                          <p className="text-sm text-gray-600 mb-2">{doc.summary}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>📅 {new Date(doc.uploaded_at).toLocaleDateString('en-GB')}</span>
                          {doc.expiry_date && (
                            <span>⏰ Expires: {new Date(doc.expiry_date).toLocaleDateString('en-GB')}</span>
                          )}
                        </div>
                      </div>
                      <a
                        href={doc.doc_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-3 px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1"
                      >
                        📎 View
                      </a>
                    </div>
                  </div>
                ))}
              </div>
              {buildingId && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <a
                    href={`/buildings/${buildingId}/compliance`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                  >
                    🔗 View All in Compliance Tracker
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Suggested Action Panel */}
      {suggestedAction && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mx-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm">🧠</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-500 mb-2">BlocIQ Suggests</div>
              <p className="text-gray-800 mb-2 font-medium">{suggestedAction.title}</p>
              {suggestedAction.description && (
                <p className="text-sm text-gray-600 mb-3">{suggestedAction.description}</p>
              )}
              {suggestedAction.due_date && (
                <p className="text-sm text-gray-600 mb-3">
                  📅 Due: {new Date(suggestedAction.due_date).toLocaleDateString()}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleAddToTodo}
                  disabled={addingToTodo}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {addingToTodo ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                  {addingToTodo ? 'Adding...' : 'Add to To-Do'}
                </button>
                <button
                  onClick={handleAddToOutlook}
                  disabled={addingToCalendar}
                  className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
                >
                  {addingToCalendar ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Calendar className="h-3 w-3" />
                  )}
                  {addingToCalendar ? 'Adding...' : 'Add to Calendar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Communication Modal */}
      {showCommunicationModal && communicationModalData && (
        <CommunicationModal
          isOpen={showCommunicationModal}
          onClose={() => {
            setShowCommunicationModal(false)
            setCommunicationModalData(null)
          }}
          aiContent={communicationModalData.aiContent}
          templateType={communicationModalData.templateType}
          buildingName={communicationModalData.buildingName}
          leaseholderName={communicationModalData.leaseholderName}
          unitNumber={communicationModalData.unitNumber}
          onSave={handleSaveTemplate}
        />
      )}
    </div>
  );
} 