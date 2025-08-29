import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, FileText, MessageSquare, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface DocumentAwareChatInputProps {
  buildingId?: string;
  onResponse?: (response: string) => void;
  className?: string;
  placeholder?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  documents?: string[];
}

export default function DocumentAwareChatInput({ 
  buildingId, 
  onResponse, 
  className = "",
  placeholder = "Ask about your uploaded documents..."
}: DocumentAwareChatInputProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ask-ai-document-aware', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: input.trim(),
          buildingId,
          documentIds: [], // Will search for relevant documents automatically
          conversationId: conversationId || undefined
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.response) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          documents: data.documents_analyzed?.map((doc: any) => doc.name) || []
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        if (data.conversationId && !conversationId) {
          setConversationId(data.conversationId);
        }

        onResponse?.(data.response);
        toast.success('AI response received');
      } else {
        throw new Error(data.error || 'Failed to get AI response');
      }
    } catch (error) {
      console.error('Document-aware chat error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to get AI response');
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error while processing your question. Please try again.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setConversationId(null);
    toast.success('Conversation cleared');
  };

  return (
    <div className={`bg-white rounded-2xl shadow-xl border border-gray-200/50 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200/50 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Document-Aware Chat</h3>
            <p className="text-sm text-gray-600">Ask questions about your uploaded documents</p>
          </div>
          <div className="ml-auto">
            <button
              onClick={clearConversation}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Clear Chat
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="h-96 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Start a Document Conversation</h3>
            <p className="text-gray-600 mb-4">
              Ask questions about your uploaded documents and get intelligent, context-aware responses.
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <p>💡 "What are the key terms in my lease?"</p>
              <p>💡 "Summarize the compliance requirements"</p>
              <p>💡 "What actions are needed from this document?"</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                {message.documents && message.documents.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200/20">
                    <p className="text-xs opacity-80">
                      📄 Analyzed: {message.documents.join(', ')}
                    </p>
                  </div>
                )}
                <div className={`text-xs mt-2 opacity-70 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <span className="text-sm text-gray-500 ml-2">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-6 border-t border-gray-200/50">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={1}
              disabled={isLoading}
            />
            <div className="absolute right-3 top-3">
              <Sparkles className="h-4 w-4 text-gray-400" />
            </div>
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
        
        <div className="mt-3 text-xs text-gray-500 text-center">
          💡 This AI automatically searches your uploaded documents for relevant context
        </div>
      </div>
    </div>
  );
}
