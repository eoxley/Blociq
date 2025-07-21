"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";

interface Email {
  id: string;
  subject: string | null;
  from_name: string | null;
  from_email: string | null;
  received_at: string | null;
  body_preview: string | null;
  body_full: string | null;
  building_id: string | null;
  is_read: boolean | null;
  is_handled: boolean | null;
  tags: string[] | null;
  outlook_id: string | null;
  buildings?: { name: string } | null;
  cc_email?: string | null;
}

interface ReplyModalProps {
  mode: "reply" | "replyAll" | "forward";
  email: Email;
  onClose: () => void;
  onEmailSent?: () => void;
}

export default function ReplyModal({ mode, email, onClose, onEmailSent }: ReplyModalProps) {
  const supabase = createClientComponentClient();
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("Generating draft...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const toList = [email.from_email];
    const ccList = email.cc_email ? email.cc_email.split(",") : [];

    if (mode === "reply") setTo(toList.join(", "));
    if (mode === "replyAll") {
      setTo(toList.join(", "));
      setCc(ccList.join(", "));
    }
    if (mode === "forward") {
      setTo("");
      setSubject(`FWD: ${email.subject}`);
      setBody(`\n\n---------- Forwarded message ----------\nFrom: ${email.from_name || email.from_email}\nSubject: ${email.subject}\n\n${email.body_full || email.body_preview}`);
      setLoading(false);
      return;
    }

    const generateDraft = async () => {
      try {
        const res = await fetch("/api/generate-email-draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            emailId: email.id,
            subject: email.subject,
            body: email.body_full || email.body_preview,
            buildingContext: email.buildings?.name,
            tags: email.tags || []
          }),
        });
        
        if (res.ok) {
          const { draft } = await res.json();
          setSubject(`RE: ${email.subject}`);
          setBody(draft);
          toast.success("AI draft generated successfully");
        } else {
          setBody("Failed to generate draft. Please write your reply manually.");
          toast.error("Failed to generate draft");
        }
      } catch (error) {
        console.error("Error generating draft:", error);
        setBody("Failed to generate draft. Please write your reply manually.");
        toast.error("Failed to generate draft");
      } finally {
        setLoading(false);
      }
    };

    generateDraft();
  }, [mode, email]);

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          to: to.split(',').map(email => email.trim()),
          cc: cc ? cc.split(',').map(email => email.trim()) : [],
          subject, 
          body, 
          replyTo: email.from_email 
        }),
      });

      if (response.ok) {
        // Mark email as handled
        await supabase
          .from("incoming_emails")
          .update({ is_handled: true, handled_at: new Date().toISOString() })
          .eq("id", email.id);

        toast.success("Email sent successfully");
        onEmailSent?.();
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to send email");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Failed to send email");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow p-6 w-full max-w-2xl">
        <h2 className="text-lg font-semibold mb-4 capitalize">{mode.replace("All", " All")}</h2>

        <div className="space-y-2">
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="To"
            className="w-full border rounded px-3 py-2 text-sm"
          />
          {mode === "replyAll" && (
            <input
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="CC"
              className="w-full border rounded px-3 py-2 text-sm"
            />
          )}
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <textarea
            rows={10}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Type your message..."
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-black">
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={loading}
            className="px-4 py-2 text-sm bg-[#0F5D5D] text-white rounded hover:bg-teal-700 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
} 