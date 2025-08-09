// LEGACY REPLY UI – superseded by ReplyModalV2 in Inbox V2.
'use client';

import { useState } from 'react';

interface ReplyModalProps {
  email: any;
  onClose: () => void;
}

export function ReplyModal({ email, onClose }: ReplyModalProps) {
  const [replyText, setReplyText] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleGenerateDraft = async () => {
    setGenerating(true);
    const res = await fetch('/api/generate-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: email.subject,
        from: email.from_email,
        body: email.body_preview,
      }),
    });

    const data = await res.json();
    setReplyText(data.reply || '');
    setGenerating(false);
  };

  const handleSend = () => {
    console.log('Send this reply:', replyText);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-gray-500 text-xl"
        >
          &times;
        </button>

        <h2 className="text-lg font-semibold mb-1">{email.subject}</h2>
        <p className="text-sm text-gray-500 mb-2">{email.from_email}</p>
        <p className="text-sm mb-4">{email.body_preview}</p>

        <textarea
          rows={6}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Type your reply..."
          className="w-full border border-gray-300 p-2 rounded mb-4"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={handleGenerateDraft}
            className="bg-gray-800 text-white px-4 py-2 rounded disabled:opacity-50"
            disabled={generating}
          >
            ✨ {generating ? 'Generating...' : 'Generate Draft'}
          </button>
          <button
            onClick={handleSend}
            className="bg-teal-600 text-white px-4 py-2 rounded"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
