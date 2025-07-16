"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2, Send, Building, Home } from 'lucide-react';

interface EnhancedAIInputProps {
  buildingId?: number;
  unitId?: number;
  buildingName?: string;
  unitName?: string;
  placeholder?: string;
}

export default function EnhancedAIInput({ 
  buildingId, 
  unitId, 
  buildingName, 
  unitName,
  placeholder = "Ask BlocIQ about compliance, repairs, or building management..."
}: EnhancedAIInputProps) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      setAnswer('Please enter a question.');
      return;
    }

    console.log("🧠 Enhanced AIInput: Starting AI request");
    console.log("📝 Question:", question);
    console.log("🏢 Building ID:", buildingId);
    console.log("🏠 Unit ID:", unitId);

    setLoading(true);
    try {
      const requestBody = { 
        message: question,
        buildingId,
        unitId
      };
      
      console.log("📤 Sending request to /api/ask-assistant");
      console.log("📦 Request body:", requestBody);

      const response = await fetch('/api/ask-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log("📥 Response status:", response.status);

      const data = await response.json();
      console.log("📦 Response data:", data);

      if (data.answer) {
        console.log("✅ Enhanced AI response received:", data.answer.substring(0, 100) + "...");
        setAnswer(data.answer);
        setContext(data.context);
      } else if (data.error) {
        console.error("❌ AI error:", data.error);
        setAnswer(`Error: ${data.error}`);
      } else {
        console.error("❌ No answer or error in response");
        setAnswer('Error: No response from AI service');
      }
    } catch (error) {
      console.error('❌ Network error generating answer:', error);
      setAnswer('Error: Failed to connect to AI service. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
      console.log("🏁 Enhanced AI request completed");
    }
  };

  return (
    <div className="space-y-4">
      {/* Context Display */}
      {(buildingName || unitName) && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            {buildingName && (
              <div className="flex items-center gap-1">
                <Building className="h-4 w-4" />
                <span className="font-medium">{buildingName}</span>
              </div>
            )}
            {unitName && (
              <div className="flex items-center gap-1">
                <Home className="h-4 w-4" />
                <span className="font-medium">{unitName}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-blue-600 mt-1">
            AI will use this context to provide building-specific answers
          </p>
        </Card>
      )}

      {/* Question Input */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={placeholder}
            className="pr-12"
            disabled={loading}
          />
          <Button
            type="submit"
            size="sm"
            disabled={loading || !question.trim()}
            className="absolute right-1 top-1 h-8 w-8 p-0"
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
        <Card className="p-4">
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-gray-800">{answer}</div>
          </div>
          
          {/* Context Info */}
          {context && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-2 text-xs">
                {context.building && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                    Building: {context.building}
                  </span>
                )}
                {context.unit && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                    Unit context available
                  </span>
                )}
                {context.complianceAssets && (
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">
                    Compliance data used
                  </span>
                )}
                {context.documents && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                    Document summaries used
                  </span>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Example Questions */}
      {!answer && !loading && (
        <Card className="p-4 bg-gray-50">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Example questions:</h4>
          <div className="space-y-1 text-xs text-gray-600">
            <p>• "What compliance documents are overdue for this building?"</p>
            <p>• "When was the last EICR completed and when is it due?"</p>
            <p>• "What are the key findings from the recent fire risk assessment?"</p>
            <p>• "Who is responsible for repairs to the communal hallway?"</p>
            <p>• "What access arrangements are in place for contractors?"</p>
          </div>
        </Card>
      )}
    </div>
  );
} 