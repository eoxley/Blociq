"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Set up your Supabase client (or import it from a shared utility)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type for the email objects
type Email = {
  id: string;
  subject: string;
  from: string;
  received_at: string;
  body: string;
  [key: string]: any;
};

export function useEmailSync(): [Email[], number] {
  const [emails, setEmails] = useState<Email[]>([]);
  const [newCount, setNewCount] = useState(0);
  const lastSyncTime = useRef<Date | null>(null);

  useEffect(() => {
    const fetchEmails = async () => {
      const { data, error } = await supabase
        .from("incoming_emails")
        .select("*")
        .order("received_at", { ascending: false });

      if (error) {
        console.error("Error fetching emails:", error.message);
        return;
      }

      if (data) {
        const newEmails = data as Email[];
        setEmails(newEmails);

        const now = new Date();

        const recent = newEmails.filter((e: Email) => {
          const received = new Date(e.received_at);
          return (
            lastSyncTime.current && received > lastSyncTime.current
          );
        });

        setNewCount(recent.length);
        lastSyncTime.current = now;
      }
    };

    fetchEmails();

    const interval = setInterval(fetchEmails, 60_000); // every minute
    return () => clearInterval(interval);
  }, []);

  return [emails, newCount];
}
