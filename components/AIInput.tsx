'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { handleAssistantQuery } from '@/lib/ai/handleAssistantQuery';

interface AIInputProps {
  buildingId: string;
  context?: string;
}

export default function AIInput({ buildingId, context }: AIInputProps) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id ?? null);
    };
    getSession();
  }, [supabase]);

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
      const answer = await handleAssistantQuery({
        userQuestion: question,
        buildingId: buildingId,
        supabase,
      });

      if (answer) {
        setAnswer(answer);
      } else {
        setAnswer('Error: No response from AI service');
      }
    } catch (error) {
      setAnswer('Error: Failed to connect to AI service. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about this building..."
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

      {answer && (
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="font-semibold mb-2">AI Response:</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{answer}</p>
        </div>
      )}
    </div>
  );
} 