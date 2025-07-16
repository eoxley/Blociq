"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  MessageSquare, 
  X, 
  Send, 
  Loader2, 
  Building, 
  Home,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface AskBlocIQProps {
  buildingId?: number;
  unitId?: number;
  buildingName?: string;
  unitName?: string;
}

export default function AskBlocIQ({ 
  buildingId, 
  unitId, 
  buildingName, 
  unitName 
}: AskBlocIQProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<any>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'A') {
        event.preventDefault();
        setIsOpen(!isOpen);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setAnswer('');

    try {
      const requestBody = { 
        message: question,
        buildingId,
        unitId
      };

      const response = await fetch('/api/ask-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.answer) {
        setAnswer(data.answer);
        setContext(data.context);
      } else if (data.error) {
        setAnswer(`Error: ${data.error}`);
      } else {
        setAnswer('Error: No response from AI service');
      }
    } catch (error) {
      console.error('AI request error:', error);
      setAnswer('Error: Failed to connect to AI service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
    setQuestion('');
    setAnswer('');
    setContext(null);
  };

  const handleToggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 bg-primary hover:bg-primary/90 text-white p-4 rounded-full shadow-2xl z-50 transition-all duration-200 hover:scale-110 border-2 border-white"
        title="Ask BlocIQ (Ctrl + Shift + A)"
      >
        <MessageSquare className="h-7 w-7" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 w-96 max-w-[90vw]">
      <Card className="shadow-2xl border-0 bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-t-lg">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <h3 className="font-semibold">Ask BlocIQ</h3>
            {(buildingName || unitName) && (
              <div className="flex items-center gap-1 text-xs bg-white/20 px-2 py-1 rounded">
                {buildingName && (
                  <div className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    <span>{buildingName}</span>
                  </div>
                )}
                {unitName && (
                  <div className="flex items-center gap-1">
                    <Home className="h-3 w-3" />
                    <span>{unitName}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleMinimize}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title={isMinimized ? "Expand" : "Minimize"}
            >
              {isMinimized ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
            {/* Context Info */}
            {(buildingName || unitName) && (
              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                <p className="font-medium">Context:</p>
                {buildingName && <p>🏢 Building: {buildingName}</p>}
                {unitName && <p>🏠 Unit: {unitName}</p>}
                <p className="text-gray-500 mt-1">
                  AI will use this context for building-specific answers
                </p>
              </div>
            )}

            {/* Question Input */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Input
                  ref={inputRef}
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask about compliance, repairs, or building management..."
                  className="pr-12"
                  disabled={loading}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={loading || !question.trim()}
                  className="absolute right-1 top-1 h-8 w-8 p-0 bg-sky-600 hover:bg-sky-700"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>

            {/* Answer Display */}
            {answer && (
              <div className="space-y-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-gray-800">{answer}</div>
                  </div>
                </div>
                
                {/* Context Indicators */}
                {context && (
                  <div className="flex flex-wrap gap-1 text-xs">
                    {context.building && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                        Building: {context.building}
                      </span>
                    )}
                    {context.unit && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        Unit context
                      </span>
                    )}
                    {context.complianceAssets && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">
                        Compliance data
                      </span>
                    )}
                    {context.documents && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                        Document summaries
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Example Questions */}
            {!answer && !loading && (
              <div className="text-xs text-gray-600 space-y-1">
                <p className="font-medium">Try asking:</p>
                <p>• "What compliance documents are overdue?"</p>
                <p>• "When was the last EICR completed?"</p>
                <p>• "Who handles communal repairs?"</p>
                <p>• "What are the access arrangements?"</p>
              </div>
            )}

            {/* Keyboard Shortcut Hint */}
            <div className="text-xs text-gray-400 text-center pt-2 border-t">
              💡 Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl + Shift + A</kbd> to toggle
            </div>
          </div>
        )}
      </Card>
    </div>
  );
} 