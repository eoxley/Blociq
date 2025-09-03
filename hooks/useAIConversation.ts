import { useState, useCallback, useEffect } from 'react';
import { processFileWithOCR } from '@/lib/simple-ocr';
import { LeaseDocumentParser, isLeaseDocument } from '@/lib/lease/LeaseDocumentParser';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  files?: File[];
  ocrStatus?: 'processing' | 'completed' | 'failed';
  ocrText?: string;
  isProcessingOCR?: boolean;
  type?: 'text' | 'lease_analysis';
  leaseData?: any;
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
        
        // Process each file through OCR
        const ocrResults = await Promise.all(
          files.map(file => processFileWithOCR(file))
        );
        
        // Add OCR text to the message
        const ocrText = ocrResults.map(r => r.text).join('\n\n');
        
        // Check if any file is a lease document
        const leaseFiles = files.filter((file, index) => 
          isLeaseDocument(file.name, ocrResults[index]?.text || '')
        );
        
        if (leaseFiles.length > 0) {
          // Process as lease document
          const leaseFile = leaseFiles[0]; // Use first lease file
          const leaseOcrResult = ocrResults[files.indexOf(leaseFile)];
          const parser = new LeaseDocumentParser(leaseOcrResult.text, leaseFile.name);
          const leaseAnalysis = parser.parse();
          
          // Create lease analysis message
          const leaseMessage: Message = {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: 'I\'ve analyzed your lease document and extracted key information.',
            timestamp: new Date(),
            type: 'lease_analysis',
            leaseData: leaseAnalysis
          };
          
          // Update user message and add lease analysis
          userMessage.ocrText = ocrText;
          userMessage.ocrStatus = 'completed';
          setMessages(prev => prev.map(msg => 
            msg.id === userMessage.id ? userMessage : msg
          ).concat([leaseMessage]));
          
          setIsProcessingOCR(false);
          return; // Skip regular AI processing for lease documents
        }
        
        const enhancedMessage = `${content.trim()}\n\nExtracted from uploaded documents:\n${ocrText}`;
        
        // Update user message with OCR text
        userMessage.ocrText = ocrText;
        userMessage.ocrStatus = 'completed';
        setMessages(prev => prev.map(msg => 
          msg.id === userMessage.id ? userMessage : msg
        ));
            



        
        setIsProcessingOCR(false);

        // Send enhanced message to AI
        const formData = new FormData();
        formData.append('userQuestion', enhancedMessage);
        formData.append('useMemory', useMemory.toString());
        if (conversationId) formData.append('conversationId', conversationId);

        const response = await fetch('/api/ask-ai', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        

        
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
        // Text-only message
        const response = await fetch('/api/ask-ai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userQuestion: content.trim(),
            useMemory: useMemory.toString(),
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
