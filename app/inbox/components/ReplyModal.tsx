"use client";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";
import { BlocIQButton } from "@/components/ui/blociq-button";

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
  cc_email?: string | null; // Added for replyAll
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
        const res = await fetch("/api/generate-email-draft", { // Corrected API endpoint
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
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[#333333] capitalize">
            {mode.replace("All", " All")}
          </h2>
          <button
            onClick={onClose}
            className="text-[#64748B] hover:text-[#333333] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#333333] mb-2">
              To
            </label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Recipient email addresses"
              className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm focus:border-[#2BBEB4] focus:ring-2 focus:ring-[#2BBEB4]/20 outline-none transition-colors"
            />
          </div>
          
          {mode === "replyAll" && (
            <div>
              <label className="block text-sm font-medium text-[#333333] mb-2">
                CC
              </label>
              <input
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="CC email addresses"
                className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm focus:border-[#2BBEB4] focus:ring-2 focus:ring-[#2BBEB4]/20 outline-none transition-colors"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-[#333333] mb-2">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm focus:border-[#2BBEB4] focus:ring-2 focus:ring-[#2BBEB4]/20 outline-none transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[#333333] mb-2">
              Message
            </label>
            <textarea
              rows={12}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm focus:border-[#2BBEB4] focus:ring-2 focus:ring-[#2BBEB4]/20 outline-none transition-colors resize-none"
              placeholder="Type your message..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-[#E2E8F0]">
          <BlocIQButton
            onClick={onClose}
            variant="outline"
            className="px-6 py-3"
          >
            Cancel
          </BlocIQButton>
          <BlocIQButton
            onClick={handleSend}
            disabled={loading}
            className="px-6 py-3 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Send Email"}
          </BlocIQButton>
        </div>
      </div>
    </div>
  );
} 