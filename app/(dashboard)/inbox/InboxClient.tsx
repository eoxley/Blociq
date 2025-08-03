'use client';

import { useEffect, useState } from 'react';
import { useInbox } from '@/hooks/useInbox';
import SimpleEmailDetailView from './components/SimpleEmailDetailView';
import SimpleFolderSidebar from './components/SimpleFolderSidebar';
import { useUser } from '@supabase/auth-helpers-react';

export default function InboxClient() {
  const {
    emails,
    selectedEmail,
    selectEmail,
    manualSync,
    isRealTimeEnabled,
    folders,
    loading,
  } = useInbox();

  const [search, setSearch] = useState('');
  const user = useUser();

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">📨 Inbox</h1>
        <div className="flex items-center gap-4 text-sm">
          {isRealTimeEnabled ? (
            <span className="text-green-600 font-medium">🟢 Live</span>
          ) : (
            <span className="text-yellow-500">⚠️ Real-time not active</span>
          )}
          <button
            onClick={manualSync}
            className="text-indigo-600 hover:underline transition"
          >
            Manual Sync
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-[320px_1fr] gap-6">
        {/* Sidebar */}
        <div className="w-full">
          <SimpleFolderSidebar folders={folders} />
        </div>

        {/* Main Content */}
        <div className="flex flex-col gap-4">
          {/* Search & Filter Bar */}
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Search emails by subject, sender, or content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-400"
            />
            {/* Filter dropdowns can go here if needed */}
          </div>

          {/* Email List & Details */}
          <div className="grid grid-cols-2 gap-6">
            {/* Email List */}
            <div className="bg-white rounded-xl shadow p-4 overflow-y-auto max-h-[calc(100vh-220px)]">
              {loading ? (
                <div className="text-sm text-gray-500">Loading emails...</div>
              ) : emails?.length > 0 ? (
                <ul className="space-y-3">
                  {emails.map((email) => (
                    <li
                      key={email.id}
                      onClick={() => selectEmail(email)}
                      className={`p-3 rounded-xl cursor-pointer transition hover:bg-indigo-50 ${
                        selectedEmail?.id === email.id ? 'bg-indigo-100' : ''
                      }`}
                    >
                      <div className="font-semibold text-sm text-indigo-800">
                        {email.from_name || email.from_email}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {email.subject}
                      </div>
                      <div className="text-xs text-gray-400">
                        {email.received_at?.slice(0, 10)}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-gray-500">No emails found.</div>
              )}
            </div>

            {/* Email Detail Panel */}
            <div className="bg-white rounded-xl shadow p-6 min-h-[300px]">
              {selectedEmail ? (
                <SimpleEmailDetailView email={selectedEmail} />
              ) : (
                <div className="flex flex-col items-center justify-center text-center text-gray-500 h-full">
                  <div className="text-4xl mb-2">📥</div>
                  <h2 className="text-lg font-semibold">Select an email</h2>
                  <p className="text-sm text-gray-400">
                    Choose an email from the list to view its details and generate AI-powered replies.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 