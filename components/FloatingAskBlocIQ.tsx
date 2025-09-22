'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Brain, X, Send, Loader2, MessageCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAskBlocIQ } from '@/hooks/useAskBlocIQ';

interface FloatingAskBlocIQProps {
  className?: string;
}

// Helper function to format AI responses into paragraphs
function formatResponse(text: string): string {
  return text
    .split(/\n\s*\n/) // split on blank lines
    .map(p => `<p class="mb-3 last:mb-0">${p.trim()}</p>`)
    .join("");
}

export default function FloatingAskBlocIQ({ className = '' }: FloatingAskBlocIQProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const pathname = usePathname();

  // Only show on specific pages: Document Library, Buildings, Compliance, Communications and Major Works
  const allowedPages = [
    '/documents',        // Document Library
    '/buildings',        // Buildings
    '/compliance',       // Compliance
    '/communications',   // Communications
    '/major-works'       // Major Works
  ];

  // Check if current path starts with any of the allowed page paths
  const shouldShowWidget = allowedPages.some(page => pathname?.startsWith(page));

  // Use the same Ask BlocIQ hook as other components
  const {
    messages,
    question,
    setQuestion,
    isLoading,
    handleSubmit,
    messagesEndRef
  } = useAskBlocIQ({});

  const inputRef = useRef<HTMLInputElement>(null);

  // Handle ESC key to close and trap focus
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Sync input value with question state
  useEffect(() => {
    setInputValue(question);
  }, [question]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setQuestion(value);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    // Submit using the hook's handler
    await handleSubmit(e);

    // Clear input after submission
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim() && !isLoading) {
        handleFormSubmit(e as any);
      }
    }
  };

  // Only render on allowed pages
  if (!shouldShowWidget) {
    return null;
  }

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:from-[#4338ca] hover:to-[#9333ea] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group ${className}`}
          aria-label="Ask BlocIQ Assistant"
          title="Ask BlocIQ Assistant"
        >
          <Brain className="h-6 w-6 group-hover:scale-110 transition-transform" />

          {/* Pulse animation */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#4f46e5] to-[#a855f7] rounded-full animate-ping opacity-20"></div>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[500px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-title"
          aria-describedby="chat-description"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] p-4 rounded-t-2xl relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute inset-0">
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl"></div>
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
            </div>

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <Brain className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 id="chat-title" className="text-white font-semibold text-sm">Ask BlocIQ</h3>
                  <p id="chat-description" className="text-white/80 text-xs">Your AI assistant</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 space-y-3 overflow-y-auto min-h-[200px] max-h-[300px]">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Ask me anything about your properties!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                      message.role === 'user'
                        ? 'bg-blue-50 text-blue-900 border border-blue-200'
                        : 'bg-gray-50 text-gray-900 border border-gray-200'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div
                        className="prose prose-sm max-w-none text-gray-900 [&>p]:mb-2 [&>p:last-child]:mb-0"
                        dangerouslySetInnerHTML={{ __html: formatResponse(message.content) }}
                      />
                    ) : (
                      <p>{message.content}</p>
                    )}
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Europe/London'
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-100">
            <form onSubmit={handleFormSubmit} className="relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Ask about properties, compliance, tenants..."
                className="w-full pr-12 pl-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 text-blue-500 hover:text-blue-600 transition-colors" />
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-white/20 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}