"use client";

import { useState, useEffect } from 'react';
import { X, Send, Save, Plus, User, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const resetForm = () => {
  setTo([]);
  setCc([]);
  setSubject('');
  setBody('');
};

export default function ComposeEmailModal({ isOpen, onClose }: ComposeEmailModalProps) {
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [to, setTo] = useState<string[]>([]);
  const [cc, setCc] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [signature, setSignature] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);

  // Load user signature and profile on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const response = await fetch('/api/get-signature');
        if (response.ok) {
          const data = await response.json();
          setSignature(data.signature);
          setUserProfile({
            fullName: data.fullName,
            email: data.email
          });
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    if (isOpen) {
      loadUserData();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (to.length === 0 || !subject.trim() || !body.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSending(true);
    try {
      // Combine body with signature
      const fullBody = signature ? `${body.trim()}\n\n${signature}` : body.trim();
      
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          cc,
          subject: subject.trim(),
          body: fullBody,
          status: 'sent'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      const data = await response.json();
      toast.success(data.message || 'Email sent successfully');
      resetForm();
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
      // Combine body with signature
      const fullBody = signature ? `${body.trim()}\n\n${signature}` : body.trim();
      
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          cc,
          subject: subject.trim(),
          body: fullBody,
          status: 'draft'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save draft');
      }

      const data = await response.json();
      toast.success(data.message || 'Draft saved successfully');
      resetForm();
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
    <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300 ease-in-out">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Plus className="h-5 w-5 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900">Compose New Email</h2>
          </div>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* From Field */}
          {userProfile && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">From</label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <User className="h-4 w-4 text-gray-500" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{userProfile.fullName}</div>
                  <div className="text-xs text-gray-500">{userProfile.email}</div>
                </div>
              </div>
            </div>
          )}

          {/* To Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">To *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={to.join(', ')}
                onChange={(e) => setTo(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                placeholder="Enter email addresses separated by commas"
              />
            </div>
          </div>

          {/* CC Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">CC</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={cc.join(', ')}
                onChange={(e) => setCc(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                placeholder="Enter email addresses separated by commas"
              />
            </div>
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
            {/* Signature Preview */}
            {signature && (
              <div className="text-sm text-gray-500 border-t border-gray-200 pt-2 mt-2">
                <div className="whitespace-pre-wrap text-gray-400">{signature}</div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            * Required fields
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                resetForm();
                onClose();
              }}
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