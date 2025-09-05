'use client';

import { useState, useCallback, useRef } from 'react';
import { HybridLeaseProcessor } from '@/lib/hybrid-lease-processor';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    type?: 'quick' | 'background' | 'error';
    jobId?: string;
    filename?: string;
    processingTime?: number;
    alternatives?: string[];
    documentData?: any;
  };
}

interface UploadStatus {
  isUploading: boolean;
  progress: number;
  currentFile?: File;
  processingType?: 'quick' | 'background';
  jobId?: string;
}

export function useHybridAskAI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ 
    isUploading: false, 
    progress: 0 
  });
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  
  const abortController = useRef<AbortController | null>(null);

  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    ));
  }, []);

  const processFileWithQuestion = useCallback(async (file: File, question: string, buildingId?: string) => {
    console.log('🎯 Hybrid processing:', file.name, 'Question:', question);
    
    // Abort any existing processing
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    setIsProcessing(true);
    setUploadStatus({ 
      isUploading: true, 
      progress: 10, 
      currentFile: file,
      processingType: 'quick' 
    });

    // Add user message
    const userMessageId = addMessage({
      role: 'user',
      content: question,
      metadata: { 
        filename: file.name,
        type: 'quick'
      }
    });

    // Add initial processing message
    const processingMessageId = addMessage({
      role: 'assistant',
      content: '🔄 Analyzing your lease document...',
      metadata: { 
        filename: file.name,
        type: 'quick'
      }
    });

    try {
      // Update progress during processing
      setUploadStatus(prev => ({ ...prev, progress: 30 }));

      // Use hybrid processor
      const result = await HybridLeaseProcessor.processLease(file, question, {
        buildingId,
        maxTimeoutMs: 180000, // 3 minutes for quick attempt
        userQuestion: question
      });

      if (result.success) {
        if (result.type === 'quick') {
          // Quick processing succeeded
          setUploadStatus(prev => ({ ...prev, progress: 100, processingType: 'quick' }));
          
          updateMessage(processingMessageId, {
            content: result.data.analysis,
            metadata: {
              type: 'quick',
              filename: file.name,
              processingTime: result.data.processingTime,
              documentData: result.data
            }
          });

        } else if (result.type === 'background') {
          // Background processing initiated
          setUploadStatus(prev => ({ 
            ...prev, 
            progress: 50, 
            processingType: 'background',
            jobId: result.jobId 
          }));
          setCurrentJobId(result.jobId || null);

          // Create response with fallback message and alternatives
          let responseContent = result.message || 'Processing in background...';
          
          if (result.alternatives && result.alternatives.length > 0) {
            responseContent += '\n\n**In the meantime, I can help if you:**\n';
            result.alternatives.forEach((alt, index) => {
              responseContent += `\n${index + 1}. ${alt}`;
            });
          }

          updateMessage(processingMessageId, {
            content: responseContent,
            metadata: {
              type: 'background',
              filename: file.name,
              jobId: result.jobId,
              alternatives: result.alternatives
            }
          });

          // Add follow-up message with status tracking
          addMessage({
            role: 'system',
            content: `📊 **Background Analysis Status**\n\n🔄 Processing: ${file.name}\n📧 You'll receive an email when complete\n🔗 Job ID: \`${result.jobId}\`\n\n*You can continue asking other questions while this processes.*`,
            metadata: {
              type: 'background',
              jobId: result.jobId,
              filename: file.name
            }
          });
        }
      } else {
        // Processing failed
        setUploadStatus(prev => ({ ...prev, progress: 0 }));
        
        updateMessage(processingMessageId, {
          content: result.message || 'I encountered an issue processing your document. Please try uploading it again.',
          metadata: {
            type: 'error',
            filename: file.name,
            alternatives: result.alternatives
          }
        });

        if (result.alternatives && result.alternatives.length > 0) {
          addMessage({
            role: 'assistant',
            content: '**Alternative approaches:**\n' + result.alternatives.map((alt, i) => `${i + 1}. ${alt}`).join('\n'),
            metadata: { type: 'error' }
          });
        }
      }

    } catch (error) {
      console.error('❌ Hybrid processing error:', error);
      
      setUploadStatus(prev => ({ ...prev, progress: 0 }));
      
      updateMessage(processingMessageId, {
        content: '❌ I encountered an error processing your document. Please try again or contact support if the issue persists.',
        metadata: {
          type: 'error',
          filename: file.name
        }
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setUploadStatus({ isUploading: false, progress: 0 });
      }, 2000);
    }
  }, [addMessage, updateMessage]);

  const processPageSpecific = useCallback(async (file: File, pageNumber: number, question: string) => {
    console.log(`📄 Processing page ${pageNumber}:`, question);
    
    setIsProcessing(true);
    setUploadStatus({ 
      isUploading: true, 
      progress: 20, 
      currentFile: file,
      processingType: 'quick' 
    });

    const userMessageId = addMessage({
      role: 'user',
      content: `Page ${pageNumber}: ${question}`,
      metadata: { filename: file.name, type: 'quick' }
    });

    const processingMessageId = addMessage({
      role: 'assistant',
      content: `🔄 Analyzing page ${pageNumber} of your document...`,
      metadata: { filename: file.name, type: 'quick' }
    });

    try {
      setUploadStatus(prev => ({ ...prev, progress: 60 }));

      const result = await HybridLeaseProcessor.processSpecificPage(file, pageNumber, question);

      if (result.success) {
        setUploadStatus(prev => ({ ...prev, progress: 100 }));
        
        updateMessage(processingMessageId, {
          content: result.data?.analysis || 'Page analysis completed.',
          metadata: {
            type: 'quick',
            filename: file.name,
            processingTime: result.data?.processingTime,
            documentData: { ...result.data, pageNumber }
          }
        });
      } else {
        setUploadStatus(prev => ({ ...prev, progress: 0 }));
        
        updateMessage(processingMessageId, {
          content: result.message || `I couldn't analyze page ${pageNumber}. Would you like me to process the entire document?`,
          metadata: { type: 'error', filename: file.name }
        });
      }

    } catch (error) {
      console.error('❌ Page processing error:', error);
      
      setUploadStatus(prev => ({ ...prev, progress: 0 }));
      
      updateMessage(processingMessageId, {
        content: `❌ Error processing page ${pageNumber}. Please try again.`,
        metadata: { type: 'error', filename: file.name }
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setUploadStatus({ isUploading: false, progress: 0 });
      }, 1500);
    }
  }, [addMessage, updateMessage]);

  const sendTextMessage = useCallback(async (message: string) => {
    if (isProcessing) return;

    // Check if this looks like a page-specific question
    const pageMatch = message.match(/page (\d+)/i);
    if (pageMatch && uploadStatus.currentFile) {
      const pageNum = parseInt(pageMatch[1]);
      return processPageSpecific(uploadStatus.currentFile, pageNum, message);
    }

    // Regular text message
    addMessage({
      role: 'user',
      content: message
    });

    // Simple response for non-document questions
    const responseMessageId = addMessage({
      role: 'assistant',
      content: '🤔 Thinking...'
    });

    try {
      // You can integrate with your existing AI chat logic here
      // For now, providing a helpful response about lease questions
      
      const response = `I'm ready to help with lease questions! For the most accurate analysis, please upload your lease document and ask specific questions like:

• "What's the monthly rent amount?"
• "Who are the parties to this lease?"
• "What's the lease start date?"
• "Show me the termination clause"
• "What are the tenant's obligations?"

I can also help with specific pages if you mention "page 1", "page 2", etc.`;

      updateMessage(responseMessageId, {
        content: response
      });

    } catch (error) {
      updateMessage(responseMessageId, {
        content: "I'm having trouble processing that request. Please try again or upload a lease document for analysis."
      });
    }
  }, [isProcessing, uploadStatus.currentFile, addMessage, updateMessage, processPageSpecific]);

  const checkJobStatus = useCallback(async (jobId: string) => {
    try {
      // This would integrate with your background job status checking
      const response = await fetch(`/api/lease-processing/status/${jobId}`);
      if (response.ok) {
        const status = await response.json();
        return status;
      }
    } catch (error) {
      console.error('Status check error:', error);
    }
    return null;
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentJobId(null);
    if (abortController.current) {
      abortController.current.abort();
    }
  }, []);

  const abort = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
    }
    setIsProcessing(false);
    setUploadStatus({ isUploading: false, progress: 0 });
  }, []);

  return {
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
  };
}