"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AIFeedback from './AIFeedback';
import ComplianceBadge from './ComplianceBadge';
import MajorWorksBadge from './MajorWorksBadge';

interface EnhancedAIInputProps {
  buildingId?: string;
  context?: string;
  placeholder?: string;
  className?: string;
}

export default function EnhancedAIInput({ 
  buildingId, 
  context, 
  placeholder = "Ask about this building...",
  className = ""
}: EnhancedAIInputProps) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [aiLogId, setAiLogId] = useState<string | null>(null);
  const [usedComplianceData, setUsedComplianceData] = useState(false);
  const [usedMajorWorksData, setUsedMajorWorksData] = useState(false);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id ?? null);
    };
    getSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      setAnswer('Please enter a question.');
      return;
    }
    if (!userId) {
      setAnswer('User not authenticated. Please log in.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/assistant-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userQuestion: question,
          buildingId: buildingId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      if (data.answer) {
        setAnswer(data.answer);
        setAiLogId(data.ai_log_id || null);
        setUsedComplianceData(data.context?.complianceUsed || false);
        setUsedMajorWorksData(data.context?.majorWorksUsed || false);
      } else {
        setAnswer('Error: No response from AI service');
        setAiLogId(null);
        setUsedComplianceData(false);
        setUsedMajorWorksData(false);
      }
    } catch (error) {
      setAnswer('Error: Failed to connect to AI service. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Thinking...' : 'Ask'}
        </button>
      </form>
      
      {/* Disclaimer */}
      <p className="text-xs text-gray-500 italic text-center">
        💡 Sometimes BlocIQ can get things muddled - please verify important information
      </p>

      {answer && (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">AI Response:</h3>
              <div className="flex gap-2">
                {usedComplianceData && (
                  <ComplianceBadge />
                )}
                {usedMajorWorksData && (
                  <MajorWorksBadge />
                )}
              </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400 pr-2">
              <p className="text-gray-700 whitespace-pre-wrap break-words">{answer}</p>
            </div>
          </div>
          
          {aiLogId && (
            <AIFeedback aiLogId={aiLogId} />
          )}
        </div>
      )}
    </div>
  );
} 