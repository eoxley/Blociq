'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import AIInput from '@/components/AIInput';

export default function TestMajorWorksPage() {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResponse = (aiResponse: string) => {
    setResponse(aiResponse);
  };

  const testMajorWorksQuestions = [
    "What major works projects are currently active?",
    "Are there any overdue major works projects?",
    "What is the total cost of all major works projects?",
    "When is the next major works project due to complete?",
    "What major works projects need attention this month?"
  ];

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">🏗️ Major Works Context Test</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Test Major Works Questions</h2>
          <div className="space-y-2">
            {testMajorWorksQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => {
                  // This would trigger the AI with major works context
                  toast.info(`Testing: ${question}`);
                }}
                className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">AI Response</h2>
          <AIInput
            placeholder="Ask about major works for this building..."
            onResponse={handleResponse}
            contextType="major_works"
            buildingId="1" // Replace with actual building ID
            className="w-full"
          />
          
          {response && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Response:</h3>
              <div className="whitespace-pre-wrap text-sm">
                {response}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">ℹ️ How to Test</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Use the AI input with <code>contextType="major_works"</code></li>
          <li>• Ask questions about major works projects and timelines</li>
          <li>• Look for the "Live major works data used" badge</li>
          <li>• Verify the AI references actual major works data</li>
        </ul>
      </div>
    </div>
  );
} 