// LEGACY REPLY UI – superseded by ReplyModalV2 in Inbox V2.
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function ReplyEditor({
  emailId,
  initialDraft,
}: {
  emailId: string;
  initialDraft: string;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);

  const generateDraft = async () => {
    setLoading(true);
    const res = await fetch('/api/generate-draft', {
      method: 'POST',
      body: JSON.stringify({ emailId }),
    });
    const data = await res.json();
    setDraft(data.draft || '');
    setLoading(false);
  };

  const saveDraft = async () => {
    setLoading(true);
    await fetch('/api/save-draft', {
      method: 'POST',
      body: JSON.stringify({ emailId, draft }),
    });
    setLoading(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  const sendEmail = async () => {
    setLoading(true);
    await fetch('/api/send-email', {
      method: 'POST',
      body: JSON.stringify({ emailId, draft }),
    });
    setLoading(false);
    setShowFollowUp(true);
  };

  return (
    <div className="mt-4 border-t pt-4">
      <textarea
        className="w-full p-2 border rounded-md text-sm"
        rows={8}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Click 'Generate Draft' to start or write your reply here..."
      />

      <div className="flex flex-wrap gap-2 mt-2">
        <Button onClick={generateDraft} disabled={loading}>
          Generate Draft
        </Button>
        <Button onClick={saveDraft} disabled={loading}>
          Save
        </Button>
        <Button onClick={sendEmail} disabled={loading}>
          Send
        </Button>
        {success && <span className="text-green-600 text-sm ml-2">✅ Saved</span>}
      </div>

      {showFollowUp && (
        <div className="mt-3 p-3 bg-gray-100 border rounded-md">
          <p className="text-sm font-medium mb-2">Email sent!</p>
          <div className="flex flex-col gap-1 text-sm">
            <button className="underline text-blue-600 hover:text-blue-800 text-left">
              Send follow-up email...
            </button>
            <button className="underline text-blue-600 hover:text-blue-800 text-left">
              No further action needed
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
