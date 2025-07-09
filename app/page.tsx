'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function HomePage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setUserEmail(user.email);
      }
    });
  }, []);

  const handleAskBlocIQ = async () => {
    if (!question.trim()) return;

    setLoading(true);
    setAnswer(null);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: question }),
      });

      const data = await res.json();
      setAnswer(data.answer || 'No response from BlocIQ');
    } catch (err) {
      setAnswer('Something went wrong. Please try again.');
    }

    setLoading(false);
  };

  return (
    <>
      <header className="w-full flex justify-end px-6 py-4 border-b">
        <button
          onClick={() => router.push('/account')}
          className="text-sm bg-gray-100 text-gray-800 px-4 py-2 rounded hover:bg-gray-200"
        >
          ⚙️ Account
        </button>
      </header>

      <main className="flex flex-col items-center justify-center p-10 text-center space-y-8">
        <h1 className="text-2xl font-semibold">
          {userEmail ? `Welcome back, ${userEmail}` : 'Welcome to BlocIQ'}
        </h1>
        <p className="text-base max-w-xl">
          Your AI-powered property assistant is ready to take on leaks, complaints, budgets, and all the admin chaos.
        </p>

        {/* 🗓️ Daily Update Bar (placeholder) */}
        <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 p-3 rounded w-full max-w-xl text-sm text-left">
          🗓️ <strong>Daily Update:</strong> No building activity recorded yet.
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center w-full max-w-4xl">
          <button
            onClick={() => router.push('/dashboard/inbox')}
            className="bg-[#0F5D5D] text-white px-6 py-3 rounded-xl hover:opacity-90"
          >
            🚀 Open Inbox
          </button>
          <button
            onClick={() => router.push('/buildings')}
            className="bg-[#0F5D5D] text-white px-6 py-3 rounded-xl hover:opacity-90"
          >
            🏢 Go to Buildings
          </button>
          <button
            onClick={() => router.push('/compliance')}
            className="bg-[#0F5D5D] text-white px-6 py-3 rounded-xl hover:opacity-90"
          >
            ✅ Go to Compliance
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-[#0F5D5D] text-white px-6 py-3 rounded-xl hover:opacity-90"
          >
            📊 Go to Dashboard
          </button>
        </div>

        {/* Ask BlocIQ Input */}
        <div className="mt-10 w-full max-w-xl">
          <label htmlFor="ask" className="block text-sm mb-2 text-gray-700">
            Ask BlocIQ anything:
          </label>
          <div className="flex border border-gray-300 rounded-md overflow-hidden">
            <input
              type="text"
              id="ask"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., Which buildings need a FRA update?"
              className="flex-grow px-4 py-2 outline-none"
            />
            <button
              onClick={handleAskBlocIQ}
              className="bg-[#0F5D5D] text-white px-4"
              disabled={loading}
            >
              {loading ? 'Thinking...' : 'Ask'}
            </button>
          </div>

          {answer && (
            <div className="mt-4 text-left bg-gray-100 p-4 rounded">
              <strong>BlocIQ says:</strong>
              <p>{answer}</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
