'use client';

import ReplyEditor from './ReplyEditor';
import { useState } from 'react';
import { Pin, CheckCircle, Circle } from 'lucide-react';

type Email = {
  id: string;
  subject: string;
  from_email: string;
  body_preview: string;
  received_at: string;
  handled: boolean;
  pinned?: boolean;
  tag?: string;
  unread?: boolean;
  building_id: number;
  unit: string;
  buildings?: {
    name: string;
  };
  email_drafts?: {
    draft_text: string | null;
  };
};

export default function InboxList({ emails }: { emails: Email[] }) {
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(emails[0] || null);
  const [localEmails, setLocalEmails] = useState<Email[]>(emails);

  const markAsRead = async (emailId: string) => {
    await fetch('/api/mark-read', {
      method: 'POST',
      body: JSON.stringify({ emailId }),
    });

    setLocalEmails(prev =>
      prev.map(email =>
        email.id === emailId ? { ...email, unread: false } : email
      )
    );
  };

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email);
    if (email.unread !== false) {
      markAsRead(email.id);
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] border rounded-lg overflow-hidden shadow">
      {/* Left: Email list */}
      <div className="w-1/3 border-r overflow-y-auto bg-white">
        {localEmails.map((email) => (
          <div
            key={email.id}
            onClick={() => handleEmailClick(email)}
            className={`p-4 border-b cursor-pointer hover:bg-blue-50 transition ${
              selectedEmail?.id === email.id ? 'bg-blue-100' : ''
            } flex justify-between items-start`}
          >
            <div className="flex flex-col w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-900 font-medium">
                  {email.unread !== false && (
                    <Circle className="h-2 w-2 fill-blue-600 text-blue-600" />
                  )}
                  <span className="truncate">{email.subject}</span>
                  {email.pinned && <Pin className="h-4 w-4 text-gray-500" />}
                </div>
                {email.handled && (
                  <CheckCircle className="h-4 w-4 text-green-500" title="Handled" />
                )}
              </div>

              <div className="text-xs text-gray-600 truncate">{email.body_preview}</div>

              <div className="flex justify-between items-center mt-1 text-[10px] text-gray-400">
                <span>{new Date(email.received_at).toLocaleString()}</span>
                <span className="text-[10px] font-medium text-white px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: getTagColor(email.tag || ''),
                  }}
                >
                  {email.tag || 'General'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Right: Email detail + reply */}
      <div className="w-2/3 p-6 bg-gray-50 overflow-y-auto">
        {selectedEmail ? (
          <>
            <h2 className="text-lg font-semibold mb-1">{selectedEmail.subject}</h2>
            <p className="text-sm text-gray-600 mb-1">
              From: <span className="font-medium">{selectedEmail.from_email}</span>
            </p>
            <p className="text-sm text-gray-600 mb-1">
              Building: <span className="font-medium">{selectedEmail.buildings?.name || 'Unknown'}</span>
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Tag: <span className="italic">{selectedEmail.tag || 'None'}</span>
            </p>
            <div className="bg-white p-4 rounded border mb-6 shadow-sm">
              <p className="text-sm text-gray-700">{selectedEmail.body_preview}</p>
            </div>

            <ReplyEditor
              emailId={selectedEmail.id}
              initialDraft={selectedEmail.email_drafts?.draft_text ?? ''}
            />
          </>
        ) : (
          <p className="text-gray-500 text-sm">Select an email to view and respond.</p>
        )}
      </div>
    </div>
  );
}

function getTagColor(tag: string): string {
  switch (tag.toLowerCase()) {
    case 'accounts':
      return '#2563eb';
    case 'maintenance':
      return '#16a34a';
    case 'legal':
      return '#db2777';
    case 'urgent':
      return '#dc2626';
    default:
      return '#6b7280';
  }
}
