"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, X, Brain, Mail } from 'lucide-react';
import { toast } from 'sonner';
import AIChatDisclaimer from '@/components/ui/AIChatDisclaimer';

// Centralized hero banner text constants
const HERO_BANNER_CONFIG = {
  title: "Ask BlocIQ – Your AI Property Assistant",
  subtitle: "Professional UK Property Management AI",
  welcomeTitle: "Welcome to Ask BlocIQ",
  welcomeSubtitle: "Your professional AI property management assistant"
} as const;

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

interface PublicAskBlocIQProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PublicAskBlocIQ({ isOpen, onClose }: PublicAskBlocIQProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('BlocIQ is thinking...');
  const [email, setEmail] = useState('');
  const [hasSubmittedEmail, setHasSubmittedEmail] = useState(false);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll removed - let users control their own scrolling
  // useEffect(() => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  // }, [messages]);

  // Auto-focus input when chat opens
  useEffect(() => {
    if (isOpen && hasSubmittedEmail && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, hasSubmittedEmail]);

  // Handle ESC key to close modal and prevent body scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      // Prevent background scrolling when modal is open
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.classList.add('modal-open');
      document.addEventListener('keydown', handleEscape);

      return () => {
        // Restore background scrolling when modal closes
        document.body.style.overflow = 'unset';
        document.body.style.position = 'unset';
        document.body.style.width = 'unset';
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  // Cleanup timer on unmount or modal close
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubmittingEmail) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSubmittingEmail(true);
    
    try {
      const response = await fetch('/api/public-chat/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          marketingConsent: false
        }),
      });

      const data = await response.json();

      if (response.ok && data.sessionId) {
        setSessionId(data.sessionId);
        setHasSubmittedEmail(true);
        toast.success('Welcome! You can now chat with BlocIQ');
        
        // Add welcome message
        const welcomeMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: "Hello! I'm BlocIQ, your AI property management assistant. I can help you with general property management questions, UK compliance guidance, and industry best practices.\n\nPlease note: This is a public demo with general guidance only. For specific building data and full BlocIQ features, consider signing up.\n\nWhat would you like to know about property management?",
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
      } else {
        toast.error(data.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting email:', error);
      toast.error('Failed to start chat. Please try again.');
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || loading || !sessionId) return;

    // Add user message to history
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setQuestion('');

    // Set progressive loading messages for long requests
    const questionLength = question.trim().length;
    if (questionLength > 500) {
      setLoadingMessage('Processing large request...');
    } else if (questionLength > 200) {
      setLoadingMessage('Analyzing your question...');
    } else {
      setLoadingMessage('BlocIQ is thinking...');
    }

    // Update loading message progressively for very long requests
    if (questionLength > 500) {
      let step = 0;
      const messages = [
        'Processing large request...',
        'Analyzing multiple questions...',
        'Searching knowledge base...',
        'Preparing comprehensive response...',
        'Almost ready...'
      ];
      progressTimerRef.current = setInterval(() => {
        step++;
        if (step < messages.length) {
          setLoadingMessage(messages[step]);
        }
      }, 8000); // Update every 8 seconds
    }
    
    try {
      // Log user message
      await fetch('/api/public-chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          role: 'user',
          content: question.trim()
        }),
      });

      // Get AI response with extended timeout for large requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const response = await fetch('/api/ask-ai-public', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: question.trim(),
          is_public: true,
          sessionId
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      if (data.success && (data.response || data.result)) {
        const assistantResponse = data.result || data.response;
        
        // Add assistant message to history
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: assistantResponse,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Log assistant message
        await fetch('/api/public-chat/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            role: 'assistant',
            content: assistantResponse
          }),
        });
      } else {
        throw new Error('No response from AI service');
      }
    } catch (error) {
      console.error('Error asking AI:', error);

      let errorMessage = "I'm having trouble connecting right now. Please try again in a moment.";
      let toastMessage = 'Sorry, I encountered an error. Please try again.';

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Your request took longer than expected and was cancelled. For large questions with many parts, try breaking them into smaller chunks.";
          toastMessage = 'Request timed out. Try breaking large questions into smaller parts.';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMessage = "Connection issue detected. Please check your internet connection and try again.";
          toastMessage = 'Connection problem. Please check your internet and try again.';
        }
      }

      toast.error(toastMessage);

      // Add error message to chat
      const errorMessageObj: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessageObj]);
    } finally {
      setLoading(false);
      setLoadingMessage('BlocIQ is thinking...');
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 md:p-6"
      onClick={(e) => {
        // Close modal when clicking backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onWheel={(e) => {
        // Prevent scroll events from propagating to background
        e.stopPropagation();
      }}
      onTouchMove={(e) => {
        // Prevent touch scroll on mobile
        e.stopPropagation();
      }}
    >
      <div
        className="modal-container bg-white rounded-xl shadow-2xl w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl h-[80vh] max-h-[85vh] flex flex-col animate-in fade-in-0 zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
      >
        {/* Header with Enhanced Close Button */}
        <div className="bg-gradient-to-r from-pink-500 via-teal-500 via-purple-500 to-blue-500 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-all duration-200 hover:scale-110 group"
            aria-label="Close Chat"
            title="Close Chat"
          >
            <X className="h-6 w-6 group-hover:rotate-90 transition-transform duration-200" />
          </button>
          
          <div className="flex items-center gap-4 pr-12">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
              <Brain className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{HERO_BANNER_CONFIG.title}</h2>
              <p className="text-white/80 text-sm mt-1">{HERO_BANNER_CONFIG.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {!hasSubmittedEmail ? (
            /* Email Capture Form - Enhanced Layout for Larger Modal */
            <div className="flex-1 overflow-y-auto scrollbar-visible relative scroll-smooth min-h-0 max-h-full">
              {/* Scroll indicator */}
              <div className="absolute top-2 right-6 z-20 bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-medium shadow-sm animate-pulse pointer-events-none">
                Scroll for more info ↕️
              </div>
              <div className="p-8 lg:p-12 max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-pink-500 via-teal-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Mail className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">{HERO_BANNER_CONFIG.welcomeTitle}</h3>
                <p className="text-lg text-gray-600 mb-6">{HERO_BANNER_CONFIG.welcomeSubtitle}</p>
                <div className="text-gray-600 text-base space-y-6 mb-8 text-center max-w-4xl mx-auto">
                  <p className="text-center leading-relaxed">You are welcome to try our Ask BlocIQ AI. This is BlocIQ's own secure, ring-fenced AI service — designed specifically for UK leasehold property management.</p>
                  <p className="text-center leading-relaxed">All information you input and receive is GDPR-safe, confidential, and never shared with third parties. Your chats stay private, and the service runs on a secure UK-based server.</p>
                  
                  <form onSubmit={handleEmailSubmit} className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-6 max-w-md mx-auto">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-3 text-center">
                        Enter your email address to start chatting
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        className="w-full px-4 py-3 text-base text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                        disabled={isSubmittingEmail}
                        required
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isSubmittingEmail || !email.trim()}
                      className="w-full py-4 px-6 text-lg bg-gradient-to-r from-pink-500 via-teal-500 to-blue-500 hover:from-pink-600 hover:via-teal-600 hover:to-blue-600 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-lg font-semibold transition-all disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none max-w-md mx-auto focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      aria-label="Submit email to start using Ask BlocIQ"
                    >
                      {isSubmittingEmail ? (
                        <>
                          <Loader2 className="h-6 w-6 animate-spin" />
                          <span>Starting...</span>
                        </>
                      ) : (
                        <>
                          <Brain className="h-6 w-6" />
                          <span>Start Using Ask BlocIQ</span>
                        </>
                      )}
                    </button>
                  </form>
                  
                  <p className="text-xs text-gray-500 text-center">This will not be used for marketing or shared with anyone — it's simply to give you access.</p>
                  
                  <div className="bg-blue-50 rounded-lg p-6 max-w-2xl mx-auto">
                    <p className="font-semibold text-blue-900 mb-4 text-center">💡 Try asking about:</p>
                    <ul className="space-y-2 text-blue-800 text-center text-sm leading-relaxed">
                      <li>• UK leasehold legislation and compliance requirements</li>
                      <li>• Drafting professional emails or letters to leaseholders</li>
                      <li>• Property maintenance schedules and best practices</li>
                      <li>• Service charge calculations and explanations</li>
                      <li>• Section 20 notices and consultation processes</li>
                    </ul>
                    <p className="text-xs text-blue-600 mt-4 text-center italic">
                      💭 Tip: For large requests with many questions, responses may take 15-30 seconds to process.
                    </p>
                  </div>
                </div>
              </div>


              <div className="mt-8 bg-blue-50 rounded-lg p-6 max-w-2xl mx-auto text-center">
                <h4 className="font-semibold text-blue-900 mb-4 text-center">BlocIQ clients benefit from the full power of Ask BlocIQ, including:</h4>
                <ul className="text-sm text-blue-800 space-y-2 text-center leading-relaxed">
                  <li>• Contextual answers based on their specific buildings and portfolio</li>
                  <li>• Instant document retrieval and AI-generated notices</li>
                  <li>• Lease reviews and summaries in seconds</li>
                  <li>• LPE1 packs produced instantly</li>
                </ul>
              </div>

              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500 text-center max-w-md mx-auto leading-relaxed">
                  By continuing, you agree to our privacy policy. We respect your privacy and comply with GDPR regulations.
                </p>
              </div>
              </div>
            </div>
          ) : (
            /* Enhanced Chat Interface with Better Scrolling */
            <>
              {/* Chat Messages Area with Enhanced Scrolling and Scroll Indicator */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-visible relative min-h-0 max-h-full">
                {/* Scroll indicator when messages overflow */}
                {messages.length > 2 && (
                  <div className="absolute top-2 right-6 z-20 bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-medium shadow-sm animate-pulse pointer-events-none">
                    Scroll for more messages ↕️
                  </div>
                )}
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} px-2`}
                  >
                    <div className={`max-w-[85%] lg:max-w-[75%] rounded-lg px-6 py-4 shadow-sm ${
                      message.role === 'user' 
                        ? 'bg-gradient-to-r from-pink-500 via-teal-500 to-blue-500 text-white' 
                        : 'bg-gray-50 text-gray-900 border border-gray-200'
                    }`}>
                      <div className="whitespace-pre-wrap text-base leading-relaxed break-words">
                        {message.content}
                      </div>
                      <div className={`text-xs mt-3 text-center ${
                        message.role === 'user' ? 'text-white/70' : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Loading Animation - Centered */}
                {loading && (
                  <div className="flex justify-center px-2">
                    <div className="bg-gray-100 rounded-lg px-6 py-4 shadow-sm border border-gray-200 max-w-[85%] lg:max-w-[75%]">
                      <div className="flex items-center justify-center gap-3">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-base text-gray-600">{loadingMessage}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Enhanced Input Area - Center-aligned with proper fitting */}
              <div className="border-t border-gray-200 bg-gray-50/50 p-6">
                <div className="max-w-4xl mx-auto">
                  <form onSubmit={handleSubmit} className="flex gap-3 mb-4">
                    <input
                      ref={inputRef}
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask about property management, compliance, or leasehold matters..."
                      className="flex-1 px-5 py-3 text-base text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm placeholder:text-center"
                      disabled={loading}
                    />
                    
                    <button
                      type="submit"
                      disabled={loading || !question.trim()}
                      className="px-6 py-3 bg-gradient-to-r from-pink-500 via-teal-500 to-blue-500 hover:from-pink-600 hover:via-teal-600 hover:to-blue-600 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-lg font-medium transition-all disabled:cursor-not-allowed hover:shadow-lg shrink-0"
                      title="Send message"
                    >
                      {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </button>
                  </form>
                  <div className="text-center">
                    <AIChatDisclaimer />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Enhanced Custom Scrollbar Styles */}
      <style jsx>{`
        .scrollbar-visible {
          scrollbar-width: auto;
          scrollbar-color: #60a5fa #f3f4f6;
          overflow-y: auto;
          position: relative;
          z-index: 1;
        }

        .scrollbar-visible::-webkit-scrollbar {
          width: 14px;
          display: block;
          z-index: 100;
        }

        .scrollbar-visible::-webkit-scrollbar-track {
          background: #f9fafb;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          margin: 2px;
        }

        .scrollbar-visible::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #60a5fa 0%, #3b82f6 100%);
          border-radius: 6px;
          border: 2px solid #f9fafb;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          min-height: 30px;
        }

        .scrollbar-visible::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
          border-color: #f3f4f6;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
        }

        .scrollbar-visible::-webkit-scrollbar-thumb:active {
          background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%);
        }

        .scrollbar-visible::-webkit-scrollbar-corner {
          background: #f9fafb;
        }

        /* Ensure scrollbar is always above content */
        .scrollbar-visible::-webkit-scrollbar {
          z-index: 999 !important;
        }

        /* Smooth scrolling */
        .scrollbar-visible {
          scroll-behavior: smooth;
        }

        /* Ensure proper layout for flex containers */
        .scrollbar-visible {
          min-height: 0;
          flex-shrink: 1;
        }

        /* Text wrapping */
        .break-words {
          word-wrap: break-word;
          word-break: break-word;
          hyphens: auto;
          overflow-wrap: break-word;
        }

        /* Center placeholder text */
        .placeholder\\:text-center::placeholder {
          text-align: center;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .scrollbar-visible::-webkit-scrollbar {
            width: 12px;
          }

          .scrollbar-visible {
            scrollbar-width: thin;
          }
        }

        /* Force scrollbar visibility on all browsers */
        .scrollbar-visible {
          -ms-overflow-style: auto;
        }

        /* Ensure modal stays within viewport */
        .modal-container {
          max-height: calc(100vh - 2rem) !important;
          contain: layout style paint;
        }

        @media (max-height: 600px) {
          .modal-container {
            height: 90vh !important;
            max-height: calc(100vh - 1rem) !important;
          }
        }

        @media (max-height: 500px) {
          .modal-container {
            height: 95vh !important;
            max-height: calc(100vh - 0.5rem) !important;
          }
        }

        /* Prevent background scroll when modal is open */
        body.modal-open {
          overflow: hidden !important;
          position: fixed !important;
          width: 100% !important;
        }
      `}</style>
    </div>
  );
}