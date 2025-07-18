"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Reply, Building, Calendar, User, Mail, CheckCircle, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReplyModal from "@/components/ReplyModal";
import AISuggestedActionSidebar from "@/components/AISuggestedActionSidebar";
import { createClient } from "@supabase/supabase-js";

interface Email {
  message_id: string;
  subject: string;
  from_email: string;
  from_name?: string;
  body: string;
  received_at: string;
  building_id?: string;
  building_name?: string;
  status?: string;
  isUnread?: boolean;
  is_handled?: boolean;
  handled_at?: string;
  folder?: string;
  // AI analysis fields
  tags?: string[];
  ai_summary?: string;
  suggested_action?: string;
  suggested_action_type?: string;
  suggested_template_id?: string;
  related_unit_id?: string;
  ai_analyzed_at?: string;
}

export default function EmailDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [email, setEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [handlingEmail, setHandlingEmail] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState("handled");

  useEffect(() => {
    if (params.id) {
      fetchEmail(params.id as string);
    }
  }, [params.id]);

  const fetchEmail = async (emailId: string) => {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error } = await supabase
        .from("incoming_emails")
        .select(`
          *,
          buildings(name)
        `)
        .eq("message_id", emailId)
        .single();

      if (error) {
        console.error("Error fetching email:", error);
        return;
      }

      if (data) {
        setEmail({
          ...data,
          building_name: data.buildings?.name
        });

        // Mark as read if unread
        if (data.isUnread) {
          await supabase
            .from("incoming_emails")
            .update({ isUnread: false })
            .eq("message_id", emailId);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReplySent = () => {
    // Refresh the email to show updated status
    if (email) {
      fetchEmail(email.message_id);
    }
  };

  const handleMarkAsHandled = async () => {
    if (!email) return;

    setHandlingEmail(true);
    try {
      const response = await fetch("/api/mark-handled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: email.message_id,
          userId: "current_user", // This should come from auth context
          moveToFolder: selectedFolder,
          customFolderName: selectedFolder === "custom" ? "BlocIQ/Processed" : null
        })
      });

      const data = await response.json();
      if (data.success) {
        // Refresh the email to show updated status
        await fetchEmail(email.message_id);
        console.log("✅ Email marked as handled successfully");
      } else {
        console.error("Failed to mark email as handled:", data.error);
        alert("Failed to mark email as handled. Please try again.");
      }
    } catch (error) {
      console.error("Error marking email as handled:", error);
      alert("Failed to mark email as handled. Please try again.");
    } finally {
      setHandlingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="p-6">
        <div className="text-center">
          <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-600">Email not found</h2>
          <p className="text-gray-500 mt-2">The email you're looking for doesn't exist.</p>
          <Button 
            onClick={() => router.push("/dashboard/inbox")}
            className="mt-4"
          >
            Back to Inbox
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push("/dashboard/inbox")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inbox
          </Button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h1 className="text-2xl font-bold">Email Detail</h1>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowReplyModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Reply className="h-4 w-4 mr-2" />
            Reply
          </Button>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="max-w-7xl mx-auto flex gap-6">
        {/* Email Content */}
        <div className="flex-1 space-y-6">
          {/* Email Header */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold mb-2">{email.subject}</h2>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>{email.from_name || email.from_email}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(email.received_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {email.isUnread && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      Unread
                    </Badge>
                  )}
                  {email.is_handled && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Handled
                    </Badge>
                  )}
                  {email.status && (
                    <Badge variant="outline">
                      {email.status}
                    </Badge>
                  )}
                  {email.folder && email.folder !== "inbox" && (
                    <Badge variant="outline">
                      <FolderOpen className="h-3 w-3 mr-1" />
                      {email.folder}
                    </Badge>
                  )}
                </div>
              </div>

              {email.building_name && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building className="h-4 w-4" />
                  <span>Related to: {email.building_name}</span>
                </div>
              )}

              {email.handled_at && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Handled: {new Date(email.handled_at).toLocaleString()}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Email Body */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Message</h3>
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                {email.body}
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="flex gap-3 flex-wrap">
              <Button 
                onClick={() => setShowReplyModal(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Reply className="h-4 w-4 mr-2" />
                Reply with AI
              </Button>
              
              {!email.is_handled && (
                <div className="flex gap-2 items-center">
                  <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="handled">BlocIQ/Handled</SelectItem>
                      <SelectItem value="processed">BlocIQ/Processed</SelectItem>
                      <SelectItem value="custom">Custom Folder</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleMarkAsHandled}
                    disabled={handlingEmail}
                    variant="outline"
                    className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {handlingEmail ? "Marking..." : "Mark as Handled"}
                  </Button>
                </div>
              )}
              
              {email.building_id && (
                <Button variant="outline">
                  <Building className="h-4 w-4 mr-2" />
                  View Building
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* AI Suggested Action Sidebar */}
        <div className="flex-shrink-0">
          <AISuggestedActionSidebar
            messageId={email.message_id}
            buildingId={email.building_id}
            onActionTaken={() => {
              // Refresh email data when action is taken
              fetchEmail(email.message_id);
              // Open reply modal if action was reply
              setShowReplyModal(true);
            }}
          />
        </div>
      </div>

      {/* Reply Modal */}
      {email && (
        <ReplyModal
          email={email}
          isOpen={showReplyModal}
          onClose={() => setShowReplyModal(false)}
          onReplySent={handleReplySent}
        />
      )}
    </div>
  );
} 