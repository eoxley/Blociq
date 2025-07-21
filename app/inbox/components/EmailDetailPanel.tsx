"use client";

import { useState } from "react";
import { Trash2, Reply, ReplyAll, Forward, Brain, Loader2, User, Clock, Building, Mail } from "lucide-react";
import ReplyModal from "./ReplyModal";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
    if (!dateString) return 'Unknown date';
    
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSenderInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.split('@')[0].slice(0, 2).toUpperCase();
    }
    return '??';
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this email? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch('/api/mark-deleted', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailId: email.id
        }),
      });

      if (response.ok) {
        toast.success('Email deleted successfully');
        onEmailDeleted?.();
      } else {
        toast.error('Failed to delete email');
      }
    } catch (error) {
      console.error('Error deleting email:', error);
      toast.error('Failed to delete email');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSummarise = async () => {
    setIsSummarizing(true);
    try {
      const response = await fetch('/api/summarise-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_id: email.id
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSummary(result.summary);
        toast.success('Email summarized successfully');
      } else {
        toast.error(result.error || 'Failed to summarize email');
      }
    } catch (error) {
      console.error('Error summarizing email:', error);
      toast.error('Failed to summarize email');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleEmailSent = () => {
    onEmailSent?.();
    setShowReplyModal(null);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-lg">
      {/* Header */}
      <div className="flex justify-between items-start border-b border-gray-200 p-6">
        <div className="flex items-start gap-4 flex-1">
          {/* Sender Avatar */}
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-medium flex-shrink-0">
            {getSenderInitials(email.from_name, email.from_email)}
          </div>

          {/* Email Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {email.subject || 'No Subject'}
            </h2>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span className="font-medium">
                  {email.from_name || 'Unknown Sender'}
                </span>
                {email.from_email && (
                  <>
                    <span>•</span>
                    <span className="text-gray-500">{email.from_email}</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>{formatDate(email.received_at)}</span>
              </div>

              {email.buildings?.name && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building className="h-4 w-4" />
                  <span>{email.buildings.name}</span>
                </div>
              )}
            </div>

            {/* Status Badges */}
            <div className="flex items-center gap-2 mt-3">
              {!email.is_read && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  Unread
                </Badge>
              )}
              
              {email.is_handled && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  Handled
                </Badge>
              )}
              
              {email.tags && email.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {email.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {email.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{email.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-1 ml-4">
          <Button
            onClick={() => setShowReplyModal("reply")}
            variant="ghost"
            size="sm"
            className="p-2 hover:bg-blue-100 rounded-full"
            title="Reply"
          >
            <Reply className="w-4 h-4 text-gray-600" />
          </Button>
          <Button
            onClick={() => setShowReplyModal("replyAll")}
            variant="ghost"
            size="sm"
            className="p-2 hover:bg-blue-100 rounded-full"
            title="Reply All"
          >
            <ReplyAll className="w-4 h-4 text-gray-600" />
          </Button>
          <Button
            onClick={() => setShowReplyModal("forward")}
            variant="ghost"
            size="sm"
            className="p-2 hover:bg-blue-100 rounded-full"
            title="Forward"
          >
            <Forward className="w-4 h-4 text-gray-600" />
          </Button>
          <Button
            onClick={handleDelete}
            variant="ghost"
            size="sm"
            className="p-2 hover:bg-red-100 rounded-full"
            title="Delete"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 text-red-600 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 text-red-600" />
            )}
          </Button>
        </div>
      </div>

      {/* AI Summary Button */}
      <div className="px-6 pt-4">
        <Button 
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
          {isSummarizing ? 'Summarising...' : '🧠 AI Summary'}
        </Button>
      </div>

      {/* AI Summary Display */}
      {summary && (
        <div className="px-6 pt-4">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-medium text-gray-900">AI Summary</h3>
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-line">
                {summary}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Email Body */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="prose prose-sm max-w-none">
          {email.body_full ? (
            <div 
              className="text-gray-700 leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ 
                __html: email.body_full.replace(/\n/g, '<br>') 
              }}
            />
          ) : (
            <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {email.body_preview || 'No content available'}
            </div>
          )}
        </div>

        {/* Email Metadata */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex items-center gap-2">
              <Mail className="h-3 w-3" />
              <span>Outlook ID: {email.outlook_id || 'Not available'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Email ID: {email.id}</span>
            </div>
            {email.building_id && (
              <div className="flex items-center gap-2">
                <Building className="h-3 w-3" />
                <span>Building ID: {email.building_id}</span>
              </div>
            )}
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