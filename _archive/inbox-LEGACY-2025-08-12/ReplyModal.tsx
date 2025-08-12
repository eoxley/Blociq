"use client";

import { useState, useEffect, useRef } from "react";
import { X, Send, RefreshCw, MessageSquare, Building, User, Bold, Italic, Underline, Maximize2, Minimize2, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { toPlainQuoted, toSanitisedHtml } from '@/utils/emailFormatting';
import { useEmailAttachments } from '@/hooks/useEmailAttachments';
import DOMPurify from 'dompurify';

interface Email {
  message_id: string;
  subject: string;
  from_email: string;
  from_name?: string;
  body: string;
  body_content_type?: string;
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
  const [tone, setTone] = useState("Professional");
  const [buildingContext, setBuildingContext] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 1200, height: 800 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Fetch email attachments for inline image support
  const { attachments } = useEmailAttachments(email.message_id);

  // Generate AI draft when modal opens
  useEffect(() => {
    if (isOpen && !replyText) {
      generateAIDraft();
    }
  }, [isOpen]);

  const generateAIDraft = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/ask-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          context_type: 'email_reply',
          action_type: 'reply',
          emailId: email.message_id,
          building_id: email.building_id,
          tone: tone
        }),
      });

      const data = await response.json();
      if (data.success && data.reply) {
        setReplyText(data.reply);
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

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
    setIsMinimized(false);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    setIsFullScreen(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === modalRef.current) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && !isFullScreen) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart]);

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl border z-50 cursor-pointer"
        style={{ width: '300px', height: '60px' }}
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">Reply to: {email.subject}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onClose(); }}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  const modalClasses = isFullScreen 
    ? "fixed inset-0 bg-white z-50" 
    : "fixed bg-white rounded-lg shadow-xl border z-50";

  const modalStyle = isFullScreen 
    ? {} 
    : {
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        maxWidth: '90vw',
        maxHeight: '90vh'
      };

  return (
          <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-40 transition-all duration-300 ease-in-out">
      <div 
        ref={modalRef}
        className={modalClasses}
        style={modalStyle}
        onMouseDown={handleMouseDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-3 cursor-move">
            <Move className="h-4 w-4 text-gray-500" />
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Reply to Email</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleMinimize}>
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={toggleFullScreen}>
              {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex h-[calc(100%-80px)]">
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
                  <div className="text-sm whitespace-pre-wrap">
                    {(() => {
                      console.log('🔍 components/ReplyModal: email.body preview:', email.body?.substring(0, 100));
                      console.log('🔍 components/ReplyModal: email.body_content_type:', email.body_content_type);
                      
                      if (email.body_content_type === 'html') {
                        const quoted = toPlainQuoted({
                          from_name: email.from_name,
                          from_email: email.from_email,
                          subject: email.subject,
                          received_at: email.received_at,
                          body_html: email.body,
                          body_full: email.body
                        });
                        console.log('🔍 components/ReplyModal: quoted result preview:', quoted.substring(0, 200));
                        const extracted = quoted.split('--- Original Message ---')[1]?.trim() || email.body;
                        console.log('🔍 components/ReplyModal: extracted preview:', extracted.substring(0, 100));
                        return extracted;
                      } else {
                        return email.body;
                      }
                    })()}
                  </div>
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
                <Select value={tone} onValueChange={(value) => setTone(value)}>
                  <option value="Professional">Professional</option>
                  <option value="Friendly">Friendly</option>
                  <option value="Formal">Formal</option>
                  <option value="Casual">Casual</option>
                </Select>
              </div>

              {/* Formatting Toolbar */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Format:</span>
                <Button variant="outline" size="sm" onClick={() => applyFormatting('b')}>
                  <Bold className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyFormatting('i')}>
                  <Italic className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => applyFormatting('u')}>
                  <Underline className="h-3 w-3" />
                </Button>
              </div>

              {/* Reply Text Area */}
              <div className="flex-1">
                <Textarea
                  ref={textareaRef}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply..."
                  className="h-full resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={generateAIDraft} disabled={isGenerating}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                    {isGenerating ? 'Generating...' : 'Regenerate'}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button onClick={sendReply} disabled={isSending || !replyText.trim()}>
                    <Send className="h-4 w-4 mr-2" />
                    {isSending ? 'Sending...' : 'Send Reply'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resize Handle */}
        {!isFullScreen && (
          <div 
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
            onMouseDown={handleResizeMouseDown}
          >
            <div className="w-0 h-0 border-l-8 border-l-transparent border-b-8 border-b-gray-400"></div>
          </div>
        )}
      </div>
    </div>
  );
} 