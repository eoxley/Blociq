'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function MailboxWidget() {
  const supabase = createClientComponentClient();
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmails = async () => {
      const { data, error } = await supabase
        .from('incoming_emails')
        .select('id, subject, from_email, body_preview, received_at, handled')
        .order('received_at', { ascending: false })

      

      if (!error) setEmails(data || []);
      setLoading(false);
    };

    fetchEmails();
  }, []);

  return (
    <div className="bg-white border rounded-xl p-4 shadow">
      <h2 className="text-lg font-semibold mb-4">📬 Inbox Overview</h2>
      {loading ? (
        <p className="text-gray-500 text-sm">Loading emails...</p>
      ) : emails.length === 0 ? (
        <p className="text-gray-500 text-sm">No emails found.</p>
      ) : (
        <ul className="space-y-3">
          {emails.map((email) => (
            <li key={email.id} className="border-b pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{email.subject}</p>
                  <p className="text-xs text-gray-500">
                    From: {email.from_email}
                  </p>
                  <p className="text-sm text-gray-600">{email.body_preview}</p>
                </div>
                <div className="text-xs text-right">
                  <p className={email.handled ? 'text-green-600' : 'text-red-500'}>
                    {email.handled ? '✔ Handled' : '❗ Unhandled'}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
