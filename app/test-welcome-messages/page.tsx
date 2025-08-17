'use client';

import { getRandomWelcomeMessage, welcomeMessages } from '@/utils/messages';
import { useState } from 'react';

export default function TestWelcomeMessagesPage() {
  const [currentMessage, setCurrentMessage] = useState(getRandomWelcomeMessage());
  const [messageCount, setMessageCount] = useState(0);

  const generateNewMessage = () => {
    setCurrentMessage(getRandomWelcomeMessage());
    setMessageCount(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Welcome Messages Test</h1>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Random Message</h2>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
            <p className="text-lg text-purple-800">{currentMessage}</p>
          </div>
          <button
            onClick={generateNewMessage}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Generate New Message ({messageCount} generated)
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">All Available Messages ({welcomeMessages.length} total)</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {welcomeMessages.map((message, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3">
                <p className="text-sm text-gray-700">{message}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">Implementation Details</h2>
          <ul className="space-y-2 text-blue-800">
            <li>• <strong>Total Messages:</strong> {welcomeMessages.length}</li>
            <li>• <strong>Categories:</strong> Greetings, Pro Tips, Fun Facts, Motivational, Humorous, Encouraging</li>
            <li>• <strong>Random Selection:</strong> Uses Math.floor(Math.random() * array.length)</li>
            <li>• <strong>Fallback:</strong> "Making block management smarter, one step at a time."</li>
            <li>• <strong>Page Load:</strong> Message is selected once when component mounts</li>
            <li>• <strong>No Cycling:</strong> Message stays the same until page refresh</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
