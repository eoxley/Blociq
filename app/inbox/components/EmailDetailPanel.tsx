"use client";
import { useState } from "react";
import { Trash2, Reply, ReplyAll, Forward, Brain, Loader2, User, Clock, Building, Mail } from "lucide-react";
import ReplyModal from "./ReplyModal";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { BlocIQButton } from "@/components/ui/blociq-button";
import { BlocIQBadge } from "@/components/ui/blociq-badge";
import { BlocIQCard, BlocIQCardContent } from "@/components/ui/blociq-card";
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
}

interface EmailDetailPanelProps {
  email: Email;
  onEmailDeleted?: () => void;
  onEmailSent?: () => void;
}

export default function EmailDetailPanel({ email, onEmailDeleted, onEmailSent }: EmailDetailPanelProps) {
  const supabase = createClientComponentClient();
  const [showReplyModal, setShowReplyModal] = useState<null | "reply" | "replyAll" | "forward">(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Unknown date";
    return new Date(dateString).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSenderInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "??";
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this email?")) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch("/api/mark-deleted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId: email.id }),
      });

      if (response.ok) {
        toast.success("Email deleted successfully");
        onEmailDeleted?.();
      } else {
        throw new Error("Failed to delete email");
      }
    } catch (error) {
      console.error("Error deleting email:", error);
      toast.error("Failed to delete email");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSummarise = async () => {
    setIsSummarizing(true);
    try {
      const response = await fetch("/api/summarise-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId: email.id,
          subject: email.subject,
          body: email.body_full || email.body_preview,
        }),
      });

      if (response.ok) {
        const { summary: aiSummary } = await response.json();
        setSummary(aiSummary);
        toast.success("Email summarized successfully");
      } else {
        throw new Error("Failed to summarize email");
      }
    } catch (error) {
      console.error("Error summarizing email:", error);
      toast.error("Failed to summarize email");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleEmailSent = () => {
    onEmailSent?.();
    setShowReplyModal(null);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Email Header */}
      <div className="p-6 border-b border-[#E2E8F0] bg-[#FAFAFA]">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#2BBEB4] to-[#0F5D5D] rounded-xl flex items-center justify-center text-white font-semibold">
              {getSenderInitials(email.from_name, email.from_email)}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#333333] mb-1">
                {email.subject || "No Subject"}
              </h2>
              <div className="flex items-center gap-4 text-sm text-[#64748B]">
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {email.from_name || email.from_email}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDate(email.received_at)}
                </span>
                {email.buildings && (
                  <span className="flex items-center gap-1">
                    <Building className="h-4 w-4" />
                    {email.buildings.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Status Badges */}
          <div className="flex items-center gap-2">
            {!email.is_read && (
              <BlocIQBadge variant="primary" size="sm">
                Unread
              </BlocIQBadge>
            )}
            {email.is_handled && (
              <BlocIQBadge variant="success" size="sm">
                Handled
              </BlocIQBadge>
            )}
            {email.tags && email.tags.length > 0 && (
              <div className="flex gap-1">
                {email.tags.slice(0, 2).map((tag) => (
                  <BlocIQBadge key={tag} variant="secondary" size="sm">
                    {tag}
                  </BlocIQBadge>
                ))}
                {email.tags.length > 2 && (
                  <BlocIQBadge variant="default" size="sm">
                    +{email.tags.length - 2}
                  </BlocIQBadge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <BlocIQButton
            onClick={() => setShowReplyModal("reply")}
            size="sm"
            className="flex items-center gap-2"
          >
            <Reply className="h-4 w-4" />
            Reply
          </BlocIQButton>
          <BlocIQButton
            onClick={() => setShowReplyModal("replyAll")}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <ReplyAll className="h-4 w-4" />
            Reply All
          </BlocIQButton>
          <BlocIQButton
            onClick={() => setShowReplyModal("forward")}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Forward className="h-4 w-4" />
            Forward
          </BlocIQButton>
          <BlocIQButton
            onClick={handleSummarise}
            disabled={isSummarizing}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            {isSummarizing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
            {isSummarizing ? "Summarizing..." : "AI Summary"}
          </BlocIQButton>
          <BlocIQButton
            onClick={handleDelete}
            disabled={isDeleting}
            variant="destructive"
            size="sm"
            className="flex items-center gap-2"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {isDeleting ? "Deleting..." : "Delete"}
          </BlocIQButton>
        </div>
      </div>

      {/* AI Summary */}
      {summary && (
        <div className="p-6 border-b border-[#E2E8F0] bg-[#F0FDFA]">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-5 w-5 text-[#0F5D5D]" />
            <h3 className="font-semibold text-[#0F5D5D]">AI Summary</h3>
          </div>
          <p className="text-[#333333] text-sm leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Email Body */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="prose prose-sm max-w-none">
          <div className="whitespace-pre-wrap text-[#333333] leading-relaxed">
            {email.body_full || email.body_preview || "No content available"}
          </div>
        </div>
      </div>

      {/* Reply Modal */}
      {showReplyModal && (
        <ReplyModal
          mode={showReplyModal}
          email={email}
          onClose={() => setShowReplyModal(null)}
          onEmailSent={handleEmailSent}
        />
      )}
    </div>
  );
} 