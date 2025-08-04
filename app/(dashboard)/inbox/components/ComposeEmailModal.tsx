"use client";

import { useState, useEffect } from 'react';
import { X, Send, Save, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ComposeEmailModal({ isOpen, onClose }: ComposeEmailModalProps) {
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [to, setTo] = useState<string[]>([]);
  const [cc, setCc] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [signature, setSignature] = useState('');

  // Load user signature on mount
  useEffect(() => {
    const loadSignature = async () => {
      try {
        const response = await fetch('/api/get-signature');
        if (response.ok) {
          const data = await response.json();
          setSignature(data.signature);
        }
      } catch (error) {
        console.error('Error loading signature:', error);
      }
    };

    if (isOpen) {
      loadSignature();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (to.length === 0 || !subject.trim() || !body.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          cc,
          subject: subject.trim(),
          body: body.trim(),
          status: 'sent'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      const data = await response.json();
      toast.success(data.message || 'Email sent successfully');
      onClose();
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveDraft = async () => {
    if (to.length === 0 || !subject.trim() || !body.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          cc,
          subject: subject.trim(),
          body: body.trim(),
          status: 'draft'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save draft');
      }

      const data = await response.json();
      toast.success(data.message || 'Draft saved successfully');
      onClose();
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Plus className="h-5 w-5 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900">Compose New Email</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* To Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">To *</label>
            <input
              type="text"
              value={to.join(', ')}
              onChange={(e) => setTo(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              placeholder="Enter email addresses separated by commas"
            />
          </div>

          {/* CC Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">CC</label>
            <input
              type="text"
              value={cc.join(', ')}
              onChange={(e) => setCc(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              placeholder="Enter email addresses separated by commas"
            />
          </div>

          {/* Subject Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Subject *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              placeholder="Enter subject"
            />
          </div>

          {/* Body Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Message *</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
              rows={12}
              placeholder="Enter your message..."
            />
          </div>

          {/* Signature */}
          {signature && (
            <div className="text-sm text-gray-500 border-t border-gray-200 pt-2">
              <div className="whitespace-pre-wrap">{signature}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            * Required fields
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveDraft}
              disabled={isSaving}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {isSending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 