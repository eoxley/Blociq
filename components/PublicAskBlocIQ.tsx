"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, X, Brain, Mail } from 'lucide-react';
import { toast } from 'sonner';

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
  const [email, setEmail] = useState('');
  const [hasSubmittedEmail, setHasSubmittedEmail] = useState(false);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-focus input when chat opens
  useEffect(() => {
    if (isOpen && hasSubmittedEmail && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, hasSubmittedEmail]);

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

      // Get AI response
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
      });

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
      toast.error('Sorry, I encountered an error. Please try again.');
      
      // Add error message to chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md h-[600px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 via-teal-500 via-purple-500 to-blue-500 p-4 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Ask BlocIQ – Your AI Property Assistant</h2>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col">
          {!hasSubmittedEmail ? (
            /* Email Capture Form */
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex flex-col min-h-full">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-pink-500 via-teal-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Ask BlocIQ – Your AI Property Assistant</h3>
                <div className="text-gray-600 text-sm space-y-2 mb-6">
                  <p>Get instant answers to your property management questions with our secure, GDPR-compliant AI assistant.</p>
                  <p>🔒 Your data is secure and stored on UK servers</p>
                  <p>🎯 Specialized in UK property management and compliance</p>
                  <p>⚡ Instant responses to complex property questions</p>
                </div>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    disabled={isSubmittingEmail}
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isSubmittingEmail || !email.trim()}
                  className="w-full py-3 bg-gradient-to-r from-pink-500 via-teal-500 to-blue-500 hover:from-pink-600 hover:via-teal-600 hover:to-blue-600 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-lg font-medium transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmittingEmail ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    'Start Using Ask BlocIQ'
                  )}
                </button>
              </form>

              <div className="mt-6 bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Benefits for BlocIQ Clients:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Access to your building data and leaseholder information</li>
                  <li>• Document analysis and OCR capabilities</li>
                  <li>• Compliance tracking and reminders</li>
                  <li>• Advanced AI features and integrations</li>
                </ul>
              </div>

              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">
                  By continuing, you agree to our privacy policy. We respect your privacy and comply with GDPR regulations.
                </p>
              </div>
              </div>
            </div>
          ) : (
            /* Chat Interface */
            <>
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'user' 
                        ? 'bg-gradient-to-r from-pink-500 via-teal-500 to-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <div className="whitespace-pre-wrap text-sm">
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Loading Animation */}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-sm text-gray-600">BlocIQ is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 p-4">
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask about property management, compliance, or leasehold matters..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                  
                  <button
                    type="submit"
                    disabled={loading || !question.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-pink-500 via-teal-500 to-blue-500 hover:from-pink-600 hover:via-teal-600 hover:to-blue-600 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-lg transition-all disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}