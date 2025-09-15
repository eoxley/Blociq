"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useSupabase } from '@/components/SupabaseProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Calendar, Loader2, Send, FileText, X, Check, Sparkles, File, FileText as FileTextIcon, Building2, AlertTriangle, Brain, Building, AlertCircle, CheckCircle, Clock } from 'lucide-react';

import { toast } from 'sonner';
import AIChatDisclaimer from '@/components/ui/AIChatDisclaimer';
import { SuggestedAction, DocumentAnalysis } from '@/types/ai';
import { LeaseAnalysisResponse } from '@/components/lease/LeaseAnalysisResponse';
import { LeaseDocumentParser, isLeaseDocument } from '@/lib/lease/LeaseDocumentParser';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  documentAnalysis?: DocumentAnalysis[]; // Keep for document search results
  type?: 'lease_analysis';
  leaseData?: any;
};

type BuildingSuggestedAction = {
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
  suggested_action?: BuildingSuggestedAction;
  context?: {
    majorWorksUsed?: boolean;
    complianceUsed?: boolean;
  };
  results?: DocumentAnalysis[]; // Added for document analysis results
};

interface AskBlocIQProps {
  buildingId?: string;
  buildingName?: string;
  context?: string;
  placeholder?: string;
  className?: string;
  preload?: string;
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
  className = "",
  preload
}: AskBlocIQProps) {
  const pathname = usePathname();
  const projectId = extractProjectId(pathname || '');
  const isMajorWorksContext = pathname?.includes('major-works') && projectId;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [documentResults, setDocumentResults] = useState<DocumentSearchResult[]>([]);
  const [isDocumentSearch, setIsDocumentSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [usedMajorWorksData, setUsedMajorWorksData] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { supabase } = useSupabase();
  
  useEffect(() => {
    const getSession = async () => {
      if (!supabase) return;
      // Safe destructuring to prevent "Right side of assignment cannot be destructured" error
      const sessionResult = await supabase.auth.getSession();
      const sessionData = sessionResult?.data || {}
      const session = sessionData.session || null
      setUserId(session?.user?.id ?? null);
    };
    getSession();
  }, [supabase]);

  // Auto-focus input field on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle preload functionality
  useEffect(() => {
    if (preload && userId) {
      const handlePreload = async () => {
        try {
          console.log('🔄 Preloading compliance summary...');
          const response = await fetch('/api/ask-ai/compliance-upcoming');
          const data = await response.json();
          
          if (data.summary) {
            // Add the preloaded message to the chat
            const preloadMessage: Message = {
              id: `preload-${Date.now()}`,
              type: 'assistant',
              content: data.summary,
              timestamp: new Date()
            };
            
            setMessages(prev => [...prev, preloadMessage]);
            console.log('✅ Compliance summary preloaded');
          } else {
            console.log('⚠️ No compliance summary available');
          }
        } catch (error) {
          console.error('❌ Error preloading compliance summary:', error);
        }
      };

      handlePreload();
    }
  }, [preload, userId]);

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


  const handleSuggestedPrompt = (prompt: string) => {
    setQuestion(prompt);
  };








  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      toast.error('Please enter a question.');
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
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setDocumentResults([]);
    setIsDocumentSearch(false);

    try {
      const finalPrompt = question.trim();

      // Send query to the ask-ai endpoint for document search and analysis
      const formData = new FormData();
      formData.append('userQuestion', finalPrompt);
      formData.append('useMemory', 'true');
      formData.append('buildingId', buildingId || 'null');

      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();

      if (data.response) {
        // Add assistant message to history
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          documentAnalysis: data.documentAnalyses
        };

        setMessages(prev => [...prev, assistantMessage]);
        setAnswer(data.response);

        // Handle document search results
        if (data.documentSearch && data.documents) {
          setDocumentResults(data.documents);
          setIsDocumentSearch(true);
        }

        // Log the interaction to ai_logs
        try {
          await supabase
            .from('ai_logs')
            .insert({
              user_id: userId,
              question: finalPrompt,
              response: data.response,
              timestamp: new Date().toISOString(),
              building_id: buildingId,
              document_search: data.documentSearch || false,
              documents_found: data.documents?.length || 0,
              files_uploaded: 0
            });
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
      setLoading(false);
      setQuestion('');
    }
  };



  const suggestedPrompts = getSuggestedPrompts(buildingName, !!isMajorWorksContext, projectId || undefined);

  // Helper function to format time
  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  };



  // Helper function to get building context display
  const getBuildingContext = () => {
    if (buildingName) {
      return {
        name: buildingName,
        type: "Property"
      };
    }
    return null;
  };

  const buildingContext = getBuildingContext();

  return (
    <div 
      style={{fontFamily: 'Inter, system-ui, sans-serif'}} 
      className={`h-full flex flex-col bg-white ${className}`}
    >
      
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-500 via-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              Ask BlocIQ
            </h2>
            <p className="text-sm text-gray-500 italic flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Sometimes BlocIQ can get things muddled - please verify important information
            </p>
          </div>
          
          {buildingContext && (
            <div className="text-right">
              <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Building className="w-4 h-4" />
                {buildingContext.name}
              </div>
              <div className="text-xs text-gray-500">{buildingContext.type}</div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 relative">

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-xl">
                <div className="w-20 h-20 bg-gradient-to-br from-teal-500 via-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-8">
                  <Brain className="w-10 h-10 text-white" />
                </div>
                
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                  {buildingContext ? `Ready to help with ${buildingContext.name}` : 'How can I help you today?'}
                </h3>
                <p className="text-gray-600 mb-8">
                  Ask about compliance requirements, search existing documents, or get insights about your property portfolio.
                </p>
                
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
            </div>
          ) : (
            messages.map((message) => {
              const isUser = message.role === 'user';
              const isAI = message.role === 'assistant';
              
              return (
                <div key={message.id} className={`flex items-start gap-4 ${isUser ? 'flex-row-reverse' : ''} group`}>
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                    isUser 
                      ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' 
                      : 'bg-gradient-to-br from-teal-500 via-blue-500 to-purple-600'
                  }`}>
                    {isUser ? (
                      <div className="w-5 h-5 bg-white bg-opacity-30 rounded-full"></div>
                    ) : (
                      <Brain className="w-5 h-5 text-white" />
                    )}
                  </div>

                  <div className={`flex-1 max-w-[85%] ${isUser ? 'text-right' : 'text-left'}`}>
                    {/* Building Context */}
                    {buildingContext && isUser && (
                      <div className="mb-2 inline-flex items-center gap-2 text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                        <Building className="w-3 h-3" />
                        {buildingContext.name}
                      </div>
                    )}

                    {/* Message Bubble or Lease Analysis */}
                    {message.type === 'lease_analysis' ? (
                      <LeaseAnalysisResponse 
                        leaseData={message.leaseData} 
                      />
                    ) : (
                      <div className={`relative inline-block px-5 py-3 rounded-2xl ${
                        isUser 
                          ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-tr-md' 
                          : 'bg-gray-100 text-gray-900 rounded-tl-md'
                      }`}>
                        
                        {/* Content with formatting */}
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {message.content?.split('\n').map((line, index) => {
                            if (!line || typeof line !== 'string') {
                              return <div key={index}></div>;
                            }
                            
                            if (line.startsWith('**') && line.endsWith('**')) {
                              return (
                                <h4 key={index} className={`font-semibold mt-3 mb-2 first:mt-0 ${
                                  isUser ? 'text-white' : 'text-gray-800'
                                }`}>
                                  {line.replace(/\*\*/g, '')}
                                </h4>
                              );
                            }
                            
                            if (line.startsWith('• ')) {
                              return (
                                <div key={index} className="ml-4 mb-1">
                                  {line}
                                </div>
                              );
                            }
                            
                            const processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                            
                            return (
                              <div key={index} className={index > 0 ? 'mt-2' : ''} dangerouslySetInnerHTML={{ __html: processedLine }} />
                            );
                          })}
                        </div>
                      </div>
                    )}


                    {/* Major Works Badge */}
                    {isAI && usedMajorWorksData && (
                      <div className="mt-3 flex items-center gap-2">
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium border border-blue-200">
                          <Building2 className="w-3 h-3" />
                          <span>Live major works data used</span>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}

                    {/* Timestamp */}
                    <div className={`mt-2 text-xs text-gray-500 ${isUser ? 'text-right' : 'text-left'}`}>
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing Indicator */}
          {loading && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 via-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-tl-md px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-sm text-gray-600">Analyzing...</span>
                </div>
              </div>
            </div>
          )}

          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Fixed at bottom of container */}
        <div className="border-t border-gray-200 bg-white absolute bottom-0 left-0 right-0 z-10">
          <div className="p-6">
            {/* Input Container - Better aligned with chat content */}
            <div className="flex items-end gap-3 max-w-4xl mx-auto">
            {/* Text Input - Centered and aligned with chat content */}
            <div className="flex-1 relative">
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
                placeholder={buildingContext ?
                  `Ask about ${buildingContext.name} or search existing documents...` :
                  placeholder || "Ask me anything about your properties, leases, or compliance..."
                }
                className="w-full px-5 py-4 pr-16 bg-white border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 resize-none shadow-sm"
                style={{ minHeight: '56px', maxHeight: '200px' }}
                rows={1}
              />
            </div>

            {/* Send Button */}
            <button
              onClick={handleSubmit}
              disabled={!question.trim()}
              className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                question.trim()
                  ? 'bg-gradient-to-r from-[#14b8a6] to-[#8b5cf6] text-white hover:shadow-lg transform hover:scale-105'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
            </div>
            
            {/* Status Bar - Centered and aligned */}
            <div className="flex items-center justify-between mt-4 text-xs text-gray-500 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                <span>AI Ready</span>
              </div>
              {buildingContext && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-2">
                    <Building className="w-3 h-3" />
                    <span>Building context active</span>
                  </div>
                </>
              )}
              <span>•</span>
              <span>GDPR Compliant</span>
            </div>
              <span className="text-gray-400">
                Press Enter to send • Shift+Enter for new line
              </span>
            </div>
          </div>
        </div>
      </div>

        {/* Simple OCR Test Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mx-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm">🔍</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-500 mb-2">Quick OCR Test</div>
              <div className="text-sm text-gray-600 mb-3">
                Test document text extraction. Upload a PDF to see the raw extracted text.
              </div>
              
            </div>
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
                      href="/compliance"
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                    >
                      🔗 View All in Compliance Overview
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
  );
} 