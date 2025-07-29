"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import InboxClient from "./InboxClient";

type Email = {
  id: string;
  from_email: string | null;
  subject: string | null;
  body_preview: string | null;
  received_at: string | null;
  unread: boolean | null;
  handled: boolean | null;
  pinned: boolean | null;
  flag_status: string | null;
  categories: string[] | null;
  building_id: number | null;
  unit_id: number | null;
  leaseholder_id: string | null;
  buildings?: { name: string } | null;
  units?: { unit_number: string } | null;
  leaseholders?: { name: string; email: string } | null;
};

export default function InboxInner() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error } = await supabase
        .from("incoming_emails")
        .select(`
          *,
          buildings(name),
          units(unit_number),
          leaseholders(name, email)
        `)
        .order("received_at", { ascending: false });

      if (error) {
        console.error("Error loading inbox:", error.message);
      } else {
        setEmails(data || []);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading emails...</p>
        </div>
      </div>
    );
  }

  return <InboxClient emails={emails} />;
}
