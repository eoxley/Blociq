"use client";

import { useEffect, useState } from "react";

type Email = {
  id: string;
  subject: string;
  from: string;
  body: string;
  received_at: string;
};

export default function InboxInner() {
  const [emails, setEmails] = useState<Email[]>([]);

  useEffect(() => {
    const fetchEmails = async () => {
      const { supabase } = await import("@/utils/supabase");

      const { data, error } = await supabase
        .from("emails")
        .select("*")
        .order("received_at", { ascending: false });

      if (error) {
        console.error("Error loading inbox:", error.message);
      } else {
        setEmails(data || []);
      }
    };

    fetchEmails();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Inbox</h1>
      <table className="w-full text-sm border">
        <thead>
          <tr>
            <th className="text-left p-2 border-b">Subject</th>
            <th className="text-left p-2 border-b">From</th>
            <th className="text-left p-2 border-b">Received</th>
          </tr>
        </thead>
        <tbody>
          {emails.map((email) => (
            <tr key={email.id} className="border-t">
              <td className="p-2">{email.subject}</td>
              <td className="p-2">{email.from}</td>
              <td className="p-2">
                {new Date(email.received_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
