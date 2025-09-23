'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

interface EmailContext {
  subject?: string;
  from?: string;
  itemType?: string;
}

interface Message {
  text: string;
  sender: 'user' | 'ai';
  metadata?: {
    source?: string;
    wordCount?: number;
    comprehensiveSearchUsed?: boolean;
    searchMetadata?: {
      buildings?: number;
      units?: number;
      leaseholders?: number;
      documents?: number;
      compliance?: number;
      industryKnowledge?: number;
      founderKnowledge?: number;
    };
  };
  timestamp?: string;
}

export default function AskBlocIQTaskpane() {
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "👋 Hi! I'm your BlocIQ AI assistant. I can help you with property management questions, email analysis, and drafting replies. How can I assist you today?",
      sender: 'ai'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailContext, setEmailContext] = useState<EmailContext | null>(null);
  const [officeReady, setOfficeReady] = useState(false);

  useEffect(() => {
    // Wait for Office.js to load
    const checkOffice = () => {
      if (typeof window !== 'undefined' && (window as any).Office) {
        (window as any).Office.onReady((info: any) => {
          console.log('Office.js ready, host:', info.host);
          setOfficeReady(true);
          
          if (info.host === (window as any).Office.HostApplication.Outlook) {
            loadEmailContext();
          }
        });
      } else {
        setTimeout(checkOffice, 100);
      }
    };

    checkOffice();
  }, []);

  const loadEmailContext = () => {
    try {
      const Office = (window as any).Office;
      const item = Office?.context?.mailbox?.item;
      
      if (item) {
        const context: EmailContext = {
          subject: item.subject || '',
          from: item.from ? item.from.emailAddress : '',
          itemType: item.itemType || 'Email'
        };
        
        setEmailContext(context);
        console.log('Email context loaded:', context);
      }
    } catch (error) {
      console.error('Error loading email context:', error);
    }
  };

  const sendMessage = async () => {
    const message = inputMessage.trim();
    if (!message || isLoading) return;

    // Add user message
    setMessages(prev => [...prev, { text: message, sender: 'user' }]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/addin/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          emailContext: emailContext,
          source: 'outlook_addin'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Create enhanced message with metadata from Ask BlocIQ
        const aiMessage: Message = {
          text: result.response,
          sender: 'ai',
          metadata: result.metadata,
          timestamp: result.timestamp
        };

        setMessages(prev => [...prev, aiMessage]);

        // Log successful integration with Ask BlocIQ
        if (result.source === 'ask_blociq') {
          console.log('✅ Successfully integrated with Ask BlocIQ:', {
            source: result.metadata?.source,
            comprehensiveSearch: result.metadata?.comprehensiveSearchUsed,
            searchResults: result.metadata?.searchMetadata
          });
        }
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        text: "Sorry, I'm having trouble connecting. Please check your internet connection and try again.", 
        sender: 'ai' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendQuickMessage = (message: string) => {
    setInputMessage(message);
    setTimeout(() => sendMessage(), 100);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <>
      <Script 
        src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js" 
        strategy="beforeInteractive"
      />
      
      <div className="h-screen flex flex-col bg-white overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 text-center shadow-lg">
          <h1 className="text-lg font-semibold m-0">🏠 Ask BlocIQ</h1>
          <p className="text-xs opacity-90 mt-1 mb-0">Your AI Property Management Assistant</p>
        </div>

        {/* Email Context */}
        {emailContext && (emailContext.subject || emailContext.from) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mx-5 my-3 text-xs">
            <strong className="text-yellow-800">📧 Email Context:</strong>
            <div className="mt-1">
              {emailContext.subject && (
                <div><strong>Subject:</strong> {emailContext.subject}</div>
              )}
              {emailContext.from && (
                <div><strong>From:</strong> {emailContext.from}</div>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => sendQuickMessage('Analyze this email')}
              className="bg-white border border-gray-300 rounded-full px-3 py-1 text-xs cursor-pointer transition-all hover:bg-indigo-600 hover:text-white hover:border-indigo-600"
            >
              📊 Analyze Email
            </button>
            <button 
              onClick={() => sendQuickMessage('Draft a reply')}
              className="bg-white border border-gray-300 rounded-full px-3 py-1 text-xs cursor-pointer transition-all hover:bg-indigo-600 hover:text-white hover:border-indigo-600"
            >
              ✍️ Draft Reply
            </button>
            <button 
              onClick={() => sendQuickMessage('What action is needed?')}
              className="bg-white border border-gray-300 rounded-full px-3 py-1 text-xs cursor-pointer transition-all hover:bg-indigo-600 hover:text-white hover:border-indigo-600"
            >
              ⚡ Action Items
            </button>
            <button 
              onClick={() => sendQuickMessage('Property management advice')}
              className="bg-white border border-gray-300 rounded-full px-3 py-1 text-xs cursor-pointer transition-all hover:bg-indigo-600 hover:text-white hover:border-indigo-600"
            >
              🏠 Property Help
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-4 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}
            >
              <div
                className={`inline-block max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                  message.sender === 'user'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                    : 'bg-gray-100 text-gray-800 border border-gray-200'
                }`}
              >
                {message.text}
              </div>

              {/* Show metadata for AI messages when available */}
              {message.sender === 'ai' && message.metadata && (
                <div className="mt-1 ml-2 text-xs text-gray-500 flex items-center gap-2">
                  {message.metadata.source === 'ask_blociq' && (
                    <>
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        🧠 Ask BlocIQ
                      </span>
                      {message.metadata.comprehensiveSearchUsed && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          🔍 Database Search
                        </span>
                      )}
                      {message.metadata.searchMetadata?.industryKnowledge && message.metadata.searchMetadata.industryKnowledge > 0 && (
                        <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                          📚 Industry Knowledge
                        </span>
                      )}
                    </>
                  )}
                  {message.metadata.source === 'fallback' && (
                    <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                      ⚠️ Basic Mode
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-center items-center p-5">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="flex gap-3 items-center">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about property management..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-full text-sm outline-none focus:border-indigo-600 transition-colors"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0 rounded-full cursor-pointer text-base flex items-center justify-center transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </>
  );
}