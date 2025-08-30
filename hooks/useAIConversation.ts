import { useState, useCallback, useEffect } from 'react';
import { processFileWithOCR } from '@/lib/utils/processFileWithOCR';
import { analyzeDocument, ComprehensiveDocumentAnalysis } from '../lib/document-analysis-orchestrator';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  files?: File[];
  ocrStatus?: 'processing' | 'completed' | 'failed';
  ocrText?: string;
  documentAnalysis?: ComprehensiveDocumentAnalysis;
  isProcessingOCR?: boolean;
}

interface MemoryContext {
  rollingSummary: boolean;
  factsUsed: number;
  recentTurns: number;
}

interface UseAIConversationReturn {
  messages: Message[];
  conversationId: string | null;
  useMemory: boolean;
  isLoading: boolean;
  isProcessingOCR: boolean;
  memoryContext: MemoryContext | null;
  sendMessage: (content: string, files?: File[]) => Promise<void>;
  startNewThread: () => void;
  setUseMemory: (use: boolean) => void;
  clearMessages: () => void;
}

// OCR processing is now handled by the lib/ocr-integration module

export function useAIConversation(): UseAIConversationReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [useMemory, setUseMemory] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [memoryContext, setMemoryContext] = useState<MemoryContext | null>(null);

  // Load conversation from localStorage on mount
  useEffect(() => {
    const savedConversationId = localStorage.getItem('ai_conversation_id');
    if (savedConversationId) {
      setConversationId(savedConversationId);
    }
  }, []);

  // Save conversation ID to localStorage
  useEffect(() => {
    if (conversationId) {
      localStorage.setItem('ai_conversation_id', conversationId);
    } else {
      localStorage.removeItem('ai_conversation_id');
    }
  }, [conversationId]);

  const sendMessage = useCallback(async (content: string, files: File[] = []) => {
    if (!content.trim() && files.length === 0) return;

    setIsLoading(true);
    
    // Create user message with files
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      files: files.length > 0 ? files : undefined,
      ocrStatus: files.length > 0 ? 'processing' : undefined
    };
    
    setMessages(prev => [...prev, userMessage]);

    try {
      if (files.length > 0) {
        setIsProcessingOCR(true);
        
        // Process files through OCR and document analysis
        let enhancedContent = content.trim();
        let allOcrText = '';
        let documentAnalyses: ComprehensiveDocumentAnalysis[] = [];
        
        // Process files through OCR and document analysis using the utility module
        const ocrResults = await Promise.all(
          files.map(file => processFileWithOCR(file))
        );
        
        // Build enhanced content from OCR results and document analysis
        for (let i = 0; i < files.length; i++) {
          const file = files.length > 0 ? files[i] : null;
          const ocrResult = ocrResults[i];
          
          if (file && ocrResult.success) {
            allOcrText += `\n\n--- ${file.name} ---\n${ocrResult.text}\n`;
            
            // Perform comprehensive document analysis
            try {
              const analysis = await analyzeDocument(ocrResult.text, file.name, content.trim());
              documentAnalyses.push(analysis);
              
              // Use the AI prompt from document analysis
              enhancedContent = analysis.aiPrompt;
              console.log('🔍 Document analysis AI prompt:', {
                filename: file.name,
                promptLength: analysis.aiPrompt?.length || 0,
                hasExtractedText: !!analysis.extractedText,
                extractedTextLength: analysis.extractedText?.length || 0
              });
            } catch (analysisError) {
              console.error('Document analysis failed:', analysisError);
              // Fallback to basic OCR text
              enhancedContent += `\n\nDocument: ${file.name}\nExtracted Text: ${ocrResult.text.substring(0, 2000)}${ocrResult.text.length > 2000 ? '...' : ''}`;
            }
          } else if (file) {
            enhancedContent += `\n\nDocument: ${file.name}\nOCR Processing Failed: ${ocrResult.error}`;
          }
        }

        // Update user message with OCR results and document analysis
        setMessages(prev => prev.map(msg => 
          msg.id === userMessage.id 
            ? { 
                ...msg, 
                ocrStatus: 'completed', 
                ocrText: allOcrText,
                documentAnalysis: documentAnalyses.length > 0 ? documentAnalyses[0] : undefined
              }
            : msg
        ));
        
        setIsProcessingOCR(false);

        // Handle file uploads using enhanced ask-ai endpoint with OCR integration
        const formData = new FormData();
        formData.append('userQuestion', enhancedContent);
        formData.append('useMemory', useMemory.toString());
        if (conversationId) formData.append('conversationId', conversationId);
        
        // Add building ID if available (this should come from context)
        // For now, we'll use null as the building ID will be determined by the endpoint
        if (buildingId) {
          formData.append('buildingId', buildingId);
        } else {
          formData.append('buildingId', 'null');
        }
        
        files.forEach((file, index) => {
          formData.append(`file_${index}`, file);
        });

        const response = await fetch('/api/ask-ai', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        console.log('📤 Received API response:', {
          hasResponse: !!data.response,
          responseLength: data.response?.length || 0,
          isLeaseSummary: data.isLeaseSummary,
          hasLeaseDocumentInfo: !!data.leaseDocumentInfo,
          responsePreview: data.response?.substring(0, 200) + '...'
        });
        
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response || data.result || data.answer || 'No response received',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        
        if (data.conversationId && !conversationId) {
          setConversationId(data.conversationId);
        }
      } else {
        // Use the new document-aware AI endpoint for text-only queries
        const response = await fetch('/api/ask-ai-document-aware', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: content.trim(),
            buildingId: null, // Will be determined by context
            documentIds: [], // Will search for relevant documents
            conversationId: conversationId || undefined
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response || 'No response received',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        
        if (data.conversationId && !conversationId) {
          setConversationId(data.conversationId);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error while processing your message. Please try again.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsProcessingOCR(false);
    }
  }, [conversationId, useMemory]);

  const startNewThread = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setMemoryContext(null);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    conversationId,
    useMemory,
    isLoading,
    isProcessingOCR,
    memoryContext,
    sendMessage,
    startNewThread,
    setUseMemory,
    clearMessages
  };
}
