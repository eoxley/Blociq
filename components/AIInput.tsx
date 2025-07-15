'use client';

import React, { useState } from 'react';

interface AIInputProps {
  buildingId: string;
  context?: string;
}

export default function AIInput({ buildingId, context }: AIInputProps) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      setAnswer('Please enter a question.');
      return;
    }

    console.log("🧠 AIInput: Starting AI request");
    console.log("📝 Question:", question);
    console.log("🏢 Building ID:", buildingId);
    console.log("📋 Context:", context);

    setLoading(true);
    try {
      const requestBody = { 
        question, 
        buildingId
      };
      
      console.log("📤 Sending request to /api/generate-answer");
      console.log("📦 Request body:", requestBody);

      const response = await fetch('/api/generate-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log("📥 Response status:", response.status);
      console.log("📥 Response headers:", Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log("📦 Response data:", data);

      if (data.answer) {
        console.log("✅ AI response received:", data.answer.substring(0, 100) + "...");
        setAnswer(data.answer);
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
      console.log("🏁 AI request completed");
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