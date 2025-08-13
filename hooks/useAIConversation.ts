import { useState, useCallback, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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
  memoryContext: MemoryContext | null;
  sendMessage: (content: string, files?: File[]) => Promise<void>;
  startNewThread: () => void;
  setUseMemory: (use: boolean) => void;
  clearMessages: () => void;
}

export function useAIConversation(): UseAIConversationReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [useMemory, setUseMemory] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
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
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      if (files.length > 0) {
        // Handle file uploads using existing ask-ai endpoint
        const formData = new FormData();
        formData.append('userQuestion', content.trim());
        formData.append('useMemory', useMemory.toString());
        if (conversationId) formData.append('conversationId', conversationId);
        
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
        
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.result || data.answer || 'No response received',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        
        if (data.conversationId && !conversationId) {
          setConversationId(data.conversationId);
        }
      } else {
        // Use enhanced assistant-query endpoint for text-only queries
        const response = await fetch('/api/assistant-query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userQuestion: content.trim(),
            useMemory,
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
          content: data.answer || 'No response received',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        
        if (data.conversationId && !conversationId) {
          setConversationId(data.conversationId);
        }

        if (data.memoryContext) {
          setMemoryContext(data.memoryContext);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
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
    memoryContext,
    sendMessage,
    startNewThread,
    setUseMemory,
    clearMessages
  };
}
