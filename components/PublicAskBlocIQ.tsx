"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, X, Brain, Mail, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

type AIResponse = {
  success: boolean;
  response: string;
  result?: string;
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus email input on mount
  useEffect(() => {
    if (isOpen && !hasSubmittedEmail) {
      emailInputRef.current?.focus();
    } else if (isOpen && hasSubmittedEmail) {
      inputRef.current?.focus();
    }
  }, [isOpen, hasSubmittedEmail]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      // Store email in leads table using existing API
      const response = await fetch('/api/public-chat/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          marketingConsent: false // Optional, user can opt-in later
        }),
      });

      const data = await response.json();

      if (response.ok && data.sessionId) {
        setHasSubmittedEmail(true);
        toast.success('Thank you! You can now chat with BlocIQ');
        
        // Add welcome message with security notice
        const welcomeMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: "Welcome to BlocIQ! I'm your AI-powered property management assistant. I can help you with:\n\n🏢 General property management advice\n📋 UK compliance guidance\n🔧 Maintenance best practices\n💬 Leaseholder communication tips\n⚖️ Legal framework questions\n\n💡 Note: This is a public demo with general guidance only. For specific building data and full features, consider signing up for BlocIQ.\n\nWhat would you like to know about property management?",
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
    if (!question.trim() || loading) return;

    // Add user message to history
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    
    try {
      const response = await fetch('/api/ask-ai-public', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: question.trim(),
          is_public: true
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data: AIResponse = await response.json();
      
      if (data.success && (data.response || data.result)) {
        // Add assistant message to history
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.result || data.response,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        toast.error('Error: No response from AI service');
      }
    } catch (error) {
      console.error('Error asking AI:', error);
      toast.error('Error: Failed to connect to AI service. Please try again.');
      
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
      setQuestion('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md h-[600px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 via-teal-500 via-purple-500 to-blue-500 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Ask BlocIQ</h2>
              <p className="text-sm text-white/90">AI Property Management Assistant</p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col">
          {!hasSubmittedEmail ? (
            /* Email Capture Form */
            <div className="flex-1 flex flex-col justify-center p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-pink-500 via-teal-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Get Started</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Enter your email to start chatting with BlocIQ, our AI-powered property management assistant.
                </p>
                <p className="text-xs text-gray-500">
                  ✨ Free to try • No commitment required
                </p>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <input
                    ref={emailInputRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    disabled={isSubmittingEmail}
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isSubmittingEmail || !email.trim()}
                  className="w-full py-3 bg-gradient-to-r from-pink-500 via-teal-500 to-blue-500 hover:from-pink-600 hover:via-teal-600 hover:to-blue-600 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-2xl font-medium transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmittingEmail ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Start Chatting
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">
                  By continuing, you agree to our terms of service and privacy policy
                </p>
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
                    <div className={`max-w-[80%] ${
                      message.role === 'user' 
                        ? 'bg-gradient-to-r from-pink-500 via-teal-500 to-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    } rounded-2xl px-4 py-3`}>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Loading Message */}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-r from-pink-500 to-blue-500 rounded-lg flex items-center justify-center">
                          <Sparkles className="h-3 w-3 text-white" />
                        </div>
                        <div className="flex items-center gap-1">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                          <span className="text-sm text-gray-600">BlocIQ is thinking...</span>
                        </div>
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
                    placeholder="Ask me anything about property management..."
                    className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                    disabled={loading}
                  />
                  
                  <button
                    type="submit"
                    disabled={loading || !question.trim()}
                    className="p-2 bg-gradient-to-r from-pink-500 via-teal-500 to-blue-500 hover:from-pink-600 hover:via-teal-600 hover:to-blue-600 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-full transition-all duration-200 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </form>
                
                <p className="text-xs text-gray-500 text-center mt-2">
                  🔒 Your data is secure • Chat history is private
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}