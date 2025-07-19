"use client";

import { useState, useEffect, useRef } from "react";
import { X, Send, RefreshCw, MessageSquare, Building, User, Bold, Italic, Underline, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";

interface Email {
  message_id: string;
  subject: string;
  from_email: string;
  from_name?: string;
  body: string;
  received_at: string;
  building_id?: string;
  building_name?: string;
}

interface ReplyModalProps {
  email: Email;
  isOpen: boolean;
  onClose: () => void;
  onReplySent: () => void;
}

export default function ReplyModal({ email, isOpen, onClose, onReplySent }: ReplyModalProps) {
  const [replyText, setReplyText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [isFormalizing, setIsFormalizing] = useState(false);
  const [tone, setTone] = useState("Professional");
  const [buildingContext, setBuildingContext] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Generate AI draft when modal opens
  useEffect(() => {
    if (isOpen && !replyText) {
      generateAIDraft();
    }
  }, [isOpen]);

  const generateAIDraft = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId: email.message_id,
          buildingId: email.building_id,
          senderName: email.from_name || email.from_email,
          emailBody: email.body,
          tone
        })
      });

      const data = await response.json();
      if (data.success) {
        setReplyText(data.draft);
        setBuildingContext(data.buildingContext);
      } else {
        console.error("Failed to generate draft:", data.error);
        setReplyText("Dear " + (email.from_name || email.from_email.split('@')[0]) + ",\n\nThank you for your email.\n\nBest regards,\nEllie Oxley\nBlocIQ");
      }
    } catch (error) {
      console.error("Error generating draft:", error);
      setReplyText("Dear " + (email.from_name || email.from_email.split('@')[0]) + ",\n\nThank you for your email.\n\nBest regards,\nEllie Oxley\nBlocIQ");
    } finally {
      setIsGenerating(false);
    }
  };

  const applyFormatting = (tag: 'b' | 'i' | 'u') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = replyText.substring(start, end);

    if (selectedText.length === 0) return;

    const beforeText = replyText.substring(0, start);
    const afterText = replyText.substring(end);
    const formattedText = `<${tag}>${selectedText}</${tag}>`;
    
    const newText = beforeText + formattedText + afterText;
    setReplyText(newText);

    // Set cursor position after the formatted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + formattedText.length, start + formattedText.length);
    }, 0);
  };

  const improveDraft = async (mode: 'polish' | 'formal') => {
    if (!replyText.trim()) return;

    const setIsLoading = mode === 'polish' ? setIsPolishing : setIsFormalizing;
    setIsLoading(true);

    try {
      const response = await fetch("/api/improve-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: replyText,
          improvementType: mode,
          originalEmail: email.body,
          tone
        })
      });

      const data = await response.json();
      if (data.success) {
        setReplyText(data.plainText);
      } else {
        console.error("Failed to improve draft:", data.error);
        alert(`Failed to ${mode} the draft. Please try again.`);
      }
    } catch (error) {
      console.error("Error improving draft:", error);
      alert(`Failed to ${mode} the draft. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim()) return;

    setIsSending(true);
    try {
      const response = await fetch("/api/send-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reply_to_message_id: email.message_id,
          reply_text: replyText,
          to: [email.from_email],
          building_id: email.building_id,
          user_id: "current_user", // This should come from auth context
          subject: `Re: ${email.subject}`
        })
      });

      const data = await response.json();
      if (data.success) {
        onReplySent();
        onClose();
      } else {
        console.error("Failed to send reply:", data.error);
        alert("Failed to send reply. Please try again.");
      }
    } catch (error) {
      console.error("Error sending reply:", error);
      alert("Failed to send reply. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Reply to Email</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Left Panel - Original Email */}
          <div className="w-1/3 border-r p-6 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm text-gray-700 mb-2">Original Email</h3>
                <Card className="p-4 bg-gray-50">
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">From:</span> {email.from_name || email.from_email}
                    </div>
                    <div>
                      <span className="font-medium">Subject:</span> {email.subject}
                    </div>
                    <div>
                      <span className="font-medium">Date:</span> {new Date(email.received_at).toLocaleString()}
                    </div>
                    {email.building_name && (
                      <div className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        <span className="font-medium">Building:</span> {email.building_name}
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-2">Message</h4>
                <Card className="p-4 bg-gray-50">
                  <p className="text-sm whitespace-pre-wrap">{email.body}</p>
                </Card>
              </div>

              {buildingContext && (
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Building Context</h4>
                  <Card className="p-4 bg-blue-50">
                    <p className="text-sm text-blue-800">{buildingContext}</p>
                  </Card>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Reply Editor */}
          <div className="flex-1 p-6 flex flex-col">
            <div className="space-y-4 flex-1">
              {/* Tone Selector */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Tone:</span>
                <Select value={tone} onChange={(e) => setTone(e.target.value)}>
                  <option value="Professional">Professional</option>
                  <option value="Friendly">Friendly</option>
                  <option value="Firm">Firm</option>
                </Select>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={generateAIDraft}
                  disabled={isGenerating}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
              </div>

              {/* Custom Formatting Toolbar */}
              <div className="border rounded-md p-2 bg-gray-50">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => applyFormatting('b')}
                    title="Bold"
                    className="hover:bg-blue-100"
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => applyFormatting('i')}
                    title="Italic"
                    className="hover:bg-blue-100"
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => applyFormatting('u')}
                    title="Underline"
                    className="hover:bg-blue-100"
                  >
                    <Underline className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Reply Editor */}
              <div className="flex-1 flex flex-col">
                <label className="text-sm font-medium mb-2">Your Reply</label>
                <Textarea
                  ref={textareaRef}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="AI will generate a draft reply..."
                  className="flex-1 resize-none"
                  disabled={isGenerating}
                  spellCheck={true}
                />
              </div>

              {/* AI Rewrite Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => improveDraft('polish')}
                  disabled={isPolishing || isFormalizing || !replyText.trim()}
                  className="flex-1"
                >
                  <Sparkles className={`h-4 w-4 mr-2 ${isPolishing ? 'animate-spin' : ''}`} />
                  {isPolishing ? "Polishing..." : "✨ Polish Tone & Fix Grammar"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => improveDraft('formal')}
                  disabled={isPolishing || isFormalizing || !replyText.trim()}
                  className="flex-1"
                >
                  <RotateCcw className={`h-4 w-4 mr-2 ${isFormalizing ? 'animate-spin' : ''}`} />
                  {isFormalizing ? "Making Formal..." : "🔁 Make More Formal"}
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span>To: {email.from_name || email.from_email}</span>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={sendReply}
                    disabled={isSending || !replyText.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isSending ? "Sending..." : "Send Reply"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 